import type { EmbeddingPort, EmbeddingResult } from '../../domain/ports/aiPorts.js'
import type { ProviderHealth, ProviderWithHealth } from '../../domain/ports/providerRegistry.js'

export interface EmbeddingProvider extends EmbeddingPort, ProviderWithHealth {
  readonly id: string
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

export interface EmbeddingProviderConfig {
  baseURL?: string
  apiKey?: string
  model?: string
}

export class DefaultEmbeddingProvider implements EmbeddingProvider {
  readonly id: string
  private readonly config: EmbeddingProviderConfig

  constructor(id: string, config: EmbeddingProviderConfig = {}) {
    this.id = id
    this.config = config
  }

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

      await this.embed(['health check'])

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

export function createEmbeddingProviderFromEnv(): EmbeddingProvider | null {
  const apiKey = process.env.EMBEDDING_API_KEY || ''
  if (!apiKey) {
    return null
  }

  const config: EmbeddingProviderConfig = {
    baseURL: process.env.EMBEDDING_BASE_URL,
    apiKey,
    model: process.env.EMBEDDING_MODEL,
  }

  return new DefaultEmbeddingProvider('default', config)
}
