import type { IncomingMessage } from 'node:http'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatCompleteResult, ChatStreamCallbacks } from '../src/domain/ports/aiPorts.js'
import type { SendMessageOptions } from '../src/domain/services/chatService.js'
import type { Conversation } from '../src/domain/types.js'
import type { TestApp } from './helpers/testSetup.js'
import { createTestApp } from './helpers/testSetup.js'

const {
  createConversationMock,
  listConversationsMock,
  getConversationMock,
  renameConversationMock,
  deleteConversationMock,
  getMessagesMock,
  getMessageByIdMock,
  sendMessageMock,
  updateMessageFeedbackMock,
  summarizeHistoryMock,
  getDefaultModelConfigMock,
  getServiceMock,
} = vi.hoisted(() => ({
  createConversationMock: vi.fn(),
  listConversationsMock: vi.fn(),
  getConversationMock: vi.fn(),
  renameConversationMock: vi.fn(),
  deleteConversationMock: vi.fn(),
  getMessagesMock: vi.fn(),
  getMessageByIdMock: vi.fn(),
  sendMessageMock: vi.fn(),
  updateMessageFeedbackMock: vi.fn(),
  summarizeHistoryMock: vi.fn(),
  getDefaultModelConfigMock: vi.fn(),
  getServiceMock: vi.fn(),
}))

vi.mock('../src/infrastructure/di/serviceLocator.js', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    getService: getServiceMock,
  }
})

vi.mock('../src/domain/services/chatService.js', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    createConversation: createConversationMock,
    listConversations: listConversationsMock,
    getConversation: getConversationMock,
    renameConversation: renameConversationMock,
    deleteConversation: deleteConversationMock,
    getMessages: getMessagesMock,
    getMessageById: getMessageByIdMock,
    sendMessage: sendMessageMock,
    updateMessageFeedback: updateMessageFeedbackMock,
    summarizeHistory: summarizeHistoryMock,
  }
})

vi.mock('../src/domain/services/modelConfigService.js', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    getDefaultModelConfig: getDefaultModelConfigMock,
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    userId: null,
    sessionId: 'test-session',
    title: '测试对话',
    scenarioType: null,
    sourceIds: [],
    contextSourceIds: [],
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeChatResult(overrides: Partial<ChatCompleteResult> = {}): ChatCompleteResult {
  return {
    content: '这是一个测试回答',
    citations: [],
    toolCalls: [],
    tokenPrompt: 10,
    tokenCompletion: 5,
    model: 'test-model',
    isMock: true,
    ...overrides,
  }
}

interface SSEEvent {
  event: string
  data: string
}

function parseSSEEvents(raw: string): SSEEvent[] {
  const events: SSEEvent[] = []
  const blocks = raw.split('\n\n')
  for (const block of blocks) {
    if (!block.trim()) continue
    const lines = block.split('\n')
    let event = ''
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event = line.slice(7)
      } else if (line.startsWith('data: ')) {
        data = line.slice(6)
      }
    }
    if (event) {
      events.push({ event, data })
    }
  }
  return events
}

