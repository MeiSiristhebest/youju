import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmbeddingPort, RerankerPort } from '../src/domain/ports/aiPorts.js'
import type { AnalysisLogRepository, ChunkRepository } from '../src/domain/ports/repositories.js'
import { RetrievalService, rrfFusion } from '../src/domain/services/retrievalService.js'
import type { RetrievedChunk, SourceChunk } from '../src/domain/types.js'

function makeChunk(overrides: Partial<SourceChunk> & { id: string }): SourceChunk {
  return {
    sourceId: 'src-1',
    parentChunkId: null,
    chunkIndex: 0,
    content: 'hello world',
    charOffsetStart: 0,
    charOffsetEnd: 11,
    headingPath: null,
    tokenCount: 3,
    embedStatus: 'completed',
    userId: null,
    sessionId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeRetrieved(chunk: SourceChunk, score: number): RetrievedChunk {
  return { chunk, score, parentChunk: null }
}

function makeMockChunkRepo(overrides: Partial<ChunkRepository> = {}): ChunkRepository {
  return {
    insertChunks: vi.fn(async () => {}),
    findBySourceId: vi.fn(async () => []),
    deleteBySourceId: vi.fn(async () => {}),
    vectorSearch: vi.fn(async () => []),
    fullTextSearch: vi.fn(async () => []),
    findParentChunk: vi.fn(async () => null),
    updateEmbedStatus: vi.fn(async () => {}),
    ...overrides,
  }
}

function makeMockAnalysisLogRepo(): AnalysisLogRepository {
  return {
    createAnalysisLog: vi.fn(async () => ({
      id: '1',
      logGroupId: 'test',
      version: 1,
    })),
    appendAnalysisLog: vi.fn(async () => ({
      id: '1',
      logGroupId: 'test',
      version: 1,
    })),
    getLatestAnalysisLog: vi.fn(async () => null),
    getAnalysisLogById: vi.fn(async () => null),
    getAnalysisLogsByUser: vi.fn(async () => []),
    getAnalysisStats: vi.fn(async () => ({
      totalAnalyses: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: 0,
      byScenario: {},
      byDate: {},
    })),
    saveCheckpoint: vi.fn(async () => {}),
    getCheckpoint: vi.fn(async () => null),
  }
}

function makeMockEmbeddingPort(dense: number[] = [0.1, 0.2, 0.3]): EmbeddingPort {
  return {
    embed: vi.fn(async () => [{ dense }]),
    getDimension: vi.fn(() => dense.length),
  }
}

function makeMockRerankerPort(
  rerankResults: Array<{ chunk: SourceChunk; score: number }>,
): RerankerPort {
  return {
    rerank: vi.fn(async () => rerankResults),
  }
}

describe('retrievalService.rrfFusion', () => {
  it('dense 和 sparse 都出现的 chunk 分数高于只出现一次的', () => {
    const chunkA = makeChunk({ id: 'a', content: 'shared' })
    const chunkB = makeChunk({ id: 'b', content: 'only dense' })
    const chunkC = makeChunk({ id: 'c', content: 'only sparse' })

    const dense: RetrievedChunk[] = [makeRetrieved(chunkA, 0.9), makeRetrieved(chunkB, 0.8)]
    const sparse: SourceChunk[] = [chunkA, chunkC]

    const result = rrfFusion(dense, sparse, 60, 20)

    expect(result).toHaveLength(3)
    expect(result[0].chunk.id).toBe('a')
    expect(result[0].score).toBeCloseTo(2 / 61, 6)
    expect(result[0].source).toBe('both')
    const bItem = result.find((r) => r.chunk.id === 'b')
    expect(bItem?.score).toBeCloseTo(1 / 62, 6)
    expect(bItem?.source).toBe('dense')
    const cItem = result.find((r) => r.chunk.id === 'c')
    expect(cItem?.score).toBeCloseTo(1 / 62, 6)
    expect(cItem?.source).toBe('sparse')
  })

  it('topK 截断生效', () => {
    const chunks = Array.from({ length: 10 }, (_, i) =>
      makeChunk({ id: `c-${i}`, content: `chunk ${i}` }),
    )
    const dense: RetrievedChunk[] = chunks.map((c, i) => makeRetrieved(c, 1 - i * 0.01))
    const sparse: SourceChunk[] = []

    const result = rrfFusion(dense, sparse, 60, 3)
    expect(result).toHaveLength(3)
  })

  it('空输入返回空数组', () => {
    const result = rrfFusion([], [], 60, 20)
    expect(result).toEqual([])
  })
})

describe('retrievalService.retrieve', () => {
  let retrievalService: RetrievalService
  let chunkRepo: ChunkRepository
  let embeddingPort: EmbeddingPort
  let rerankerPort: RerankerPort
  let analysisLogRepo: AnalysisLogRepository

  beforeEach(() => {
    chunkRepo = makeMockChunkRepo()
    embeddingPort = makeMockEmbeddingPort()
    rerankerPort = makeMockRerankerPort([])
    analysisLogRepo = makeMockAnalysisLogRepo()

    retrievalService = new RetrievalService(chunkRepo, rerankerPort, embeddingPort, analysisLogRepo)
    delete process.env.VECTOR_SIMILARITY_THRESHOLD
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('完整流程：embed → dense → sparse → rrf → rerank → 过滤 → parent', async () => {
    const parentChunk = makeChunk({ id: 'parent-1', content: 'parent content' })
    const childWithParent = makeChunk({
      id: 'child-1',
      content: 'child content',
      parentChunkId: 'parent-1',
    })
    const standalone = makeChunk({ id: 'standalone-1', content: 'standalone' })

    chunkRepo = makeMockChunkRepo({
      vectorSearch: vi.fn(async () => [
        makeRetrieved(childWithParent, 0.9),
        makeRetrieved(standalone, 0.7),
      ]),
      fullTextSearch: vi.fn(async () => [childWithParent, standalone]),
      findParentChunk: vi.fn(async (id: string) => (id === 'parent-1' ? parentChunk : null)),
    })
    rerankerPort = makeMockRerankerPort([
      { chunk: childWithParent, score: 0.95 },
      { chunk: standalone, score: 0.5 },
    ])
    retrievalService = new RetrievalService(chunkRepo, rerankerPort, embeddingPort, analysisLogRepo)

    const result = await retrievalService.retrieve({
      text: '查询内容',
      userId: 1,
      sessionId: null,
      threshold: 0.6,
      topK: 10,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].chunk.id).toBe('child-1')
    expect(result.items[0].rerankScore).toBe(0.95)
    expect(result.items[0].source).toBe('both')
    expect(result.items[0].parentChunk?.id).toBe('parent-1')

    expect(result.items.find((r) => r.chunk.id === 'standalone-1')).toBeUndefined()

    expect(result.stages.map((s) => s.stage)).toEqual([
      'embedQuery',
      'denseSearch',
      'sparseSearch',
      'rrf',
      'rerank',
      'parent',
    ])
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('阈值过滤：rerankScore 低于 threshold 的被丢弃', async () => {
    const chunkHigh = makeChunk({ id: 'high', content: 'high score' })
    const chunkLow = makeChunk({ id: 'low', content: 'low score' })

    chunkRepo = makeMockChunkRepo({
      vectorSearch: vi.fn(async () => [
        makeRetrieved(chunkHigh, 0.9),
        makeRetrieved(chunkLow, 0.5),
      ]),
      fullTextSearch: vi.fn(async () => [chunkHigh]),
    })
    rerankerPort = makeMockRerankerPort([
      { chunk: chunkHigh, score: 0.9 },
      { chunk: chunkLow, score: 0.3 },
    ])
    retrievalService = new RetrievalService(chunkRepo, rerankerPort, embeddingPort, analysisLogRepo)

    const result = await retrievalService.retrieve({
      text: '查询',
      userId: null,
      sessionId: 'session-1',
      threshold: 0.5,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].chunk.id).toBe('high')
  })

  it('parent chunk 映射：含 parent_chunk_id 的 chunk 能加载 parent', async () => {
    const parent = makeChunk({ id: 'p-1', content: 'parent text' })
    const child = makeChunk({ id: 'c-1', content: 'child text', parentChunkId: 'p-1' })

    const findParent = vi.fn(async (id: string) => (id === 'p-1' ? parent : null))
    chunkRepo = makeMockChunkRepo({
      vectorSearch: vi.fn(async () => [makeRetrieved(child, 0.9)]),
      fullTextSearch: vi.fn(async () => [child]),
      findParentChunk: findParent,
    })
    rerankerPort = makeMockRerankerPort([{ chunk: child, score: 0.9 }])
    retrievalService = new RetrievalService(chunkRepo, rerankerPort, embeddingPort, analysisLogRepo)

    const result = await retrievalService.retrieve({
      text: '查询',
      userId: 1,
      sessionId: null,
      threshold: 0.0,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].parentChunk?.id).toBe('p-1')
    expect(findParent).toHaveBeenCalledWith('p-1')
  })

  it('embedQuery 失败时抛出异常并记录 failed 日志', async () => {
    const failingPort: EmbeddingPort = {
      embed: vi.fn(async () => {
        throw new Error('embed boom')
      }),
      getDimension: vi.fn(() => 1024),
    }
    const appendSpy = vi.fn(async () => ({
      id: '1',
      logGroupId: 'test',
      version: 1,
    }))
    analysisLogRepo = {
      ...makeMockAnalysisLogRepo(),
      appendAnalysisLog: appendSpy,
    }
    retrievalService = new RetrievalService(chunkRepo, rerankerPort, failingPort, analysisLogRepo)

    await expect(
      retrievalService.retrieve({ text: 'x', userId: 1, sessionId: null }),
    ).rejects.toThrow('embed boom')

    const failedCall = appendSpy.mock.calls.find(([, status]) => status === 'failed')
    expect(failedCall).toBeDefined()
  })

  it('未设置 retrievalPort 时不影响（使用 rerankerPort）', async () => {
    rerankerPort = makeMockRerankerPort([])
    retrievalService = new RetrievalService(chunkRepo, rerankerPort, embeddingPort, analysisLogRepo)
    const result = await retrievalService.retrieve({
      text: 'x',
      userId: 1,
      sessionId: null,
      threshold: 0.0,
    })
    expect(result.items).toEqual([])
  })

  it('sourceFilter 透传到 chunkRepository', async () => {
    const vectorSearch = vi.fn(async () => [])
    const fullTextSearch = vi.fn(async () => [])
    chunkRepo = makeMockChunkRepo({ vectorSearch, fullTextSearch })
    rerankerPort = makeMockRerankerPort([])
    retrievalService = new RetrievalService(chunkRepo, rerankerPort, embeddingPort, analysisLogRepo)

    await retrievalService.retrieve({
      text: 'x',
      userId: 1,
      sessionId: null,
      sourceFilter: ['src-a', 'src-b'],
      threshold: 0.0,
    })

    expect(vectorSearch).toHaveBeenCalledWith(expect.any(Array), 50, expect.any(Object), [
      'src-a',
      'src-b',
    ])
    expect(fullTextSearch).toHaveBeenCalledWith('x', 50, expect.any(Object), ['src-a', 'src-b'])
  })
})
