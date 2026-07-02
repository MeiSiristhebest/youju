import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { DatabaseDriver } from '../src/data/DatabaseDriver.js'
import { createSourceRepository } from '../src/data/repositories/sourceRepository.js'
import { createUserRepository } from '../src/data/repositories/userRepository.js'
import {
  buildDataScopeWhere,
  createTenantContext,
  validateTenantAccess,
} from '../src/domain/context/tenantContext.js'
import * as sourceService from '../src/domain/services/sourceService.js'
import { setSourceRepository } from '../src/domain/services/sourceService.js'
import { createTestDriverAsync } from './helpers/testSetup.js'

let driver: DatabaseDriver
let user1Id: number
let user2Id: number
const session1Id = 'session_abc123'
const session2Id = 'session_xyz789'

let source1: any, source2: any, source3: any, source4: any

beforeAll(async () => {
  driver = await createTestDriverAsync()
  const sourceRepository = createSourceRepository(driver)
  setSourceRepository(sourceRepository as any)

  const userRepository = createUserRepository(driver)
  const user1 = await userRepository.findOrCreateUser('test_openid_1', 'User1', 'avatar1')
  const user2 = await userRepository.findOrCreateUser('test_openid_2', 'User2', 'avatar2')
  user1Id = user1.id as number
  user2Id = user2.id as number
})

describe('Multi-Tenant 数据隔离', () => {
  beforeEach(async () => {
    await driver.run('DELETE FROM sources WHERE user_id IN (?, ?) OR session_id IN (?, ?)', [
      user1Id,
      user2Id,
      session1Id,
      session2Id,
    ])
  })

  it('创建不同用户/会话的数据', async () => {
    source1 = await sourceService.createSource(
      user1Id,
      null,
      'chat',
      'User1聊天记录',
      '内容1',
      'meta1',
    )
    source2 = await sourceService.createSource(user2Id, null, 'doc', 'User2文档', '内容2', 'meta2')
    source3 = await sourceService.createSource(
      null,
      session1Id,
      'web',
      'Session1网页',
      '内容3',
      'meta3',
    )
    source4 = await sourceService.createSource(
      null,
      session2Id,
      'chat',
      'Session2聊天',
      '内容4',
      'meta4',
    )

    expect(source1.id).toBeDefined()
    expect(source2.id).toBeDefined()
    expect(source3.id).toBeDefined()
    expect(source4.id).toBeDefined()
  })

  it('验证数据隔离查询', async () => {
    source1 = await sourceService.createSource(
      user1Id,
      null,
      'chat',
      'User1聊天记录',
      '内容1',
      'meta1',
    )
    source2 = await sourceService.createSource(user2Id, null, 'doc', 'User2文档', '内容2', 'meta2')
    source3 = await sourceService.createSource(
      null,
      session1Id,
      'web',
      'Session1网页',
      '内容3',
      'meta3',
    )
    source4 = await sourceService.createSource(
      null,
      session2Id,
      'chat',
      'Session2聊天',
      '内容4',
      'meta4',
    )

    const user1Sources = await sourceService.listSources(user1Id, null)
    expect(user1Sources.length).toBe(1)
    expect(user1Sources[0].id).toBe(source1.id)

    const user2Sources = await sourceService.listSources(user2Id, null)
    expect(user2Sources.length).toBe(1)
    expect(user2Sources[0].id).toBe(source2.id)

    const session1Sources = await sourceService.listSources(null, session1Id)
    expect(session1Sources.length).toBe(1)
    expect(session1Sources[0].id).toBe(source3.id)

    const session2Sources = await sourceService.listSources(null, session2Id)
    expect(session2Sources.length).toBe(1)
    expect(session2Sources[0].id).toBe(source4.id)
  })

  it('验证跨租户访问被阻止', () => {
    const ctxUser1 = createTenantContext(user1Id, null)
    const ctxSession1 = createTenantContext(null, session1Id)

    const user1AccessUser2 = validateTenantAccess(ctxUser1, 'sources', user2Id, null)
    expect(user1AccessUser2).toBe(false)

    const session1AccessUser1 = validateTenantAccess(ctxSession1, 'sources', user1Id, null)
    expect(session1AccessUser1).toBe(false)
  })

  it('验证 SQL 查询隔离', async () => {
    source1 = await sourceService.createSource(
      user1Id,
      null,
      'chat',
      'User1聊天记录',
      '内容1',
      'meta1',
    )
    source2 = await sourceService.createSource(user2Id, null, 'doc', 'User2文档', '内容2', 'meta2')
    source3 = await sourceService.createSource(
      null,
      session1Id,
      'web',
      'Session1网页',
      '内容3',
      'meta3',
    )

    const scopeUser1 = buildDataScopeWhere(createTenantContext(user1Id, null))
    const scopeUser2 = buildDataScopeWhere(createTenantContext(user2Id, null))
    const scopeSession1 = buildDataScopeWhere(createTenantContext(null, session1Id))

    expect(scopeUser1.clause).toBe('user_id = ?')
    expect(scopeUser2.clause).toBe('user_id = ?')
    expect(scopeSession1.clause).toBe('session_id = ? AND user_id IS NULL')

    const queryUser1 = await driver.get<any>(
      `SELECT COUNT(*) as count FROM sources WHERE ${scopeUser1.clause}`,
      scopeUser1.params,
    )
    expect(queryUser1.count).toBe(1)

    const queryUser2 = await driver.get<any>(
      `SELECT COUNT(*) as count FROM sources WHERE ${scopeUser2.clause}`,
      scopeUser2.params,
    )
    expect(queryUser2.count).toBe(1)

    const querySession1 = await driver.get<any>(
      `SELECT COUNT(*) as count FROM sources WHERE ${scopeSession1.clause}`,
      scopeSession1.params,
    )
    expect(querySession1.count).toBe(1)
  })

  afterEach(async () => {
    if (source1 && source2 && source3 && source4) {
      await driver.run('DELETE FROM sources WHERE id IN (?, ?, ?, ?)', [
        Number(source1.id),
        Number(source2.id),
        Number(source3.id),
        Number(source4.id),
      ])
    }
  })
})

afterAll(async () => {
  if (driver) {
    await driver.close()
  }
})