function sseParser(
  res: IncomingMessage,
  callback: (err: Error | null, body: unknown) => void,
): void {
  let data = ''
  res.on('data', (chunk: Buffer) => {
    data += chunk.toString()
  })
  res.on('end', () => {
    callback(null, data)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Chat Routes /api/v1/chat', () => {
  let testApp: TestApp

  beforeAll(() => {
    testApp = createTestApp()
  })

  afterAll(async () => {
    await testApp.driver.close()
  })

  beforeEach(() => {
    createConversationMock.mockReset()
    listConversationsMock.mockReset()
    getConversationMock.mockReset()
    renameConversationMock.mockReset()
    deleteConversationMock.mockReset()
    getMessagesMock.mockReset()
    getMessageByIdMock.mockReset()
    sendMessageMock.mockReset()
    updateMessageFeedbackMock.mockReset()
    summarizeHistoryMock.mockReset()
    getDefaultModelConfigMock.mockReset()
    getDefaultModelConfigMock.mockResolvedValue(null)
    getServiceMock.mockReset()
    getServiceMock.mockImplementation((token: symbol) => {
      if (token.toString() === 'Symbol(ChatService)') {
        return {
          createConversation: createConversationMock,
          listConversations: listConversationsMock,
          getConversation: getConversationMock,
          renameConversation: renameConversationMock,
          deleteConversation: deleteConversationMock,
          getMessages: getMessagesMock,
          getMessageById: getMessageByIdMock,
          sendMessage: sendMessageMock,
          updateMessageFeedback: updateMessageFeedbackMock,
          summarizeHistory: summarizeHistoryMock,
        }
      }
      if (token.toString() === 'Symbol(ModelConfigService)') {
        return {
          getDefaultModelConfig: getDefaultModelConfigMock,
        }
      }
      if (token.toString() === 'Symbol(MemoryService)') {
        return {
          createMemory: vi.fn().mockResolvedValue({
            id: 'mem-1',
            content: 'test',
            createdAt: new Date().toISOString(),
          }),
          listMemories: vi.fn().mockResolvedValue([]),
          deleteMemory: vi.fn().mockResolvedValue(true),
        }
      }
      throw new Error(`Unknown service token: ${token.toString()}`)
    })
  })

  it('1. POST /conversations 创建会话成功', async () => {
    const conv = makeConversation({ id: 'conv-new', title: '新对话' })
    createConversationMock.mockResolvedValue(conv)

    const res = await request(testApp.app)
      .post('/api/v1/chat/conversations')
      .set('X-Session-Id', 'test-session')
      .send({ title: '新对话', scenarioType: 'contract' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(res.body.data.id).toBe('conv-new')
    expect(res.body.data.title).toBe('新对话')
    expect(createConversationMock).toHaveBeenCalledTimes(1)
  })

  it('2. GET /conversations 列出会话成功', async () => {
    const convs = [makeConversation({ id: 'conv-1' }), makeConversation({ id: 'conv-2' })]
    listConversationsMock.mockResolvedValue(convs)

    const res = await request(testApp.app)
      .get('/api/v1/chat/conversations')
      .set('X-Session-Id', 'test-session')

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0].id).toBe('conv-1')
    expect(listConversationsMock).toHaveBeenCalledTimes(1)
  })

  it('3. PATCH /conversations/:id 重命名会话成功', async () => {
    const renamed = makeConversation({ id: 'conv-1', title: '重命名后' })
    renameConversationMock.mockResolvedValue(renamed)

    const res = await request(testApp.app)
      .patch('/api/v1/chat/conversations/conv-1')
      .set('X-Session-Id', 'test-session')
      .send({ title: '重命名后' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(res.body.data.title).toBe('重命名后')
    expect(renameConversationMock).toHaveBeenCalledWith('conv-1', '重命名后', expect.any(Object))
  })

  it('4. DELETE /conversations/:id 软删除会话成功', async () => {
    deleteConversationMock.mockResolvedValue(true)

    const res = await request(testApp.app)
      .delete('/api/v1/chat/conversations/conv-1')
      .set('X-Session-Id', 'test-session')

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(deleteConversationMock).toHaveBeenCalledWith('conv-1', expect.any(Object))
  })

  it('5. POST /conversations/:id/messages/stream SSE 事件序列正确', async () => {
    getConversationMock.mockResolvedValue(makeConversation({ id: 'conv-1' }))

    const result = makeChatResult({
      content: 'Hello world',
      citations: [
        {
          index: 1,
          sourceId: 'src-1',
          sourceName: '合同文档',
          chunkId: 'chunk-1',
          quote: '这是引用片段',
          score: 0.92,
        },
      ],
      toolCalls: [{ name: 'searchDocs', args: { query: '测试问题' } }],
    })

    sendMessageMock.mockImplementation(
      async (
        conversationId: string,
        _content: string,
        _options: SendMessageOptions,
        callbacks?: ChatStreamCallbacks,
      ): Promise<ChatCompleteResult> => {
        callbacks?.onInit?.({ conversationId, userMessageId: 'msg-1' })
        callbacks?.onToken?.('Hello')
        callbacks?.onToken?.(' world')
        callbacks?.onToolCall?.('searchDocs', { query: '测试问题' })
        callbacks?.onCitation?.(result.citations)
        callbacks?.onComplete?.(result)
        return result
      },
    )

    const res = await request(testApp.app)
      .post('/api/v1/chat/conversations/conv-1/messages/stream')
      .set('X-Session-Id', 'test-session')
      .send({ content: '测试问题' })
      .buffer(true)
      .parse(sseParser)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')

    const events = parseSSEEvents(res.body as unknown as string)
    const eventTypes = events.map((e) => e.event)

    expect(eventTypes).toContain('init')
    expect(eventTypes).toContain('token')
    expect(eventTypes).toContain('tool_call')
    expect(eventTypes).toContain('citation')
    expect(eventTypes).toContain('complete')

    // 验证 init 事件包含 conversationId
    const initEvent = events.find((e) => e.event === 'init')
    expect(initEvent).toBeDefined()
    const initData = JSON.parse(initEvent!.data)
    expect(initData.conversationId).toBe('conv-1')

    // 验证 token 事件累积为完整回答
    const tokenEvents = events.filter((e) => e.event === 'token')
    const fullText = tokenEvents.map((e) => JSON.parse(e.data).token).join('')
    expect(fullText).toBe('Hello world')

    // 验证 complete 事件包含完整结果
    const completeEvent = events.find((e) => e.event === 'complete')
    expect(completeEvent).toBeDefined()
    const completeData = JSON.parse(completeEvent!.data)
    expect(completeData.content).toBe('Hello world')
    expect(completeData.model).toBe('test-model')

    // 验证 sendMessage 被调用（消息持久化由 sendMessage 内部完成）
    expect(sendMessageMock).toHaveBeenCalledTimes(1)
  })

  it('6. POST /messages/:id/feedback 反馈成功', async () => {
    updateMessageFeedbackMock.mockResolvedValue(true)

    const res = await request(testApp.app)
      .post('/api/v1/chat/messages/msg-1/feedback')
      .set('X-Session-Id', 'test-session')
      .send({ feedback: 'positive' })

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(200)
    expect(updateMessageFeedbackMock).toHaveBeenCalledWith('msg-1', 'positive')
  })

  it('7. POST /conversations/:id/messages/stream 会话不存在返回 404', async () => {
    getConversationMock.mockResolvedValue(null)

    const res = await request(testApp.app)
      .post('/api/v1/chat/conversations/nonexistent/messages/stream')
      .set('X-Session-Id', 'test-session')
      .send({ content: '测试' })

    expect(res.status).toBe(404)
    expect(res.body.code).toBe(404)
    expect(res.body.msg).toContain('会话不存在')
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it('8. POST /conversations/:id/messages/stream content 为空返回 400', async () => {
    const res = await request(testApp.app)
      .post('/api/v1/chat/conversations/conv-1/messages/stream')
      .set('X-Session-Id', 'test-session')
      .send({ content: '' })

    expect(res.status).toBe(400)
    expect(sendMessageMock).not.toHaveBeenCalled()
  })
})
