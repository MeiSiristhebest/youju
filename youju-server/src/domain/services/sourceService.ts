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
  ): Promise<Source> {
    const result = await this.sourceRepo.createSource(userId, sessionId, type, name, content, meta)
    const source: Source = {
      id: result.id,
      type: result.type as SourceType,
      name: result.name,
      content: result.content,
      meta: result.meta || undefined,
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

  async listSources(userId: number | null, sessionId?: string | null): Promise<Source[]> {
    const sources = await this.sourceRepo.getSourcesByUser(userId, sessionId)
    return sources.map((s) => ({
      id: s.id,
      type: s.type as SourceType,
      name: s.name,
      content: s.content,
      meta: s.meta || undefined,
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
