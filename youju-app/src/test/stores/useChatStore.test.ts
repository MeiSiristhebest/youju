import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useChatStore } from '../../stores/useChatStore'
import type { ChatCitation, ChatMessage, Conversation } from '../../types'

const mockConversation: Conversation = {
  id: 'conv-1',
  userId: null,
  sessionId: null,
  title: '测试会话',
  scenarioType: null,
  sourceIds: [],
  contextSourceIds: [],
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const mockMessage: ChatMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: '你好',
  toolCalls: null,
  citations: null,
  parentMessageId: null,
  isArchived: false,
  isPartial: false,
  feedback: null,
  langfuseTraceId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const mockCitation: ChatCitation = {
  index: 0,
  sourceId: 'source-1',
  sourceName: '材料1',
  chunkId: 'chunk-1',
  quote: '一段引用',
  score: 0.95,
}

const initialState = useChatStore.getState()

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState(initialState, true)
    localStorage.clear()
  })

  afterEach(() => {
    useChatStore.setState(initialState, true)
    localStorage.clear()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useChatStore.getState()
      expect(state.conversations).toEqual([])
      expect(state.activeConversationId).toBeNull()
      expect(state.messages).toEqual([])
      expect(state.streaming).toBe(false)
      expect(state.streamingMessage).toBe('')
      expect(state.streamingCitations).toEqual([])
      expect(state.isRetrieving).toBe(false)
      expect(state.retrievedChunks).toEqual([])
      expect(state.streamError).toBeNull()
      expect(state.contextScope).toBe('all')
      expect(state.selectedSourceIds).toEqual([])
      expect(state.loadingConversations).toBe(false)
      expect(state.loadingMessages).toBe(false)
    })
  })

  describe('会话 actions', () => {
    it('setConversations 应该正确设置会话列表', () => {
      useChatStore.getState().setConversations([mockConversation])
      expect(useChatStore.getState().conversations).toEqual([mockConversation])
    })

    it('addConversation 应该追加会话', () => {
      useChatStore.getState().addConversation(mockConversation)
      expect(useChatStore.getState().conversations).toHaveLength(1)
      expect(useChatStore.getState().conversations[0]).toEqual(mockConversation)

      const second = { ...mockConversation, id: 'conv-2' }
      useChatStore.getState().addConversation(second)
      expect(useChatStore.getState().conversations).toHaveLength(2)
      expect(useChatStore.getState().conversations[1].id).toBe('conv-2')
    })

    it('updateConversation 应该更新指定会话', () => {
      useChatStore.getState().addConversation(mockConversation)
      useChatStore.getState().updateConversation('conv-1', { title: '新标题' })
      expect(useChatStore.getState().conversations[0].title).toBe('新标题')
    })

    it('updateConversation 不存在的 id 不改变列表', () => {
      useChatStore.getState().addConversation(mockConversation)
      useChatStore.getState().updateConversation('non-existent', { title: 'x' })
      expect(useChatStore.getState().conversations).toEqual([mockConversation])
    })

    it('removeConversation 应该移除指定会话', () => {
      useChatStore.getState().addConversation(mockConversation)
      useChatStore.getState().removeConversation('conv-1')
      expect(useChatStore.getState().conversations).toEqual([])
    })

    it('setActiveConversationId 应该正确设置活动会话 id', () => {
      useChatStore.getState().setActiveConversationId('conv-1')
      expect(useChatStore.getState().activeConversationId).toBe('conv-1')
      useChatStore.getState().setActiveConversationId(null)
      expect(useChatStore.getState().activeConversationId).toBeNull()
    })
  })

  describe('消息 actions', () => {
    it('setMessages 应该正确设置消息列表', () => {
      useChatStore.getState().setMessages([mockMessage])
      expect(useChatStore.getState().messages).toEqual([mockMessage])
    })

    it('addMessage 应该追加消息', () => {
      useChatStore.getState().addMessage(mockMessage)
      expect(useChatStore.getState().messages).toHaveLength(1)
      const second = { ...mockMessage, id: 'msg-2' }
      useChatStore.getState().addMessage(second)
      expect(useChatStore.getState().messages).toHaveLength(2)
    })

    it('updateMessage 应该更新指定消息', () => {
      useChatStore.getState().addMessage(mockMessage)
      useChatStore.getState().updateMessage('msg-1', { feedback: 'positive' })
      expect(useChatStore.getState().messages[0].feedback).toBe('positive')
    })

    it('clearMessages 应该清空消息列表', () => {
      useChatStore.getState().addMessage(mockMessage)
      useChatStore.getState().clearMessages()
      expect(useChatStore.getState().messages).toEqual([])
    })
  })

  describe('流式状态 actions', () => {
    it('setStreamingMessage 应该支持字符串更新', () => {
      useChatStore.getState().setStreamingMessage('hello')
      expect(useChatStore.getState().streamingMessage).toBe('hello')
    })

    it('setStreamingMessage 应该支持函数式更新', () => {
      useChatStore.getState().setStreamingMessage('a')
      useChatStore.getState().setStreamingMessage((prev) => `${prev}b`)
      expect(useChatStore.getState().streamingMessage).toBe('ab')
    })

    it('appendStreamingToken 应该累加文本', () => {
      useChatStore.getState().appendStreamingToken('h')
      useChatStore.getState().appendStreamingToken('i')
      useChatStore.getState().appendStreamingToken('!')
      expect(useChatStore.getState().streamingMessage).toBe('hi!')
    })

    it('setStreamingCitations 应该正确设置引用', () => {
      useChatStore.getState().setStreamingCitations([mockCitation])
      expect(useChatStore.getState().streamingCitations).toEqual([mockCitation])
    })

    it('addStreamingCitation 应该追加引用', () => {
      useChatStore.getState().setStreamingCitations([mockCitation])
      const second = { ...mockCitation, index: 1, chunkId: 'chunk-2' }
      useChatStore.getState().addStreamingCitation(second)
      expect(useChatStore.getState().streamingCitations).toHaveLength(2)
      expect(useChatStore.getState().streamingCitations[1].chunkId).toBe('chunk-2')
    })

    it('resetStream 应该重置所有流式状态', () => {
      useChatStore.setState({
        streaming: true,
        streamingMessage: 'partial',
        streamingCitations: [mockCitation],
        isRetrieving: true,
        streamError: 'some error',
      })
      useChatStore.getState().resetStream()
      const state = useChatStore.getState()
      expect(state.streaming).toBe(false)
      expect(state.streamingMessage).toBe('')
      expect(state.streamingCitations).toEqual([])
      expect(state.isRetrieving).toBe(false)
      expect(state.streamError).toBeNull()
    })
  })

  describe('上下文配置 actions', () => {
    it('setContextScope 应该正确设置上下文范围', () => {
      useChatStore.getState().setContextScope('current')
      expect(useChatStore.getState().contextScope).toBe('current')
      useChatStore.getState().setContextScope('custom')
      expect(useChatStore.getState().contextScope).toBe('custom')
    })

    it('setSelectedSourceIds 应该正确设置选中的 source', () => {
      useChatStore.getState().setSelectedSourceIds(['s1', 's2'])
      expect(useChatStore.getState().selectedSourceIds).toEqual(['s1', 's2'])
    })
  })

  describe('加载状态 actions', () => {
    it('setLoadingConversations 应该正确设置加载状态', () => {
      useChatStore.getState().setLoadingConversations(true)
      expect(useChatStore.getState().loadingConversations).toBe(true)
    })

    it('setLoadingMessages 应该正确设置加载状态', () => {
      useChatStore.getState().setLoadingMessages(true)
      expect(useChatStore.getState().loadingMessages).toBe(true)
    })
  })

  describe('persist 配置', () => {
    it('应该持久化 conversations / activeConversationId / contextScope / selectedSourceIds', () => {
      useChatStore.getState().addConversation(mockConversation)
      useChatStore.getState().setActiveConversationId('conv-1')
      useChatStore.getState().setContextScope('custom')
      useChatStore.getState().setSelectedSourceIds(['s1'])

      const raw = localStorage.getItem('youju-chat-store')
      expect(raw).not.toBeNull()
      const persisted = JSON.parse(raw || '{}') as Record<string, unknown>
      const state = persisted.state as Record<string, unknown> | undefined

      expect(state).toBeDefined()
      expect(state?.conversations).toEqual([mockConversation])
      expect(state?.activeConversationId).toBe('conv-1')
      expect(state?.contextScope).toBe('custom')
      expect(state?.selectedSourceIds).toEqual(['s1'])
    })

    it('不应该持久化流式相关临时状态', () => {
      useChatStore.setState({
        streaming: true,
        streamingMessage: 'partial',
        streamingCitations: [mockCitation],
        isRetrieving: true,
        streamError: 'err',
        messages: [mockMessage],
        loadingConversations: true,
        loadingMessages: true,
      })

      const raw = localStorage.getItem('youju-chat-store')
      expect(raw).not.toBeNull()
      const persisted = JSON.parse(raw || '{}') as Record<string, unknown>
      const state = persisted.state as Record<string, unknown> | undefined

      expect(state).toBeDefined()
      expect(state).not.toHaveProperty('streaming')
      expect(state).not.toHaveProperty('streamingMessage')
      expect(state).not.toHaveProperty('streamingCitations')
      expect(state).not.toHaveProperty('isRetrieving')
      expect(state).not.toHaveProperty('streamError')
      expect(state).not.toHaveProperty('messages')
      expect(state).not.toHaveProperty('loadingConversations')
      expect(state).not.toHaveProperty('loadingMessages')
    })
  })
})
