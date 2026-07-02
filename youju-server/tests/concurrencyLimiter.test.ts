import { describe, expect, it } from 'vitest'
import { ConcurrencyLimiter } from '../src/ai/concurrencyLimiter.js'

describe('ConcurrencyLimiter（AI 请求队列）', () => {
  it('不超过并发上限时立即执行', async () => {
    const limiter = new ConcurrencyLimiter(3)
    const order: string[] = []

    await Promise.all([
      limiter.run(async () => {
        order.push('A-start')
        await delay(10)
        order.push('A-end')
      }),
      limiter.run(async () => {
        order.push('B-start')
        await delay(10)
        order.push('B-end')
      }),
    ])

    expect(order).toContain('A-start')
    expect(order).toContain('B-start')
    expect(order).toContain('A-end')
    expect(order).toContain('B-end')
  })

  it('超过并发上限时排队等待', async () => {
    const limiter = new ConcurrencyLimiter(1) // 只允许 1 个并发
    const order: string[] = []

    const p1 = limiter.run(async () => {
      order.push('1-start')
      await delay(50)
      order.push('1-end')
    })
    const p2 = limiter.run(async () => {
      order.push('2-start')
      await delay(10)
      order.push('2-end')
    })

    // p1 应该先开始，p2 应该排队
    await delay(5)
    expect(order).toEqual(['1-start'])

    await Promise.all([p1, p2])
    // p2 必须在 p1 结束后才开始
    expect(order).toEqual(['1-start', '1-end', '2-start', '2-end'])
  })

  it('FIFO 顺序执行', async () => {
    const limiter = new ConcurrencyLimiter(1)
    const order: string[] = []

    const promises = [1, 2, 3, 4].map((i) =>
      limiter.run(async () => {
        order.push(`task-${i}`)
        await delay(5)
      }),
    )

    await Promise.all(promises)
    expect(order).toEqual(['task-1', 'task-2', 'task-3', 'task-4'])
  })

  it('返回函数执行结果', async () => {
    const limiter = new ConcurrencyLimiter(2)
    const result = await limiter.run(async () => 42)
    expect(result).toBe(42)
  })

  it('异常时释放并发槽位', async () => {
    const limiter = new ConcurrencyLimiter(1)

    // 第一个任务抛异常
    await expect(
      limiter.run(async () => {
        throw new Error('test error')
      }),
    ).rejects.toThrow('test error')

    // 第二个任务应该能正常执行（说明槽位已释放）
    const result = await limiter.run(async () => 'ok')
    expect(result).toBe('ok')
  })

  it('stats 返回正确的并发状态', async () => {
    const limiter = new ConcurrencyLimiter(2)
    expect(limiter.stats).toEqual({ active: 0, queued: 0, maxConcurrency: 2 })

    const p1 = limiter.run(async () => delay(50))
    const p2 = limiter.run(async () => delay(50))
    const p3 = limiter.run(async () => delay(50)) // 这个应该排队

    await delay(5)
    expect(limiter.stats.active).toBe(2)
    expect(limiter.stats.queued).toBe(1)

    await Promise.all([p1, p2, p3])
    expect(limiter.stats.active).toBe(0)
    expect(limiter.stats.queued).toBe(0)
  })
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
