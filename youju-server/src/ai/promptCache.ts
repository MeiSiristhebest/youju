import crypto from 'node:crypto'
import { getEnv } from '../infrastructure/env.js'

const _env = getEnv()

/** 构造函数默认 TTL（实际实例均显式传 TTL，此值仅用于兜底） */
const DEFAULT_TTL_MS = 86_400_000 // 24h

interface CacheEntry<T> {
  value: T
  timestamp: number
  hits: number
}

interface PromptCacheOptions {
  maxSize?: number
  ttlMs?: number
  name?: string
}

export const CACHE_ENABLED = _env.AI_PROMPT_CACHE_ENABLED === 'true'

export class PromptCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private readonly maxSize: number
  private readonly ttlMs: number
  private readonly name: string
  private hits = 0
  private misses = 0
  private evictions = 0

  constructor(options: PromptCacheOptions = {}) {
    this.maxSize = options.maxSize || 100
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS
    this.name = options.name || 'default'
  }

  static hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16)
  }

  get(key: string): T | undefined {
    if (!CACHE_ENABLED) return undefined

    const entry = this.cache.get(key)
    if (!entry) {
      this.misses++
      return undefined
    }

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      this.evictions++
      this.misses++
      return undefined
    }

    this.hits++
    entry.hits++
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: string, value: T): void {
    if (!CACHE_ENABLED) return

    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
        this.evictions++
      }
    }
    this.cache.set(key, { value, timestamp: Date.now(), hits: 1 })
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }

  getStats() {
    const total = this.hits + this.misses
    return {
      name: this.name,
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? this.hits / total : 0,
    }
  }
}

export const analysisCache = new PromptCache<{
  content: string
  tokenPrompt: number
  tokenCompletion: number
  model: string
}>({
  name: 'analysis',
  maxSize: _env.PROMPT_CACHE_ANALYSIS_MAX,
  ttlMs: _env.PROMPT_CACHE_ANALYSIS_TTL_MS,
})

export const draftCache = new PromptCache<{
  content: string
  tokenPrompt: number
  tokenCompletion: number
  model: string
}>({
  name: 'draft',
  maxSize: _env.PROMPT_CACHE_DRAFT_MAX,
  ttlMs: _env.PROMPT_CACHE_DRAFT_TTL_MS,
})

export const embeddingCache = new PromptCache<{
  embedding: number[]
  tokenPrompt: number
}>({
  name: 'embedding',
  maxSize: _env.PROMPT_CACHE_EMBEDDING_MAX,
  ttlMs: _env.PROMPT_CACHE_EMBEDDING_TTL_MS,
})

let statsLogTimer: ReturnType<typeof setInterval> | null = null

export function startCacheStatsLogger(
  intervalMs: number = _env.PROMPT_CACHE_STATS_INTERVAL_MS,
): void {
  if (!CACHE_ENABLED) return
  if (statsLogTimer) return

  statsLogTimer = setInterval(() => {
    const caches = [analysisCache, draftCache, embeddingCache]
    const allStats = caches.map((c) => c.getStats())
    const totalHits = allStats.reduce((s, c) => s + c.hits, 0)
    const totalMisses = allStats.reduce((s, c) => s + c.misses, 0)
    const totalRequests = totalHits + totalMisses
    const hitRate = totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(1) : '0.0'

    console.log(
      `[Cache Stats] total_hit_rate: ${hitRate}% | ` +
        allStats
          .map((s) => `${s.name}: ${s.hits}h/${s.misses}m/${s.size}/${s.maxSize}`)
          .join(' | '),
    )
  }, intervalMs)

  statsLogTimer.unref()
}
