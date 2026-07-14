/**
 * AI 请求并发限制器（请求队列）
 *
 * 作用：限制同时进行的 AI API 调用数量，避免并发超限导致 429 或限流。
 * 超出并发数的请求自动排队，按 FIFO 顺序执行。
 *
 * 配置：通过环境变量 AI_MAX_CONCURRENCY 设置（默认 3）。
 */

import { getEnv } from '../infrastructure/env.js'

type Resolver = () => void

export class ConcurrencyLimiter {
  private active = 0
  private readonly queue: Resolver[] = []

  constructor(private readonly maxConcurrency: number = 3) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    // 达到并发上限时排队等待
    if (this.active >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve))
    }

    this.active++
    try {
      return await fn()
    } finally {
      this.active--
      const next = this.queue.shift()
      if (next) next()
    }
  }

  get stats() {
    return {
      active: this.active,
      queued: this.queue.length,
      maxConcurrency: this.maxConcurrency,
    }
  }
}

const maxConcurrency = getEnv().AI_MAX_CONCURRENCY
export const aiRequestQueue = new ConcurrencyLimiter(maxConcurrency)
