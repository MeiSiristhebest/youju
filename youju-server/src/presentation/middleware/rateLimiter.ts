import type { NextFunction, Request, Response } from 'express'
import { type RateLimitRequestHandler, rateLimit } from 'express-rate-limit'
import { rateLimited } from '../../domain/errors.js'
import { getEnv, isTest } from '../../infrastructure/env.js'

interface RedisStoreLike {
  sendCommand: (...args: unknown[]) => unknown
}

let redisStore: RedisStoreLike | null = null
let redisStorePromise: Promise<RedisStoreLike | undefined> | null = null

async function createRedisStore(prefix: string): Promise<RedisStoreLike | undefined> {
  const redisUrl = getEnv().REDIS_URL
  if (!redisUrl || isTest()) return undefined

  try {
    const { RedisStore } = await import('rate-limit-redis')
    // ioredis 是可选依赖，未安装时会进入 catch 分支降级到内存存储
    // @ts-expect-error - ioredis 是可选依赖，类型声明可能不可用
    const IORedisModule = await import('ioredis')
    const IORedis = (IORedisModule as { default?: unknown }).default || IORedisModule
    const redisClient = new (IORedis as new (...args: unknown[]) => unknown)(redisUrl, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    }) as { call: (...args: unknown[]) => unknown }
    return new (
      RedisStore as new (opts: {
        sendCommand: (...args: unknown[]) => unknown
        prefix: string
      }) => RedisStoreLike
    )({
      sendCommand: (...args: unknown[]) => redisClient.call(...args),
      prefix,
    })
  } catch (e) {
    console.warn('[RateLimit] Redis 不可用，降级到内存存储:', e)
    return undefined
  }
}

async function getRedisStore(prefix: string): Promise<RedisStoreLike | null> {
  if (redisStore) return redisStore
  if (!redisStorePromise) {
    redisStorePromise = createRedisStore(prefix)
  }
  const store = await redisStorePromise
  redisStore = store ?? null
  return redisStore
}

function formatErrorResponse(_req: Request, res: Response) {
  const err = rateLimited('请求过于频繁，请稍后再试')
  res.setHeader('Retry-After', '60')
  res.status(429).json({
    code: 429,
    error: err.toJSON(),
  })
}

interface LazyRateLimiterOptions {
  windowMs: number
  limit: number
  prefix?: string
}

function createLazyRateLimiter(options: LazyRateLimiterOptions): RateLimitRequestHandler {
  let limiter: RateLimitRequestHandler

  const { prefix, ...rateLimitOptions } = options

  const baseOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req: Request) => isTest(),
    handler: formatErrorResponse,
    ...rateLimitOptions,
  }

  limiter = rateLimit(baseOptions)

  if (getEnv().REDIS_URL && !isTest()) {
    getRedisStore(prefix || 'rl:general:')
      .then((store) => {
        if (store) {
          // store 是自定义的 RedisStoreLike 类型，需要断言为 rate-limit-redis 的 Store 类型
          const optionsWithStore = { ...baseOptions, store } as unknown as Parameters<
            typeof rateLimit
          >[0]
          limiter = rateLimit(optionsWithStore)
        }
      })
      .catch(() => {
        // 已在 createRedisStore 中处理警告
      })
  }

  return ((req: Request, res: Response, next: NextFunction) => {
    if (limiter) {
      limiter(req, res, next)
    } else {
      next()
    }
  }) as RateLimitRequestHandler
}

const env = getEnv()

export const generalRateLimiter = createLazyRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_GENERAL_PER_MIN,
  prefix: 'rl:general:',
})

export const authRateLimiter = createLazyRateLimiter({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  limit: env.RATE_LIMIT_AUTH_PER_15MIN,
  prefix: 'rl:auth:',
})

export const analyzeRateLimiter = createLazyRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_ANALYZE_PER_MIN,
  prefix: 'rl:analyze:',
})

export const urlFetchRateLimiter = createLazyRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_URLFETCH_PER_MIN,
  prefix: 'rl:urlfetch:',
})

export const chatRateLimiter = createLazyRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_CHAT_PER_MIN,
  prefix: 'rl:chat:',
})

export async function initRateLimiters(): Promise<void> {
  if (getEnv().REDIS_URL && !isTest()) {
    await getRedisStore('rl:general:')
  }
}

export async function resetRateLimiters(): Promise<void> {
  // express-rate-limit 不提供统一的重置接口
  // 测试环境 skip 为 true，不会实际计数
}
