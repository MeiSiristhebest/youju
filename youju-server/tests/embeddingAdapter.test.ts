import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmbeddingAdapter } from '../src/ai/adapters/embeddingAdapter.js'
import { callEmbedding } from '../src/ai/llm.js'

const originalFetch = globalThis.fetch

function mockOkResponse(data: Array<{ embedding: number[] }>): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
    text: async () => '',
  } as Response
}

describe('EmbeddingAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.EMBEDDING_API_KEY
    process.env.EMBEDDING_BASE_URL = 'https://api.siliconflow.cn/v1'
    process.env.EMBEDDING_MODEL = 'bge-m3'
    globalThis.fetch = originalFetch
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
  })

  it('批量嵌入：验证请求 body 和响应解析', async () => {
    process.env.EMBEDDING_API_KEY = 'test-key'
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock.mockResolvedValue(
      mockOkResponse([{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }]),
    )
    globalThis.fetch = fetchMock

    const adapter = new EmbeddingAdapter()
    const results = await adapter.embed(['hello', 'world'])

    expect(results).toHaveLength(2)
    expect(results[0].dense).toEqual([0.1, 0.2, 0.3])
    expect(results[1].dense).toEqual([0.4, 0.5, 0.6])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.siliconflow.cn/v1/embeddings')
    expect(init?.method).toBe('POST')
    const body = JSON.parse(init?.body as string)
    expect(body).toEqual({ model: 'bge-m3', input: ['hello', 'world'] })
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-key',
    })
  })

  it('失败重试：前 2 次失败，第 3 次成功', async () => {
    vi.useFakeTimers()
    process.env.EMBEDDING_API_KEY = 'test-key'

    const fetchMock = vi.fn<typeof fetch>()
    fetchMock
      .mockRejectedValueOnce(new Error('500'))
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce(mockOkResponse([{ embedding: [0.7, 0.8, 0.9] }]))
    globalThis.fetch = fetchMock

    const promise = callEmbedding(['hi'])
    await vi.runAllTimersAsync()
    const result = await promise

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(result).toHaveLength(1)
    expect(result[0].dense).toEqual([0.7, 0.8, 0.9])
  })

  it('降级 Mock：未配置 API Key 时返回 1024 维归一化向量', async () => {
    delete process.env.EMBEDDING_API_KEY
    const fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock

    const adapter = new EmbeddingAdapter()
    const results = await adapter.embed(['one', 'two'])

    expect(fetchMock).not.toHaveBeenCalled()
    expect(results).toHaveLength(2)
    for (const r of results) {
      expect(r.dense).toHaveLength(1024)
      const norm = Math.sqrt(r.dense.reduce((s, v) => s + v * v, 0))
      expect(norm).toBeCloseTo(1, 5)
    }
  })

  it('批量分批：65 条文本应分 2 批（64 + 1）', async () => {
    process.env.EMBEDDING_API_KEY = 'test-key'
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock.mockImplementation(async (_input, init) => {
      const body = JSON.parse((init?.body as string) || '{}') as { input: string[] }
      const count = body.input?.length ?? 1
      const data = Array.from({ length: count }, () => ({ embedding: [0.01] }))
      return mockOkResponse(data)
    })
    globalThis.fetch = fetchMock

    const adapter = new EmbeddingAdapter()
    const texts = Array.from({ length: 65 }, (_, i) => `text-${i}`)
    const results = await adapter.embed(texts)

    expect(results).toHaveLength(65)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstCall = fetchMock.mock.calls[0][1]
    const firstBody = JSON.parse(firstCall?.body as string) as { input: string[] }
    expect(firstBody.input).toHaveLength(64)
    const secondCall = fetchMock.mock.calls[1][1]
    const secondBody = JSON.parse(secondCall?.body as string) as { input: string[] }
    expect(secondBody.input).toHaveLength(1)
  })

  it('getDimension：bge-m3 返回 1024 且不警告', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const adapter = new EmbeddingAdapter()
    expect(adapter.getDimension()).toBe(1024)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('getDimension：text-embedding-3-large 返回 3072 并警告', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    process.env.EMBEDDING_MODEL = 'text-embedding-3-large'
    const adapter = new EmbeddingAdapter()
    expect(adapter.getDimension()).toBe(3072)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('HTTP 错误时抛出异常', async () => {
    process.env.EMBEDDING_API_KEY = 'test-key'
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    } as Response)
    globalThis.fetch = fetchMock

    const adapter = new EmbeddingAdapter()
    await expect(adapter.embed(['hi'])).rejects.toThrow('Embedding API error 429')
  })
})
