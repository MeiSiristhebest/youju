import { randomUUID } from 'node:crypto'
import { embeddingAdapter } from '../../ai/adapters/embeddingAdapter.js'
import { getEnv } from '../../infrastructure/env.js'
import { createTenantContext } from '../context/tenantContext.js'
import type {
  EmbeddingPort,
  RerankerPort,
  RetrievalQuery,
  RetrievalResult,
  RetrievalResultItem,
} from '../ports/aiPorts.js'
import type {
  AnalysisLogRepository,
  ChunkRepository,
  ModelConfigRepository,
} from '../ports/repositories.js'
import type { RetrievedChunk, SourceChunk } from '../types.js'

const RRF_K = 60
const RRF_TOP_K = 20

export class RetrievalService {
  constructor(
    private readonly chunkRepo: ChunkRepository,
    private readonly rerankerPort: RerankerPort,
    private readonly embeddingPort: EmbeddingPort,
    private readonly analysisLogRepo: AnalysisLogRepository | null,
    private readonly modelConfigRepo: ModelConfigRepository | null = null,
  ) {}

  private async getEmbeddingPort(
    userId: number | null,
    sessionId: string | null,
  ): Promise<EmbeddingPort> {
    if (!this.modelConfigRepo) return this.embeddingPort
    try {
      const config = (await this.modelConfigRepo.getDefaultConfig(
        userId,
        sessionId,
        'embedding',
      )) as {
        api_key?: string
        base_url?: string
        model?: string
      } | null
      if (config && config.api_key) {
        return embeddingAdapter.withConfig({
          baseURL: config.base_url,
          apiKey: config.api_key,
          model: config.model,
        })
      }
    } catch {
      // ignore
    }
    return this.embeddingPort
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTotal = Date.now()
    const tenantCtx = createTenantContext(query.userId, query.sessionId)
    const topK = query.topK ?? 20
    const threshold = getThreshold(query)

    const recorder = createStageRecorder()
    const logGroupId = `retrieve-${Date.now()}-${randomUUID().slice(0, 8)}`

    const logPatch = (extra: Record<string, unknown>): Record<string, unknown> => ({
      userId: query.userId,
      sessionId: query.sessionId,
      scenarioType: 'retrieve',
      ...extra,
    })

    await this.appendLog(logGroupId, 'embed_start', logPatch({ query: query.text.slice(0, 200) }))

    const embedPort = await this.getEmbeddingPort(query.userId, query.sessionId)

    let queryVector: number[]
    try {
      const embedResults = await timeStage(
        recorder,
        'embedQuery',
        () => embedPort.embed([query.text]),
        (r) => r.length,
      )
      queryVector = embedResults[0]?.dense ?? []
    } catch (e) {
      console.error('[retrievalService] embedQuery failed:', e)
      await this.appendLog(
        logGroupId,
        'failed',
        logPatch({
          status: 'failed',
          errorMessage: `embedQuery failed: ${(e as Error).message}`,
          durationMs: Date.now() - startTotal,
        }),
      )
      throw e
    }

    await this.appendLog(
      logGroupId,
      'embed_done',
      logPatch({ reasoningTrace: { stage: 'embedQuery', stages: recorder.stages } }),
    )

    const dense = await timeStage(
      recorder,
      'denseSearch',
      () => this.chunkRepo.vectorSearch(queryVector, 50, tenantCtx, query.sourceFilter),
      (r) => r.length,
    )

    await this.appendLog(
      logGroupId,
      'dense_done',
      logPatch({
        reasoningTrace: { stage: 'denseSearch', count: dense.length, stages: recorder.stages },
      }),
    )

    const sparse = await timeStage(
      recorder,
      'sparseSearch',
      () => this.chunkRepo.fullTextSearch(query.text, 50, tenantCtx, query.sourceFilter),
      (r) => r.length,
    )

    await this.appendLog(
      logGroupId,
      'sparse_done',
      logPatch({
        reasoningTrace: { stage: 'sparseSearch', count: sparse.length, stages: recorder.stages },
      }),
    )

    const fused = await timeStage(
      recorder,
      'rrf',
      async () => rrfFusion(dense, sparse, 60, 20),
      (r) => r.length,
    )

    await this.appendLog(
      logGroupId,
      'rrf_done',
      logPatch({ reasoningTrace: { stage: 'rrf', count: fused.length, stages: recorder.stages } }),
    )

    const chunksForRerank = fused.map((item) => item.chunk)
    const rerankResults = await timeStage(
      recorder,
      'rerank',
      async () => this.rerankerPort.rerank(query.text, chunksForRerank, topK),
      (r) => r.length,
    )

    const fusedMap = new Map(fused.map((item) => [item.chunk.id, item]))
    const rerankedItems: RetrievalResultItem[] = rerankResults.map((rr) => {
      const base = fusedMap.get(rr.chunk.id)
      return {
        chunk: rr.chunk,
        parentChunk: base?.parentChunk ?? null,
        score: base?.score ?? 0,
        rerankScore: rr.score,
        source: base?.source ?? 'dense',
      }
    })

    await this.appendLog(
      logGroupId,
      'rerank_done',
      logPatch({
        reasoningTrace: { stage: 'rerank', count: rerankedItems.length, stages: recorder.stages },
      }),
    )

    const filtered = rerankedItems.filter((item) => (item.rerankScore ?? item.score) >= threshold)

    await timeStage(
      recorder,
      'parent',
      () => loadParentChunks(filtered, this.chunkRepo),
      () => filtered.length,
    )

    await this.appendLog(
      logGroupId,
      'completed',
      logPatch({
        status: 'success',
        durationMs: Date.now() - startTotal,
        reasoningTrace: { stages: recorder.stages, finalCount: filtered.length },
      }),
    )

    return {
      items: filtered,
      latencyMs: Date.now() - startTotal,
      stages: recorder.stages,
    }
  }

