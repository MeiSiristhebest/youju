import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TestApp } from '../helpers/testSetup.js'
import { createTestApp } from '../helpers/testSetup.js'

describe('GET /api/health 健康检查', () => {
  let testApp: TestApp

  beforeAll(async () => {
    testApp = createTestApp()
  })

  afterAll(async () => {
    await testApp.driver.close()
  })

  it('应该返回 200 状态码和正确的响应结构', async () => {
    const res = await request(testApp.app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.status).toBe('ok')
    expect(res.body.data.hasAiKey).toBeDefined()
    expect(typeof res.body.data.hasAiKey).toBe('boolean')
  })
})
