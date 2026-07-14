import { getEnv, isTest } from '../../infrastructure/env.js'

// 限流存储接口 — 支持内存、Redis、数据库多种后端
// 多实例部署时使用 Redis 或数据库存储替代内存存储

export interface RateLimitEntry {
  count: number
  resetTime: number
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | undefined>
  set(key: string, entry: RateLimitEntry): Promise<void>
  increment(key: string, windowMs: number): Promise<RateLimitEntry>
  resetAll(): Promise<void>
  cleanupExpired(): Promise<void>
}

// ============================================================
// 内存存储（默认，单实例部署）
// ============================================================
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>()

  async get(key: string): Promise<RateLimitEntry | undefined> {
    return this.store.get(key)
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry)
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now()
    let entry = this.store.get(key)

    if (!entry || entry.resetTime <= now) {
      entry = { count: 0, resetTime: now + windowMs }
    }

    entry.count++
    this.store.set(key, entry)
    return entry
  }

  async resetAll(): Promise<void> {
    this.store.clear()
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key)
      }
    }
  }
}

// ============================================================
// Redis 存储（多实例部署）
// 使用方式：设置 REDIS_URL 环境变量后自动启用
// 需要安装 ioredis: pnpm add ioredis
// ============================================================
interface RedisClient {
  get(key: string): Promise<string | null>
  setex(key: string, ttl: number, value: string): Promise<unknown>
  keys(pattern: string): Promise<string[]>
  del(...keys: string[]): Promise<number>
}

export class RedisRateLimitStore implements RateLimitStore {
  private redis: RedisClient

  constructor(redisClient: RedisClient) {
    this.redis = redisClient
  }

  static async create(redisUrl: string): Promise<RedisRateLimitStore> {
    // @ts-expect-error — ioredis 可选依赖，未安装时抛出友好错误
    const IORedis = (await import('ioredis')).default
    const redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    })
    return new RedisRateLimitStore(redis as RedisClient)
  }

  private keyName(key: string): string {
    return `ratelimit:${key}`
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const data = await this.redis.get(this.keyName(key))
    if (!data) return undefined
    return JSON.parse(data) as RateLimitEntry
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    const ttl = Math.max(1, Math.ceil((entry.resetTime - Date.now()) / 1000))
    await this.redis.setex(this.keyName(key), ttl, JSON.stringify(entry))
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now()
    const redisKey = this.keyName(key)
    const existing = await this.redis.get(redisKey)

    let entry: RateLimitEntry
    if (!existing) {
      entry = { count: 1, resetTime: now + windowMs }
    } else {
      const parsed = JSON.parse(existing) as RateLimitEntry
      if (parsed.resetTime <= now) {
        entry = { count: 1, resetTime: now + windowMs }
      } else {
        entry = { count: parsed.count + 1, resetTime: parsed.resetTime }
      }
    }

    const ttl = Math.max(1, Math.ceil((entry.resetTime - now) / 1000))
    await this.redis.setex(redisKey, ttl, JSON.stringify(entry))
    return entry
  }

  async resetAll(): Promise<void> {
    const keys = await this.redis.keys('ratelimit:*')
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  async cleanupExpired(): Promise<void> {
    // Redis SETEX 自动过期，无需手动清理
  }
}

// ============================================================
// 工厂函数 — 根据环境变量自动选择存储后端
// ============================================================
let _store: RateLimitStore | null = null

export async function getRateLimitStore(): Promise<RateLimitStore> {
  if (_store) return _store

  const redisUrl = getEnv().REDIS_URL
  if (redisUrl && !isTest()) {
    try {
      _store = await RedisRateLimitStore.create(redisUrl)
      console.log('✓ 限流存储: Redis')
      return _store
    } catch (e) {
      console.warn('Redis 连接失败，降级到内存存储:', e)
    }
  }

  _store = new MemoryRateLimitStore()
  if (!isTest()) {
    console.log('✓ 限流存储: 内存')
  }
  return _store
}

export function setRateLimitStore(store: RateLimitStore): void {
  _store = store
}
