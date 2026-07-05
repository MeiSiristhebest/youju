import type { RerankerPort } from '../../domain/ports/aiPorts.js'
import type { ProviderHealth, ProviderWithHealth } from '../../domain/ports/providerRegistry.js'
import type { SourceChunk } from '../../domain/types.js'

export interface RerankerProvider extends RerankerPort, ProviderWithHealth {
  readonly id: string
}

const DEFAULT_BASE_URL = 'https://api.siliconflow.cn/v1'
const DEFAULT_MODEL = 'bge-reranker-v2-m3'
const MAX_RETRIES = 2

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

export interface RerankerProviderConfig {
  baseURL?: string
  apiKey?: string
  model?: string
}

export class DefaultRerankerProvider implements RerankerProvider {
  readonly id: string
  private readonly config: RerankerProviderConfig

  constructor(id: string, config: RerankerProviderConfig = {}) {
    this.id = id
    this.config = config
  }

  private get baseURL(): string {
    return this.config.baseURL || process.env.RERANKER_BASE_URL || DEFAULT_BASE_URL
  }

  private get apiKey(): string {
    return this.config.apiKey ?? process.env.RERANKER_API_KEY ?? ''
  }

  private get model(): string {
    return this.config.model || process.env.RERANKER_MODEL || DEFAULT_MODEL
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
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.callRerankApi(query, documents, topN)
      } catch (e) {
        lastError = e as Error
        if (attempt < MAX_RETRIES) {
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

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now()
    try {
      if (!this.apiKey) {
        return {
          healthy: false,
          error: 'No API key configured',
          lastCheckedAt: Date.now(),
        }
      }

      const mockChunk: SourceChunk = {
        id: 'health-check',
        sourceId: 'health-check',
        parentChunkId: null,
        chunkIndex: 0,
        content: 'health check test content',
        charOffsetStart: 0,
        charOffsetEnd: 20,
        headingPath: null,
        tokenCount: 5,
        embedStatus: 'completed',
        userId: null,
        sessionId: null,
        createdAt: new Date().toISOString(),
      }

      await this.rerank('health check', [mockChunk], 1)

      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        lastCheckedAt: Date.now(),
      }
    } catch (e) {
      return {
        healthy: false,
        error: (e as Error).message,
        latencyMs: Date.now() - startTime,
        lastCheckedAt: Date.now(),
      }
    }
  }
}

export function createRerankerProviderFromEnv(): RerankerProvider | null {
  const apiKey = process.env.RERANKER_API_KEY || ''
  if (!apiKey) {
    return null
  }

  const config: RerankerProviderConfig = {
    baseURL: process.env.RERANKER_BASE_URL,
    apiKey,
    model: process.env.RERANKER_MODEL,
  }

  return new DefaultRerankerProvider('default', config)
}
