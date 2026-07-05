import { createTenantContext, type TenantContext } from '../context/tenantContext.js'
import type { EmbeddingPort } from '../ports/aiPorts.js'
import type { MemoryRepository } from '../ports/repositories.js'
import type { ChatMemory } from '../types.js'

export class MemoryService {
  constructor(
    private readonly memoryRepo: MemoryRepository,
    private readonly embeddingPort: EmbeddingPort | null,
  ) {}

  async retrieveMemoryContext(
    content: string,
    userId: number | null,
    sessionId: string | null,
  ): Promise<string> {
    if (!this.embeddingPort) return ''
    try {
      const vec = (await this.embeddingPort.embed([content]))[0]?.dense ?? []
      if (vec.length === 0) return ''
      const hits = await this.memoryRepo.vectorSearch(
        vec,
        3,
        createTenantContext(userId, sessionId),
      )
      if (hits.length === 0) return ''
      const lines = hits.map((h, i) => `${i + 1}. ${h.memory.content}`)
      return `【用户偏好记忆】\n${lines.join('\n')}`
    } catch (e) {
      console.error('[memoryService] retrieveMemoryContext failed:', e)
      return ''
    }
  }

  async createMemory(input: {
    userId: number | null
    sessionId: string | null
    content: string
  }): Promise<ChatMemory> {
    if (!this.embeddingPort) {
      throw new Error('EmbeddingPort not set. Required for memory creation.')
    }
    const embedding = (await this.embeddingPort.embed([input.content]))[0]?.dense ?? []
    return this.memoryRepo.create({
      userId: input.userId !== null ? String(input.userId) : null,
      sessionId: input.sessionId,
      content: input.content,
      embedding,
    })
  }

  async listMemories(tenantCtx: TenantContext): Promise<ChatMemory[]> {
    return this.memoryRepo.list(tenantCtx)
  }

  async deleteMemory(id: string, tenantCtx: TenantContext): Promise<boolean> {
    return this.memoryRepo.delete(id, tenantCtx)
  }
}