  private async appendLog(
    logGroupId: string,
    status: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    if (!this.analysisLogRepo) return
    try {
      await this.analysisLogRepo.appendAnalysisLog(logGroupId, status, patch)
    } catch (e) {
      console.error('[retrievalService] appendAnalysisLog error:', e)
    }
  }
}

function getThreshold(query: RetrievalQuery): number {
  if (query.threshold !== undefined) return query.threshold
  return getEnv().VECTOR_SIMILARITY_THRESHOLD
}

export function rrfFusion(
  dense: RetrievedChunk[],
  sparse: SourceChunk[],
  k = RRF_K,
  topK = RRF_TOP_K,
): RetrievalResultItem[] {
  const scoreMap = new Map<
    string,
    { chunk: SourceChunk; score: number; source: 'dense' | 'sparse' | 'both' }
  >()

  dense.forEach((item, index) => {
    const rank = index + 1
    const contribution = 1 / (k + rank)
    const existing = scoreMap.get(item.chunk.id)
    if (existing) {
      existing.score += contribution
      existing.source = 'both'
    } else {
      scoreMap.set(item.chunk.id, {
        chunk: item.chunk,
        score: contribution,
        source: 'dense',
      })
    }
  })

  sparse.forEach((chunk, index) => {
    const rank = index + 1
    const contribution = 1 / (k + rank)
    const existing = scoreMap.get(chunk.id)
    if (existing) {
      existing.score += contribution
      existing.source = 'both'
    } else {
      scoreMap.set(chunk.id, {
        chunk,
        score: contribution,
        source: 'sparse',
      })
    }
  })

  return [...scoreMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => ({
      chunk: item.chunk,
      parentChunk: null,
      score: item.score,
      source: item.source,
    }))
}

interface StageRecorder {
  stages: Array<{ stage: string; durationMs: number; count: number }>
  record(stage: string, count: number, durationMs: number): void
}

function createStageRecorder(): StageRecorder {
  const stages: Array<{ stage: string; durationMs: number; count: number }> = []
  return {
    stages,
    record(stage, count, durationMs) {
      stages.push({ stage, durationMs, count })
    },
  }
}

async function timeStage<T>(
  recorder: StageRecorder,
  stage: string,
  fn: () => Promise<T>,
  getCount: (result: T) => number,
): Promise<T> {
  const start = Date.now()
  const result = await fn()
  recorder.record(stage, getCount(result), Date.now() - start)
  return result
}

async function loadParentChunks(
  items: RetrievalResultItem[],
  repo: ChunkRepository,
): Promise<void> {
  const parentIds = new Set<string>()
  for (const item of items) {
    if (item.chunk.parentChunkId) {
      parentIds.add(item.chunk.parentChunkId)
    }
  }
  if (parentIds.size === 0) return

  const uniqueIds = [...parentIds]
  const parents = await Promise.all(
    uniqueIds.map((id) => repo.findParentChunk(id).catch(() => null)),
  )
  const parentMap = new Map<string, SourceChunk>()
  uniqueIds.forEach((id, idx) => {
    const parent = parents[idx]
    if (parent) parentMap.set(id, parent)
  })

  for (const item of items) {
    if (item.chunk.parentChunkId) {
      item.parentChunk = parentMap.get(item.chunk.parentChunkId) ?? null
    }
  }
}
