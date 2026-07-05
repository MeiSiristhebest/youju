import { randomUUID } from 'node:crypto'
import { chunkDocument } from '../../infrastructure/fileParser/chunker.js'
import type { EmbeddingPort } from '../ports/aiPorts.js'
import type { AnalysisLogRepository, ChunkRepository } from '../ports/repositories.js'
import type { AnalysisLog, Source, SourceChunk } from '../types.js'

export interface ChunkOptions {
  parentChunkSize?: number
  childChunkSize?: number
  overlap?: number
  userId?: string | null
  sessionId?: string | null
}

export class ChunkService {
  constructor(
    private readonly chunkRepo: ChunkRepository | null,
    private readonly embeddingPort: EmbeddingPort | null,
    private readonly analysisLogRepo: AnalysisLogRepository | null,
  ) {}

  async chunkAndEmbed(source: Source, options?: ChunkOptions): Promise<void> {
    if (!this.chunkRepo) {
      console.warn('[chunkService] ChunkRepository not set, skipping chunkAndEmbed')
      return
    }

    const content = source.content || ''
    if (!content.trim()) {
      return
    }

    const userId = options?.userId ?? null
    const sessionId = options?.sessionId ?? null

    const logGroupId = `embed-${source.id}-${Date.now()}-${randomUUID().slice(0, 8)}`
    const logPatch = (extra: Record<string, unknown>): Record<string, unknown> => ({
      userId,
      sessionId,
      scenarioType: 'embed',
      sourceId: source.id,
      ...extra,
    })

    const startTime = Date.now()

    const chunkResult = chunkDocument(content, {
      parentChunkSize: options?.parentChunkSize,
      childChunkSize: options?.childChunkSize,
      overlap: options?.overlap,
    })

    const parentChunks = chunkResult.parents.map((p) =>
      toSourceChunk(p, source.id, userId, sessionId),
    )
    const childChunks = chunkResult.children.map((c) =>
      toSourceChunk(c, source.id, userId, sessionId),
    )

    await this.chunkRepo.insertChunks([...parentChunks, ...childChunks])

    await this.appendLog(
      logGroupId,
      'chunk_done',
      logPatch({
        parentChunkCount: parentChunks.length,
        childChunkCount: childChunks.length,
        totalChunkCount: parentChunks.length + childChunks.length,
      }),
    )

    if (!this.embeddingPort) {
      await this.appendLog(
        logGroupId,
        'skipped',
        logPatch({
          status: 'skipped',
          reason: 'embedding_port_not_configured',
          durationMs: Date.now() - startTime,
        }),
      )
      return
    }

    try {
      await this.appendLog(logGroupId, 'embed_start', logPatch({}))
      await this.embedChunks(childChunks, parentChunks, logGroupId, logPatch)
      await this.appendLog(
        logGroupId,
        'completed',
        logPatch({
          status: 'success',
          durationMs: Date.now() - startTime,
          totalChunkCount: parentChunks.length + childChunks.length,
        }),
      )
    } catch (err) {
      console.error('[chunkService] embedding failed, marking chunks as failed', err)
      const allChunkIds = [...parentChunks, ...childChunks].map((c) => c.id)
      await Promise.all(
        allChunkIds.map((id) => this.chunkRepo!.updateEmbedStatus(id, 'failed').catch(() => {})),
      )
      await this.appendLog(
        logGroupId,
        'failed',
        logPatch({
          status: 'failed',
          errorMessage: (err as Error).message,
          durationMs: Date.now() - startTime,
        }),
      )
    }
  }

  async reindexSource(source: Source): Promise<void> {
    if (!this.chunkRepo) {
      console.warn('[chunkService] chunkRepository not set, skip reindex')
      return
    }
    await this.chunkRepo.deleteBySourceId(source.id)
    await this.chunkAndEmbed(source)
  }

  private async appendLog(
    logGroupId: string,
    status: string,
    patch: Partial<AnalysisLog>,
  ): Promise<void> {
    if (!this.analysisLogRepo) return
    try {
      await this.analysisLogRepo.appendAnalysisLog(logGroupId, status, patch)
    } catch (e) {
      console.error('[chunkService] appendAnalysisLog error:', e)
    }
  }

  private async embedChunks(
    childChunks: SourceChunk[],
    parentChunks: SourceChunk[],
    logGroupId: string,
    logPatch: (extra: Record<string, unknown>) => Record<string, unknown>,
  ): Promise<void> {
    const allChunks = [...parentChunks, ...childChunks]
    const batchSize = 32
    let processedCount = 0

    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize)
      const texts = batch.map((c) => c.content)
      const results = await this.embeddingPort!.embed(texts)

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]
        const embedding = results[j]?.dense
        if (embedding) {
          await this.chunkRepo!.updateEmbedStatus(chunk.id, 'completed', embedding)
        }
      }

      processedCount += batch.length
      await this.appendLog(
        logGroupId,
        'embed_progress',
        logPatch({
          processedCount,
          totalCount: allChunks.length,
          batchIndex: Math.floor(i / batchSize) + 1,
          totalBatches: Math.ceil(allChunks.length / batchSize),
        }),
      )
    }
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function toSourceChunk(
  chunkResult: {
    id: string
    content: string
    charOffsetStart: number
    charOffsetEnd: number
    headingPath: string
    tokenCount: number
    parentChunkId: string | null
    chunkIndex: number
  },
  sourceId: string,
  userId: string | null,
  sessionId: string | null,
  embedStatus: SourceChunk['embedStatus'] = 'pending',
): SourceChunk {
  return {
    id: chunkResult.id,
    sourceId,
    parentChunkId: chunkResult.parentChunkId,
    chunkIndex: chunkResult.chunkIndex,
    content: chunkResult.content,
    charOffsetStart: chunkResult.charOffsetStart,
    charOffsetEnd: chunkResult.charOffsetEnd,
    headingPath: chunkResult.headingPath || null,
    tokenCount: chunkResult.tokenCount,
    embedStatus,
    userId,
    sessionId,
    createdAt: nowIso(),
  }
}
