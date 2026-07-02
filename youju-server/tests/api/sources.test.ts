import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../helpers/testSetup.js'
import { clearDatabase, createTestApp } from '../helpers/testSetup.js'

describe('素材 CRUD API 测试', () => {
  let testApp: TestApp

  const session1Id = 'test_session_1'
  const session2Id = 'test_session_2'

  beforeAll(async () => {
    testApp = createTestApp()
  })

  beforeEach(async () => {
    await clearDatabase(testApp.driver)
  })

  afterAll(async () => {
    await testApp.driver.close()
  })

  describe('GET /api/sources', () => {
    it('初始状态下应该返回空数组', async () => {
      const res = await request(testApp.app).get('/api/sources').set('x-session-id', session1Id)

      expect(res.status).toBe(200)
      expect(res.body.code).toBe(200)
      expect(res.body.data).toEqual([])
    })
  })

  describe('POST /api/sources/text', () => {
    it('创建素材成功，返回 id 和正确数据', async () => {
      const res = await request(testApp.app)
        .post('/api/sources/text')
        .set('x-session-id', session1Id)
        .send({
          type: 'doc',
          name: '测试文档',
          content: '这是测试文档的内容',
        })

      expect(res.status).toBe(200)
      expect(res.body.code).toBe(200)
      expect(res.body.data.sourceId).toBeDefined()
      expect(res.body.data.id).toBe(res.body.data.sourceId)
      expect(res.body.data.type).toBe('doc')
      expect(res.body.data.name).toBe('测试文档')
      expect(res.body.data.content).toBe('这是测试文档的内容')
    })

    it('缺少必要参数时返回 400', async () => {
      const res = await request(testApp.app)
        .post('/api/sources/text')
        .set('x-session-id', session1Id)
        .send({
          type: 'doc',
        })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe(400)
    })
  })

  describe('GET /api/sources 列表查询', () => {
    it('能查到刚创建的素材', async () => {
      const createRes = await request(testApp.app)
        .post('/api/sources/text')
        .set('x-session-id', session1Id)
        .send({
          type: 'doc',
          name: '测试文档',
          content: '这是测试文档的内容',
        })

      const sourceId = createRes.body.data.sourceId

      const listRes = await request(testApp.app).get('/api/sources').set('x-session-id', session1Id)

      expect(listRes.status).toBe(200)
      expect(listRes.body.code).toBe(200)
      expect(listRes.body.data.length).toBe(1)
      expect(listRes.body.data[0].id).toBe(sourceId)
      expect(listRes.body.data[0].name).toBe('测试文档')
    })
  })

  describe('DELETE /api/sources/:id', () => {
    it('删除成功', async () => {
      const createRes = await request(testApp.app)
        .post('/api/sources/text')
        .set('x-session-id', session1Id)
        .send({
          type: 'doc',
          name: '测试文档',
          content: '这是测试文档的内容',
        })

      const sourceId = createRes.body.data.sourceId

      const deleteRes = await request(testApp.app)
        .delete(`/api/sources/${sourceId}`)
        .set('x-session-id', session1Id)

      expect(deleteRes.status).toBe(200)
      expect(deleteRes.body.code).toBe(200)
      expect(deleteRes.body.data.success).toBe(true)

      const listRes = await request(testApp.app).get('/api/sources').set('x-session-id', session1Id)

      expect(listRes.body.data.length).toBe(0)
    })
  })

  describe('多租户数据隔离', () => {
    it('不同 session_id 看不到对方的素材', async () => {
      const createRes1 = await request(testApp.app)
        .post('/api/sources/text')
        .set('x-session-id', session1Id)
        .send({
          type: 'doc',
          name: '会话1的文档',
          content: '会话1的内容',
        })

      const createRes2 = await request(testApp.app)
        .post('/api/sources/text')
        .set('x-session-id', session2Id)
        .send({
          type: 'doc',
          name: '会话2的文档',
          content: '会话2的内容',
        })

      expect(createRes1.body.data.sourceId).toBeDefined()
      expect(createRes2.body.data.sourceId).toBeDefined()
      expect(createRes1.body.data.sourceId).not.toBe(createRes2.body.data.sourceId)

      const listRes1 = await request(testApp.app)
        .get('/api/sources')
        .set('x-session-id', session1Id)

      expect(listRes1.body.data.length).toBe(1)
      expect(listRes1.body.data[0].name).toBe('会话1的文档')

      const listRes2 = await request(testApp.app)
        .get('/api/sources')
        .set('x-session-id', session2Id)

      expect(listRes2.body.data.length).toBe(1)
      expect(listRes2.body.data[0].name).toBe('会话2的文档')
    })

    it('一个会话不能删除另一个会话的素材', async () => {
      const createRes = await request(testApp.app)
        .post('/api/sources/text')
        .set('x-session-id', session1Id)
        .send({
          type: 'doc',
          name: '会话1的文档',
          content: '会话1的内容',
        })

      const sourceId = createRes.body.data.sourceId

      const deleteRes = await request(testApp.app)
        .delete(`/api/sources/${sourceId}`)
        .set('x-session-id', session2Id)

      expect(deleteRes.status).toBe(200)
      expect(deleteRes.body.data.success).toBe(false)

      const listRes = await request(testApp.app).get('/api/sources').set('x-session-id', session1Id)

      expect(listRes.body.data.length).toBe(1)
    })
  })
})
