import type { RerankerPort } from '../../domain/ports/aiPorts.js'
import type { SourceChunk } from '../../domain/types.js'
import { getEnv } from '../../infrastructure/env.js'

export interface RetrievalAdapterConfig {
  baseURL?: string
  apiKey?: string
  model?: string
}

interface RerankApiResult {
  index: number
  relevance_score: number
}

interface RerankApiResponse {
  results?: RerankApiResult[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * RerankerPort 默认实现：rerank 通过 OpenAI 兼容协议调用 BGE-Reranker-v2-m3 / Jina / Cohere。
 * 未配置 RERANKER_API_KEY 时降级为原顺序（score=1.0），仅日志警告。
 *
 * 重构：原 RetrievalPort 拆分为 RerankerPort（本适配器）+ RetrievalOrchestratorPort（retrievalService）
 * 解决 LSP 违背：删除 retrieve 方法 throw error 反模式
 */
export class RetrievalAdapter implements RerankerPort {
  constructor(private readonly config: RetrievalAdapterConfig = {}) {}

  private get baseURL(): string {
    return this.config.baseURL || getEnv().RERANKER_BASE_URL
  }

  private get apiKey(): string {
    return this.config.apiKey ?? getEnv().RERANKER_API_KEY ?? ''
  }

  private get model(): string {
    return this.config.model || getEnv().RERANKER_MODEL
  }

  async rerank(
    query: string,
    chunks: SourceChunk[],
    topK?: number,
  ): Promise<Array<{ chunk: SourceChunk; score: number }>> {
    if (chunks.length === 0) {
      return []
    }

    if (!this.apiKey) {
      console.warn('[rerank] Using mock reranker (no API key configured)')
      const limit = topK ?? chunks.length
      return chunks.slice(0, limit).map((chunk) => ({ chunk, score: 1.0 }))
    }

    const documents = chunks.map((c) => c.content)
    const topN = topK ?? chunks.length

    const response = await this.callRerankApiWithRetry(query, documents, topN)
    const results = response.results ?? []
    const sorted = [...results].sort((a, b) => b.relevance_score - a.relevance_score)

    return sorted.map((item) => ({
      chunk: chunks[item.index] ?? chunks[0],
      score: item.relevance_score,
    }))
  }

  private async callRerankApiWithRetry(
    query: string,
    documents: string[],
    topN: number,
  ): Promise<RerankApiResponse> {
    const maxRetries = getEnv().RERANKER_MAX_RETRIES
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callRerankApi(query, documents, topN)
      } catch (e) {
        lastError = e as Error
        if (attempt < maxRetries) {
          await sleep(1000 * (attempt + 1))
        }
      }
    }
    throw lastError || new Error('Rerank API failed after retries')
  }

  private async callRerankApi(
    query: string,
    documents: string[],
    topN: number,
  ): Promise<RerankApiResponse> {
    const url = `${this.baseURL}/rerank`
    const model = this.model

    // BGE / Jina / Cohere 均使用 { model, query, documents, top_n } 请求体格式
    // （Cohere 文档字段名也是 documents）
    const body = { model, query, documents, top_n: topN }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Rerank API error ${response.status}: ${text}`)
    }

    const json = (await response.json()) as RerankApiResponse
    if (!json.results || !Array.isArray(json.results)) {
      throw new Error('Rerank API returned invalid response: missing results array')
    }
    return json
  }
}

export const retrievalAdapter = new RetrievalAdapter()
