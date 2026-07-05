import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseDriver } from '../src/data/DatabaseDriver.js'
import { createConversationRepository } from '../src/data/repositories/conversationRepository.js'
import { createMessageRepository } from '../src/data/repositories/messageRepository.js'
import { createSourceRepository } from '../src/data/repositories/sourceRepository.js'
import { createUserRepository } from '../src/data/repositories/userRepository.js'
import {
  buildDataScopeWhere,
  createTenantContext,
  validateTenantAccess,
} from '../src/domain/context/tenantContext.js'
import type { AIChatPort } from '../src/domain/ports/aiPorts.js'
import { ChatService } from '../src/domain/services/chatService.js'
import { SourceService } from '../src/domain/services/sourceService.js'
import { createTestDriverAsync } from './helpers/testSetup.js'

function makeMockChatPort(): AIChatPort {
  return {
    chatStream: vi.fn(async () => ({
      content: '',
      citations: [],
      toolCalls: [],
      tokenPrompt: 0,
      tokenCompletion: 0,
      model: 'mock',
      isMock: true,
    })),
    summarizeConversation: vi.fn(async () => ({
      content: '',
      tokenPrompt: 0,
      tokenCompletion: 0,
      model: 'mock',
    })),
    generateConversationTitle: vi.fn(async () => ({
      content: '',
      tokenPrompt: 0,
      tokenCompletion: 0,
      model: 'mock',
    })),
  }
}

let driver: DatabaseDriver
let user1Id: number
let user2Id: number
const session1Id = 'session_abc123'
const session2Id = 'session_xyz789'

let source1: any, source2: any, source3: any, source4: any
let conv1: any, conv2: any, conv3: any, conv4: any

let sourceService: SourceService
let chatService: ChatService

beforeAll(async () => {
  driver = await createTestDriverAsync()
  const sourceRepository = createSourceRepository(driver)

  const conversationRepository = createConversationRepository(driver)
  const messageRepository = createMessageRepository(driver)

  sourceService = new SourceService(sourceRepository, null, null)
  chatService = new ChatService(makeMockChatPort(), conversationRepository, messageRepository, null)

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
    await driver.run(
      'DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (?, ?) OR session_id IN (?, ?))',
      [String(user1Id), String(user2Id), session1Id, session2Id],
    )
    await driver.run('DELETE FROM conversations WHERE user_id IN (?, ?) OR session_id IN (?, ?)', [
      String(user1Id),
      String(user2Id),
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

    const anonymousSources = await sourceService.listSources(null, null)
    expect(anonymousSources.length).toBe(0)
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

  it('Conversations - 创建不同租户的会话', async () => {
    conv1 = await chatService.createConversation({
      userId: user1Id,
      sessionId: null,
      title: 'User1对话',
    })
    conv2 = await chatService.createConversation({
      userId: user2Id,
      sessionId: null,
      title: 'User2对话',
    })
    conv3 = await chatService.createConversation({
      userId: null,
      sessionId: session1Id,
      title: 'Session1对话',
    })
    conv4 = await chatService.createConversation({
      userId: null,
      sessionId: session2Id,
      title: 'Session2对话',
    })

    expect(conv1.id).toBeDefined()
    expect(conv2.id).toBeDefined()
    expect(conv3.id).toBeDefined()
    expect(conv4.id).toBeDefined()
  })

  it('Conversations - 验证数据隔离查询', async () => {
    conv1 = await chatService.createConversation({
      userId: user1Id,
      sessionId: null,
      title: 'User1对话',
    })
    conv2 = await chatService.createConversation({
      userId: user2Id,
      sessionId: null,
      title: 'User2对话',
    })
    conv3 = await chatService.createConversation({
      userId: null,
      sessionId: session1Id,
      title: 'Session1对话',
    })
    conv4 = await chatService.createConversation({
      userId: null,
      sessionId: session2Id,
      title: 'Session2对话',
    })

    const user1Convs = await chatService.listConversations(user1Id, null)
    expect(user1Convs.length).toBe(1)
    expect(user1Convs[0].id).toBe(conv1.id)

    const user2Convs = await chatService.listConversations(user2Id, null)
    expect(user2Convs.length).toBe(1)
    expect(user2Convs[0].id).toBe(conv2.id)

    const session1Convs = await chatService.listConversations(null, session1Id)
    expect(session1Convs.length).toBe(1)
    expect(session1Convs[0].id).toBe(conv3.id)

    const session2Convs = await chatService.listConversations(null, session2Id)
    expect(session2Convs.length).toBe(1)
    expect(session2Convs[0].id).toBe(conv4.id)

    const anonymousConvs = await chatService.listConversations(null, null)
    expect(anonymousConvs.length).toBe(0)
  })

  it('Conversations - 验证跨租户访问被阻止', async () => {
    conv1 = await chatService.createConversation({
      userId: user1Id,
      sessionId: null,
      title: 'User1对话',
    })

    const ctxUser2 = createTenantContext(user2Id, null)
    const user2AccessUser1 = await chatService.getConversation(conv1.id, ctxUser2)
    expect(user2AccessUser1).toBeNull()

    const ctxSession1 = createTenantContext(null, session1Id)
    const session1AccessUser1 = await chatService.getConversation(conv1.id, ctxSession1)
    expect(session1AccessUser1).toBeNull()
  })

  it('Messages - 验证消息与会话关联隔离', async () => {
    conv1 = await chatService.createConversation({
      userId: user1Id,
      sessionId: null,
      title: 'User1对话',
    })
    conv2 = await chatService.createConversation({
      userId: user2Id,
      sessionId: null,
      title: 'User2对话',
    })

    const messageRepo = createMessageRepository(driver)

    const msg1 = await messageRepo.create({
      conversationId: conv1.id,
      role: 'user',
      content: 'User1的消息',
      parentMessageId: null,
    })

    const msg2 = await messageRepo.create({
      conversationId: conv2.id,
      role: 'user',
      content: 'User2的消息',
      parentMessageId: null,
    })

    expect(msg1.id).toBeDefined()
    expect(msg2.id).toBeDefined()

    const user1Messages = await chatService.getMessages(conv1.id)
    expect(user1Messages.length).toBe(1)
    expect(user1Messages[0].id).toBe(msg1.id)

    const user2Messages = await chatService.getMessages(conv2.id)
    expect(user2Messages.length).toBe(1)
    expect(user2Messages[0].id).toBe(msg2.id)
  })

  it('Conversations - 验证重命名隔离', async () => {
    conv1 = await chatService.createConversation({
      userId: user1Id,
      sessionId: null,
      title: 'User1对话',
    })

    const ctxUser2 = createTenantContext(user2Id, null)
    const renamed = await chatService.renameConversation(conv1.id, '新标题', ctxUser2)
    expect(renamed).toBeNull()

    const ctxUser1 = createTenantContext(user1Id, null)
    const renamedByOwner = await chatService.renameConversation(conv1.id, '新标题', ctxUser1)
    expect(renamedByOwner).not.toBeNull()
    expect(renamedByOwner?.title).toBe('新标题')
  })

  it('Conversations - 验证删除隔离', async () => {
    conv1 = await chatService.createConversation({
      userId: user1Id,
      sessionId: null,
      title: 'User1对话',
    })

    const ctxUser2 = createTenantContext(user2Id, null)
    const deletedByOther = await chatService.deleteConversation(conv1.id, ctxUser2)
    expect(deletedByOther).toBe(false)

    const ctxUser1 = createTenantContext(user1Id, null)
    const deletedByOwner = await chatService.deleteConversation(conv1.id, ctxUser1)
    expect(deletedByOwner).toBe(true)
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
