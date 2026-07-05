import { randomUUID } from 'node:crypto'
import { createTenantContext } from '../context/tenantContext.js'
import type {
  EmbeddingPort,
  RerankerPort,
  RetrievalQuery,
  RetrievalResult,
  RetrievalResultItem,
} from '../ports/aiPorts.js'
import type { AnalysisLogRepository, ChunkRepository } from '../ports/repositories.js'
import type { RetrievedChunk, SourceChunk } from '../types.js'

/**
 * RetrievalService（构造注入模式）
 *
 * 历史反模式：let _chunkRepo + let _embeddingPort + let _rerankerPort + let _analysisLogRepo 四 setter
 * 当前：通过构造函数接收四个依赖
 *   - ChunkRepository（必填）
 *   - RerankerPort（必填）
 *   - EmbeddingPort（必填）
 *   - AnalysisLogRepository（可选，null 时跳过日志）
 */
export class RetrievalService {
  constructor(
    private readonly chunkRepo: ChunkRepository,
    private readonly rerankerPort: RerankerPort,
    private readonly embeddingPort: EmbeddingPort,
    private readonly analysisLogRepo: AnalysisLogRepository | null,
  ) {}

  /**
   * 检索编排：embedQuery → denseSearch → sparseSearch → RRF 融合 → rerank → 阈值过滤 → parent 映射
   * 全过程通过 analysis_logs 记录（自定义 logGroupId = `retrieve-{ts}-{randomId}`）。
   */
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTotal = Date.now()
    const tenantCtx = createTenantContext(query.userId, query.sessionId)
    const topK = query.topK ?? 20
    const threshold = getThreshold(query)

    const recorder = createStageRecorder()
    const logGroupId = `retrieve-${Date.now()}-${randomUUID().slice(0, 8)}`

    // 检索过程使用自定义 logGroupId，通过 appendAnalysisLog 写入；
    // 每条 patch 都带上 userId/sessionId 以保证租户隔离。
    const logPatch = (extra: Record<string, unknown>): Record<string, unknown> => ({
      userId: query.userId,
      sessionId: query.sessionId,
      scenarioType: 'retrieve',
      ...extra,
    })

    await this.appendLog(logGroupId, 'embed_start', logPatch({ query: query.text.slice(0, 200) }))

    // 1. embedQuery
    let queryVector: number[]
    try {
      const embedResults = await timeStage(
        recorder,
        'embedQuery',
        () => this.embeddingPort.embed([query.text]),
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

    // 2. denseSearch
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

    // 3. sparseSearch
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

    // 4. RRF 融合
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

    // 5. rerank
    const chunksForRerank = fused.map((item) => item.chunk)
    const rerankResults = await timeStage(
      recorder,
      'rerank',
      async () => this.rerankerPort.rerank(query.text, chunksForRerank, topK),
      (r) => r.length,
    )

    // 合并 rerank 分数到 fused items
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

    // 6. 阈值过滤
    const filtered = rerankedItems.filter((item) => (item.rerankScore ?? item.score) >= threshold)

    // 7. parent chunk 映射
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

// ─────────────────────────────────────────────────────────────────────────────
// 纯函数
// ─────────────────────────────────────────────────────────────────────────────
function getThreshold(query: RetrievalQuery): number {
  if (query.threshold !== undefined) return query.threshold
  const envValue = Number(process.env.VECTOR_SIMILARITY_THRESHOLD)
  return Number.isFinite(envValue) ? envValue : 0.65
}

/**
 * RRF (Reciprocal Rank Fusion) 融合：
 *   score = Σ 1 / (k + rank_i)，rank 从 1 开始
 * 同一 chunk 在 dense 和 sparse 都出现时分数累加，并标记 source='both'
 *
 * 注：dense 来自 vectorSearch 返回 RetrievedChunk[]（含 score），
 * sparse 来自 fullTextSearch 返回 SourceChunk[]（不含 score，按 rank 计贡献）。
 */
export function rrfFusion(
  dense: RetrievedChunk[],
  sparse: SourceChunk[],
  k = 60,
  topK = 20,
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
