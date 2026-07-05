import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DatabaseDriver } from '../src/data/DatabaseDriver.js'
import { createChunkRepository } from '../src/data/repositories/chunkRepository.js'
import { createTenantContext } from '../src/domain/context/tenantContext.js'
import type { SourceChunk } from '../src/domain/types.js'
import { createTestDriverAsync } from './helpers/testSetup.js'

let driver: DatabaseDriver

beforeAll(async () => {
  driver = await createTestDriverAsync()
})

afterAll(async () => {
  await driver.close()
})

beforeEach(async () => {
  await driver.run('DELETE FROM source_chunks')
  await driver.run("DELETE FROM sources WHERE type = 'test-chunk-fixture'")
})

async function ensureSource(sourceId: string): Promise<void> {
  const existing = await driver.get<{ id: number }>('SELECT id FROM sources WHERE id = ?', [
    Number(sourceId),
  ])
  if (!existing) {
    await driver.run(
      "INSERT INTO sources (id, user_id, session_id, type, name, content) VALUES (?, NULL, NULL, 'test-chunk-fixture', ?, '')",
      [Number(sourceId), `fixture-${sourceId}`],
    )
  }
}

function makeChunk(
  overrides: Partial<SourceChunk> & { id: string; sourceId: string },
): SourceChunk {
  return {
    parentChunkId: null,
    chunkIndex: 0,
    content: 'hello world',
    charOffsetStart: 0,
    charOffsetEnd: 11,
    headingPath: null,
    tokenCount: 3,
    embedStatus: 'pending',
    userId: null,
    sessionId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('chunkRepository (SQLite 内存驱动)', () => {
  it('insertChunks 写入后 findBySourceId 能读到', async () => {
    const repo = createChunkRepository(driver)
    const sourceId = '1001'
    await ensureSource(sourceId)
    const chunks = [
      makeChunk({ id: 'c-1', sourceId, chunkIndex: 0, content: 'first chunk' }),
      makeChunk({ id: 'c-2', sourceId, chunkIndex: 1, content: 'second chunk' }),
    ]
    await repo.insertChunks(chunks)

    const found = await repo.findBySourceId(sourceId)
    expect(found).toHaveLength(2)
    expect(found[0].id).toBe('c-1')
    expect(found[0].content).toBe('first chunk')
    expect(found[1].id).toBe('c-2')
    expect(found[1].chunkIndex).toBe(1)
  })

  it('deleteBySourceId 删除指定 source 的所有 chunks', async () => {
    const repo = createChunkRepository(driver)
    await ensureSource('1002')
    await ensureSource('1003')
    await repo.insertChunks([
      makeChunk({ id: 'c-a', sourceId: '1002' }),
      makeChunk({ id: 'c-b', sourceId: '1002' }),
      makeChunk({ id: 'c-c', sourceId: '1003' }),
    ])

    await repo.deleteBySourceId('1002')
    const remaining = await repo.findBySourceId('1002')
    expect(remaining).toHaveLength(0)

    const bChunks = await repo.findBySourceId('1003')
    expect(bChunks).toHaveLength(1)
    expect(bChunks[0].id).toBe('c-c')
  })

  it('vectorSearch 仅返回 embed_status=completed 的 chunk', async () => {
    const repo = createChunkRepository(driver)
    await ensureSource('1004')
    await repo.insertChunks([
      makeChunk({
        id: 'v-1',
        sourceId: '1004',
        content: 'completed chunk',
        embedStatus: 'completed',
        embedding: [1, 0, 0],
        userId: '1',
      }),
      makeChunk({
        id: 'v-2',
        sourceId: '1004',
        content: 'pending chunk',
        embedStatus: 'pending',
        embedding: [0, 1, 0],
        userId: '1',
      }),
    ])

    const ctx = createTenantContext(1, null)
    const results = await repo.vectorSearch([1, 0, 0], 10, ctx)
    expect(results).toHaveLength(1)
    expect(results[0].chunk.id).toBe('v-1')
    expect(results[0].score).toBeGreaterThan(0.99)
  })

  it('vectorSearch 支持 sourceFilter', async () => {
    const repo = createChunkRepository(driver)
    await ensureSource('1005')
    await ensureSource('1006')
    await repo.insertChunks([
      makeChunk({
        id: 'f-1',
        sourceId: '1005',
        content: 'chunk in X',
        embedStatus: 'completed',
        embedding: [1, 0],
        userId: '1',
      }),
      makeChunk({
        id: 'f-2',
        sourceId: '1006',
        content: 'chunk in Y',
        embedStatus: 'completed',
        embedding: [1, 0],
        userId: '1',
      }),
    ])

    const ctx = createTenantContext(1, null)
    const results = await repo.vectorSearch([1, 0], 10, ctx, ['1005'])
    expect(results).toHaveLength(1)
    expect(results[0].chunk.sourceId).toBe('1005')
  })

  it('tenant 隔离：用户 A 的 chunks 用户 B 查不到', async () => {
    const repo = createChunkRepository(driver)
    await ensureSource('1007')
    await ensureSource('1008')
    await repo.insertChunks([
      makeChunk({
        id: 't-1',
        sourceId: '1007',
        content: 'user 1 chunk',
        embedStatus: 'completed',
        embedding: [1, 0, 0],
        userId: '1',
      }),
      makeChunk({
        id: 't-2',
        sourceId: '1008',
        content: 'user 2 chunk',
        embedStatus: 'completed',
        embedding: [1, 0, 0],
        userId: '2',
      }),
    ])

    const ctxUser1 = createTenantContext(1, null)
    const ctxUser2 = createTenantContext(2, null)

    const user1Results = await repo.vectorSearch([1, 0, 0], 10, ctxUser1)
    expect(user1Results).toHaveLength(1)
    expect(user1Results[0].chunk.userId).toBe('1')

    const user2Results = await repo.vectorSearch([1, 0, 0], 10, ctxUser2)
    expect(user2Results).toHaveLength(1)
    expect(user2Results[0].chunk.userId).toBe('2')
  })

  it('findParentChunk 根据 parent_chunk_id 查父块', async () => {
    const repo = createChunkRepository(driver)
    await ensureSource('1009')
    await repo.insertChunks([
      makeChunk({ id: 'p-1', sourceId: '1009', chunkIndex: 0 }),
      makeChunk({
        id: 'p-2',
        sourceId: '1009',
        parentChunkId: 'p-1',
        chunkIndex: 0,
      }),
    ])

    const parent = await repo.findParentChunk('p-1')
    expect(parent).not.toBeNull()
    expect(parent?.id).toBe('p-1')

    const missing = await repo.findParentChunk('nonexistent')
    expect(missing).toBeNull()
  })

  it('updateEmbedStatus 更新嵌入状态和 embedding', async () => {
    const repo = createChunkRepository(driver)
    await ensureSource('1010')
    await repo.insertChunks([makeChunk({ id: 'u-1', sourceId: '1010', embedStatus: 'pending' })])

    await repo.updateEmbedStatus('u-1', 'completed', [0.1, 0.2, 0.3])
    const chunks = await repo.findBySourceId('1010')
    expect(chunks[0].embedStatus).toBe('completed')
    expect(chunks[0].embedding).toEqual([0.1, 0.2, 0.3])

    await repo.updateEmbedStatus('u-1', 'failed')
    const updated = await repo.findBySourceId('1010')
    expect(updated[0].embedStatus).toBe('failed')
  })

  it('fullTextSearch (SQLite LIKE) 能匹配内容', async () => {
    const repo = createChunkRepository(driver)
    await ensureSource('1011')
    await repo.insertChunks([
      makeChunk({
        id: 'fts-1',
        sourceId: '1011',
        content: '这是一段关于合同风险的文字',
        userId: '1',
      }),
      makeChunk({
        id: 'fts-2',
        sourceId: '1011',
        content: '另一段无关内容',
        userId: '1',
      }),
    ])

    const ctx = createTenantContext(1, null)
    const results = await repo.fullTextSearch('合同风险', 10, ctx)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((c) => c.id === 'fts-1')).toBe(true)
  })
})
