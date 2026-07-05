import type { EmbeddingPort, EmbeddingResult } from '../../domain/ports/aiPorts.js'

export interface EmbeddingAdapterConfig {
  baseURL?: string
  apiKey?: string
  model?: string
}

const DEFAULT_BATCH_SIZE = 64
const BGE_M3_DIMENSION = 1024
const DEFAULT_BASE_URL = 'https://api.siliconflow.cn/v1'
const DEFAULT_MODEL = 'bge-m3'

const MODEL_DIMENSIONS: Record<string, number> = {
  'bge-m3': 1024,
  'text-embedding-3-large': 3072,
  'text-embedding-3-small': 1536,
}

function getDimensionForModel(model: string): number {
  return MODEL_DIMENSIONS[model] ?? BGE_M3_DIMENSION
}

function normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  if (norm === 0) return vec
  return vec.map((v) => v / norm)
}

function generateMockVector(dim: number): number[] {
  const raw = Array.from({ length: dim }, () => Math.random() * 2 - 1)
  return normalize(raw)
}

interface EmbeddingApiResponse {
  data: Array<{ embedding: number[] }>
}

/**
 * EmbeddingPort 默认实现：通过 OpenAI 兼容协议调用 BGE-M3 /embeddings 端点。
 * 单次最多 64 条文本（BGE-M3 API 限制），超出自动分批。
 * 未配置 EMBEDDING_API_KEY 时降级为归一化的随机向量（仅本地开发）。
 */
export class EmbeddingAdapter implements EmbeddingPort {
  constructor(private readonly config: EmbeddingAdapterConfig = {}) {}

  private get baseURL(): string {
    return this.config.baseURL || process.env.EMBEDDING_BASE_URL || DEFAULT_BASE_URL
  }

  private get apiKey(): string {
    return this.config.apiKey ?? process.env.EMBEDDING_API_KEY ?? ''
  }

  private get model(): string {
    return this.config.model || process.env.EMBEDDING_MODEL || DEFAULT_MODEL
  }

  getDimension(): number {
    const dim = getDimensionForModel(this.model)
    if (dim !== BGE_M3_DIMENSION) {
      console.warn(
        `[embedding] Model "${this.model}" uses ${dim} dimensions, schema vector(1024) may be incompatible`,
      )
    }
    return dim
  }

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.apiKey) {
      console.log('[embedding] Using mock embeddings (no API key configured)')
      const dim = this.getDimension()
      return texts.map(() => ({ dense: generateMockVector(dim) }))
    }

    const results: EmbeddingResult[] = []
    for (let i = 0; i < texts.length; i += DEFAULT_BATCH_SIZE) {
      const batch = texts.slice(i, i + DEFAULT_BATCH_SIZE)
      const batchResults = await this.embedBatch(batch)
      results.push(...batchResults)
    }
    return results
  }

  private async embedBatch(batch: string[]): Promise<EmbeddingResult[]> {
    const url = `${this.baseURL}/embeddings`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: batch }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Embedding API error ${response.status}: ${body}`)
    }

    const json = (await response.json()) as EmbeddingApiResponse
    return json.data.map((item) => ({ dense: item.embedding }))
  }
}

export const embeddingAdapter = new EmbeddingAdapter()
