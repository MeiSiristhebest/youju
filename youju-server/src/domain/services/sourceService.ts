import type { ChunkRepository, SourceRepository } from '../ports/repositories.js'
import type { Source, SourceType } from '../types.js'
import type { ChunkService } from './chunkService.js'

export class SourceService {
  constructor(
    private readonly sourceRepo: SourceRepository,
    private readonly chunkRepo: ChunkRepository | null,
    private readonly chunkService: ChunkService | null,
  ) {}

  async createSource(
    userId: number | null,
    sessionId: string | null,
    type: string,
    name: string,
    content: string,
    meta?: string,
    taskId?: string | null,
  ): Promise<Source> {
    const result = await this.sourceRepo.createSource(
      userId,
      sessionId,
      type,
      name,
      content,
      meta,
      taskId,
    )
    const source: Source = {
      id: result.id,
      type: result.type as SourceType,
      name: result.name,
      content: result.content,
      meta: result.meta || undefined,
      createdAt: result.createdAt || new Date().toISOString(),
      charCount: result.content?.length || 0,
      taskId: (result as unknown as { taskId?: string | null }).taskId || undefined,
    }

    if (this.chunkService) {
      void this.chunkService
        .chunkAndEmbed(source, {
          userId: userId !== null ? String(userId) : null,
          sessionId,
        })
        .catch((err) => {
          console.error('[chunkService] chunkAndEmbed failed for source', source.id, err)
        })
    }

    return source
  }

  async listSources(
    userId: number | null,
    sessionId?: string | null,
    taskId?: string | null,
  ): Promise<Source[]> {
    const sources = await this.sourceRepo.getSourcesByUser(userId, sessionId, taskId)
    return sources.map((s) => ({
      id: s.id,
      type: s.type as SourceType,
      name: s.name,
      content: s.content,
      meta: s.meta || undefined,
      createdAt: s.createdAt || undefined,
      charCount: s.content?.length || 0,
      taskId: (s as unknown as { taskId?: string | null }).taskId || undefined,
    }))
  }

  async listSourcesByTask(taskId: string): Promise<Source[]> {
    const sources = await this.sourceRepo.getSourcesByTask(taskId)
    return sources.map((s) => ({
      id: s.id,
      type: s.type as SourceType,
      name: s.name,
      content: s.content,
      meta: s.meta || undefined,
      createdAt: s.createdAt || undefined,
      charCount: s.content?.length || 0,
      taskId: (s as unknown as { taskId?: string | null }).taskId || undefined,
    }))
  }

  async listAllSources(userId: number | null): Promise<Source[]> {
    const sources = await this.sourceRepo.getAllSources(userId)
    return sources.map((s) => ({
      id: s.id,
      type: s.type as SourceType,
      name: s.name,
      content: s.content,
      meta: s.meta || undefined,
      createdAt: s.createdAt || undefined,
      charCount: s.content?.length || 0,
      taskId: (s as unknown as { taskId?: string | null }).taskId || undefined,
    }))
  }

  async getSource(
    userId: number | null,
    sessionId: string | null,
    id: string,
  ): Promise<Source | null> {
    const source = await this.sourceRepo.getSourceById(userId, sessionId, id)
    if (!source) return null
    return {
      id: source.id,
      type: source.type as SourceType,
      name: source.name,
      content: source.content,
      meta: source.meta || undefined,
      createdAt: source.createdAt || undefined,
      charCount: source.content?.length || 0,
      taskId: (source as unknown as { taskId?: string | null }).taskId || undefined,
    }
  }

  async deleteSource(
    userId: number | null,
    sessionId: string | null,
    id: string,
  ): Promise<boolean> {
    if (this.chunkRepo) {
      try {
        await this.chunkRepo.deleteBySourceId(id)
      } catch (err) {
        console.error('[sourceService] cascade delete chunks failed', err)
      }
    }
    return this.sourceRepo.deleteSource(userId, sessionId, id)
  }

  async deleteSourceChunks(sourceId: string): Promise<void> {
    if (this.chunkRepo) {
      await this.chunkRepo.deleteBySourceId(sourceId)
    }
  }

  async reindexSource(source: Source): Promise<void> {
    await this.deleteSourceChunks(source.id)
    if (this.chunkService) {
      void this.chunkService.chunkAndEmbed(source).catch((err) => {
        console.error('[sourceService] reindex failed for source', source.id, err)
      })
    }
  }
}
