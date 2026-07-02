import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../helpers/testSetup.js'
import { clearDatabase, createTestApp } from '../helpers/testSetup.js'

describe('分析 API 测试', () => {
  let testApp: TestApp
  const sessionId = 'test_analysis_session'

  beforeAll(async () => {
    testApp = createTestApp()
  })

  beforeEach(async () => {
    await clearDatabase(testApp.driver)
  })

  afterAll(async () => {
    await testApp.driver.close()
  })

  async function createTestSource(name: string, content: string) {
    const res = await request(testApp.app)
      .post('/api/sources/text')
      .set('x-session-id', sessionId)
      .send({
        type: 'doc',
        name,
        content,
      })
    return res.body.data
  }

  describe('POST /api/analyze', () => {
    it('空素材时返回 400', async () => {
      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({
          sourceIds: [],
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe(400)
      expect(res.body.msg).toBe('没有可分析的材料')
    })

    it('mock 模式下分析成功，返回正确结构', async () => {
      const source = await createTestSource(
        '测试合同',
        '这是一份测试合同，包含一些条款内容，用于测试分析功能。',
      )

      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({
          sourceIds: [source.id],
          scenarioType: 'contract',
        })

      expect(res.status).toBe(200)
      expect(res.body.code).toBe(200)
      expect(res.body.data).toBeDefined()
    })

    it('返回结果包含 risks 字段', async () => {
      const source = await createTestSource('测试文档', '测试文档内容，用于风险检测。')

      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({
          sourceIds: [source.id],
        })

      expect(res.body.data.risks).toBeDefined()
      expect(Array.isArray(res.body.data.risks)).toBe(true)
    })

    it('返回结果包含 summary 字段', async () => {
      const source = await createTestSource('测试文档', '测试文档内容。')

      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({
          sourceIds: [source.id],
        })

      expect(res.body.data.summary).toBeDefined()
    })

    it('返回结果包含 extractedEntities 字段', async () => {
      const source = await createTestSource('测试文档', '测试文档内容。')

      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({
          sourceIds: [source.id],
        })

      expect(res.body.data.extractedEntities).toBeDefined()
    })

    it('isMock 为 true', async () => {
      const source = await createTestSource('测试文档', '测试文档内容。')

      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({
          sourceIds: [source.id],
        })

      expect(res.body.data.meta).toBeDefined()
      expect(res.body.data.meta.isMock).toBe(true)
    })

    it('sourceCount 正确', async () => {
      const source1 = await createTestSource('文档1', '内容1')
      const source2 = await createTestSource('文档2', '内容2')

      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({
          sourceIds: [source1.id, source2.id],
        })

      expect(res.body.data.meta.sourceCount).toBe(2)
    })

    it('不传 sourceIds 时使用全部素材', async () => {
      await createTestSource('文档1', '内容1')
      await createTestSource('文档2', '内容2')

      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({})

      expect(res.body.data.meta.sourceCount).toBe(2)
    })

    it('返回结果包含 preferences 字段', async () => {
      const source = await createTestSource('测试文档', '测试文档内容。')

      const res = await request(testApp.app)
        .post('/api/analyze')
        .set('x-session-id', sessionId)
        .send({
          sourceIds: [source.id],
        })

      expect(res.body.data.preferences).toBeDefined()
      expect(res.body.data.preferences.riskWeights).toBeDefined()
    })
  })
})
