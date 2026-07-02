import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../helpers/testSetup.js'
import { clearDatabase, createTestApp } from '../helpers/testSetup.js'

describe('认证 API 测试', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = createTestApp()
  })

  beforeEach(async () => {
    await clearDatabase(testApp.driver)
  })

  afterAll(async () => {
    await testApp.driver.close()
  })

  describe('POST /api/auth/wechat', () => {
    it('微信登录成功，返回 token 和用户信息', async () => {
      const res = await request(testApp.app)
        .post('/api/auth/wechat')
        .send({ code: 'test_code_123' })

      expect(res.status).toBe(200)
      expect(res.body.code).toBe(200)
      expect(res.body.data.token).toBeDefined()
      expect(typeof res.body.data.token).toBe('string')
      expect(res.body.data.user).toBeDefined()
      expect(res.body.data.user.id).toBeDefined()
      expect(res.body.data.user.nickname).toBeDefined()
      expect(res.body.data.user.avatar).toBeDefined()
    })

    it('相同 code 登录应返回同一用户', async () => {
      const res1 = await request(testApp.app).post('/api/auth/wechat').send({ code: 'same_code' })

      const res2 = await request(testApp.app).post('/api/auth/wechat').send({ code: 'same_code' })

      expect(res1.body.data.user.id).toBe(res2.body.data.user.id)
    })

    it('不同 code 登录应返回不同用户', async () => {
      const res1 = await request(testApp.app).post('/api/auth/wechat').send({ code: 'code_a' })

      const res2 = await request(testApp.app).post('/api/auth/wechat').send({ code: 'code_b' })

      expect(res1.body.data.user.id).not.toBe(res2.body.data.user.id)
    })
  })

  describe('GET /api/user/info', () => {
    it('未登录时返回 401', async () => {
      const res = await request(testApp.app).get('/api/user/info')

      expect(res.status).toBe(401)
      expect(res.body.code).toBe(401)
      expect(res.body.msg).toBe('未登录')
    })

    it('带 Authorization header 能正确识别用户', async () => {
      const loginRes = await request(testApp.app)
        .post('/api/auth/wechat')
        .send({ code: 'test_user' })

      const token = loginRes.body.data.token
      const userId = loginRes.body.data.user.id
      const nickname = loginRes.body.data.user.nickname

      const infoRes = await request(testApp.app)
        .get('/api/user/info')
        .set('Authorization', `Bearer ${token}`)

      expect(infoRes.status).toBe(200)
      expect(infoRes.body.code).toBe(200)
      expect(infoRes.body.data.id).toBe(userId)
      expect(infoRes.body.data.nickname).toBe(nickname)
    })

    it('无效 token 返回 401', async () => {
      const res = await request(testApp.app)
        .get('/api/user/info')
        .set('Authorization', 'Bearer invalid_token')

      expect(res.status).toBe(401)
      expect(res.body.code).toBe(401)
    })
  })

  describe('已登录用户的素材隔离', () => {
    it('不同用户的素材互相隔离', async () => {
      const loginRes1 = await request(testApp.app).post('/api/auth/wechat').send({ code: 'user_1' })

      const loginRes2 = await request(testApp.app).post('/api/auth/wechat').send({ code: 'user_2' })

      const token1 = loginRes1.body.data.token
      const token2 = loginRes2.body.data.token

      await request(testApp.app)
        .post('/api/sources/text')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'doc',
          name: '用户1的文档',
          content: '用户1的内容',
        })

      await request(testApp.app)
        .post('/api/sources/text')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          type: 'doc',
          name: '用户2的文档',
          content: '用户2的内容',
        })

      const listRes1 = await request(testApp.app)
        .get('/api/sources')
        .set('Authorization', `Bearer ${token1}`)

      expect(listRes1.body.data.length).toBe(1)
      expect(listRes1.body.data[0].name).toBe('用户1的文档')

      const listRes2 = await request(testApp.app)
        .get('/api/sources')
        .set('Authorization', `Bearer ${token2}`)

      expect(listRes2.body.data.length).toBe(1)
      expect(listRes2.body.data[0].name).toBe('用户2的文档')
    })
  })
})
