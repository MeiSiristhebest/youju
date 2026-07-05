import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceService } from '../src/domain/services/sourceService.js'
import { getServiceLocator } from '../src/infrastructure/di/serviceLocator.js'
import { Tokens } from '../src/infrastructure/di/tokens.js'
import type { TestApp } from './helpers/testSetup.js'
import { clearDatabase, createTestApp } from './helpers/testSetup.js'

describe('POST /api/sources/:id/reindex 集成测试', () => {
  let testApp: TestApp
  let sourceService: SourceService
  const sessionId = 'test_session_reindex'

  beforeAll(async () => {
    testApp = createTestApp()
    sourceService = getServiceLocator().resolve<SourceService>(Tokens.SourceService)
  })

  beforeEach(async () => {
    await clearDatabase(testApp.driver)
    await testApp.driver.run('DELETE FROM source_chunks')
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await testApp.driver.close()
  })

  it('素材存在时返回 200 且触发 reindexSource', async () => {
    const createRes = await request(testApp.app)
      .post('/api/sources/text')
      .set('x-session-id', sessionId)
      .send({
        type: 'doc',
        name: 'reindex 测试文档',
        content: '这是用于测试 reindex 的文档内容',
      })

    const sourceId = createRes.body.data.sourceId
    expect(sourceId).toBeDefined()

    const spy = vi.spyOn(sourceService, 'reindexSource').mockResolvedValue(undefined)

    const res = await request(testApp.app)
      .post(`/api/sources/${sourceId}/reindex`)
      .set('x-session-id', sessionId)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(res.body.data.sourceId).toBe(sourceId)
    expect(res.body.data.status).toBe('reindexing')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: sourceId,
        name: 'reindex 测试文档',
      }),
    )
  })

  it('素材不存在时返回 404', async () => {
    const res = await request(testApp.app)
      .post('/api/sources/nonexistent-source-id/reindex')
      .set('x-session-id', sessionId)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe(404)
    expect(res.body.msg).toBe('素材不存在')
  })

  it('未授权（无 session）返回 401', async () => {
    const createRes = await request(testApp.app)
      .post('/api/sources/text')
      .set('x-session-id', sessionId)
      .send({
        type: 'doc',
        name: 'reindex 未授权测试',
        content: '内容',
      })

    const sourceId = createRes.body.data.sourceId

    const res = await request(testApp.app).post(`/api/sources/${sourceId}/reindex`)

    expect(res.status).toBe(401)
    expect(res.body.code).toBe(401)
  })
})
