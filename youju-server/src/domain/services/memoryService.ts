import { embeddingAdapter } from '../../ai/adapters/embeddingAdapter.js'
import { createTenantContext, type TenantContext } from '../context/tenantContext.js'
import type { EmbeddingPort } from '../ports/aiPorts.js'
import type { MemoryRepository, ModelConfigRepository } from '../ports/repositories.js'
import type { ChatMemory } from '../types.js'

export class MemoryService {
  constructor(
    private readonly memoryRepo: MemoryRepository,
    private readonly embeddingPort: EmbeddingPort | null,
    private readonly modelConfigRepo: ModelConfigRepository | null = null,
  ) {}

  private async getEmbeddingPort(
    userId: number | null,
    sessionId: string | null,
  ): Promise<EmbeddingPort | null> {
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
      // 忽略查询错误，回退到默认配置
    }
    return this.embeddingPort
  }

  async retrieveMemoryContext(
    content: string,
    userId: number | null,
    sessionId: string | null,
  ): Promise<string> {
    const port = await this.getEmbeddingPort(userId, sessionId)
    if (!port) return ''
    try {
      const vec = (await port.embed([content]))[0]?.dense ?? []
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
    const port = await this.getEmbeddingPort(input.userId, input.sessionId)
    if (!port) {
      throw new Error('EmbeddingPort not set. Required for memory creation.')
    }
    const embedding = (await port.embed([input.content]))[0]?.dense ?? []
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
