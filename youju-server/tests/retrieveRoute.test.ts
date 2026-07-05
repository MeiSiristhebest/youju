import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RetrievalResult } from '../src/domain/ports/aiPorts.js'
import type { RetrievalService } from '../src/domain/services/retrievalService.js'
import { getServiceLocator } from '../src/infrastructure/di/serviceLocator.js'
import { Tokens } from '../src/infrastructure/di/tokens.js'
import type { TestApp } from './helpers/testSetup.js'
import { clearDatabase, createTestApp } from './helpers/testSetup.js'

describe('POST /api/v1/retrieve', () => {
  let testApp: TestApp
  let retrievalService: RetrievalService
  let retrieveMock: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    testApp = createTestApp()
    retrievalService = getServiceLocator().resolve<RetrievalService>(Tokens.RetrievalService)
  })

  beforeEach(async () => {
    await clearDatabase(testApp.driver)
    retrieveMock = vi.fn(async () => {
      const result: RetrievalResult = {
        items: [
          {
            chunk: {
              id: 'chunk-1',
              sourceId: 'src-1',
              parentChunkId: null,
              chunkIndex: 0,
              content: 'mocked chunk content',
              charOffsetStart: 0,
              charOffsetEnd: 17,
              headingPath: null,
              tokenCount: 5,
              embedStatus: 'completed',
              userId: null,
              sessionId: null,
              createdAt: new Date().toISOString(),
            },
            parentChunk: null,
            score: 0.5,
            rerankScore: 0.9,
            source: 'both',
          },
        ],
        latencyMs: 42,
        stages: [{ stage: 'embedQuery', durationMs: 10, count: 1 }],
      }
      return result
    })
    vi.spyOn(retrievalService, 'retrieve').mockImplementation(retrieveMock)
  })

  afterAll(async () => {
    await testApp.driver.close()
  })

  it('未授权：无 session/token 时返回 401', async () => {
    const res = await request(testApp.app).post('/api/v1/retrieve').send({ query: 'hello' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('参数错误：query 为空时返回 400', async () => {
    const loginRes = await request(testApp.app)
      .post('/api/auth/wechat')
      .send({ code: 'retrieve-test-user' })
    const token = loginRes.body.data.token as string

    const res = await request(testApp.app)
      .post('/api/v1/retrieve')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '' })

    expect(res.status).toBe(400)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('参数错误：缺少 query 字段时返回 400', async () => {
    const loginRes = await request(testApp.app)
      .post('/api/auth/wechat')
      .send({ code: 'retrieve-test-user-2' })
    const token = loginRes.body.data.token as string

    const res = await request(testApp.app)
      .post('/api/v1/retrieve')
      .set('Authorization', `Bearer ${token}`)
      .send({ topK: 10 })

    expect(res.status).toBe(400)
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('成功调用：返回 mocked chunks 与 stages', async () => {
    const loginRes = await request(testApp.app)
      .post('/api/auth/wechat')
      .send({ code: 'retrieve-success-user' })
    const token = loginRes.body.data.token as string

    const res = await request(testApp.app)
      .post('/api/v1/retrieve')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '合同风险', sourceIds: ['src-1', 'src-2'], topK: 5 })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(res.body.data.chunks).toHaveLength(1)
    expect(res.body.data.chunks[0].chunk.id).toBe('chunk-1')
    expect(res.body.data.chunks[0].rerankScore).toBe(0.9)
    expect(res.body.data.latencyMs).toBe(42)
    expect(res.body.data.stages).toEqual([{ stage: 'embedQuery', durationMs: 10, count: 1 }])

    expect(retrieveMock).toHaveBeenCalledTimes(1)
    const arg = retrieveMock.mock.calls[0][0] as {
      text: string
      userId: number | null
      sessionId: string | null
      sourceFilter?: string[]
      topK?: number
    }
    expect(arg.text).toBe('合同风险')
    expect(arg.userId).not.toBeNull()
    expect(arg.sourceFilter).toEqual(['src-1', 'src-2'])
    expect(arg.topK).toBe(5)
  })

  it('使用 X-Session-Id 头鉴权也能通过', async () => {
    const res = await request(testApp.app)
      .post('/api/v1/retrieve')
      .set('X-Session-Id', 'anon-session-1')
      .send({ query: '匿名会话查询' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(retrieveMock).toHaveBeenCalledTimes(1)
    const arg = retrieveMock.mock.calls[0][0] as {
      userId: number | null
      sessionId: string | null
    }
    expect(arg.userId).toBeNull()
    expect(arg.sessionId).toBe('anon-session-1')
  })

  it('retrievalService 抛错时返回 500', async () => {
    retrieveMock.mockRejectedValueOnce(new Error('boom'))

    const loginRes = await request(testApp.app)
      .post('/api/auth/wechat')
      .send({ code: 'retrieve-error-user' })
    const token = loginRes.body.data.token as string

    const res = await request(testApp.app)
      .post('/api/v1/retrieve')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '会失败的查询' })

    expect(res.status).toBe(500)
    expect(res.body.code).toBe(500)
    expect(res.body.msg).toContain('boom')
  })
})
