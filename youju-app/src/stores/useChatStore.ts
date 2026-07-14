import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatCitation, ChatMessage, ContextScope, Conversation } from '../types'

interface ChatState {
  // 数据
  conversations: Conversation[]
  activeConversationId: string | null
  messages: ChatMessage[]

  // 流式状态
  streaming: boolean
  streamingMessage: string
  streamingCitations: ChatCitation[]
  isRetrieving: boolean
  retrievedChunks: ChatCitation[]
  streamError: string | null

  // 上下文配置
  contextScope: ContextScope
  selectedSourceIds: string[]

  // 加载状态
  loadingConversations: boolean
  loadingMessages: boolean

  // 会话 actions
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  removeConversation: (id: string) => void
  setActiveConversationId: (id: string | null) => void

  // 消息 actions
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  clearMessages: () => void

  // 流式 actions
  setStreaming: (streaming: boolean) => void
  setStreamingMessage: (text: string | ((prev: string) => string)) => void
  appendStreamingToken: (token: string) => void
  setStreamingCitations: (citations: ChatCitation[]) => void
  addStreamingCitation: (citation: ChatCitation) => void
  setIsRetrieving: (retrieving: boolean) => void
  setRetrievedChunks: (chunks: ChatCitation[]) => void
  setStreamError: (error: string | null) => void
  resetStream: () => void

  // 上下文 actions
  setContextScope: (scope: ContextScope) => void
  setSelectedSourceIds: (ids: string[]) => void

  // 加载状态 actions
  setLoadingConversations: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversationId: null,
      messages: [],

      streaming: false,
      streamingMessage: '',
      streamingCitations: [],
      isRetrieving: false,
      retrievedChunks: [],
      streamError: null,

      contextScope: 'all',
      selectedSourceIds: [],

      loadingConversations: false,
      loadingMessages: false,

      setConversations: (conversations) => set({ conversations }),
      addConversation: (conversation) =>
        set((state) => ({ conversations: [...state.conversations, conversation] })),
      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      removeConversation: (id) =>
        set((state) => ({ conversations: state.conversations.filter((c) => c.id !== id) })),
      setActiveConversationId: (id) => set({ activeConversationId: id }),

      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      clearMessages: () => set({ messages: [] }),

      setStreaming: (streaming) => set({ streaming }),
      setStreamingMessage: (text) =>
        set((state) => ({
          streamingMessage: typeof text === 'function' ? text(state.streamingMessage) : text,
        })),
      appendStreamingToken: (token) =>
        set((state) => ({ streamingMessage: state.streamingMessage + token })),
      setStreamingCitations: (citations) => set({ streamingCitations: citations }),
      addStreamingCitation: (citation) =>
        set((state) => ({ streamingCitations: [...state.streamingCitations, citation] })),
      setIsRetrieving: (retrieving) => set({ isRetrieving: retrieving }),
      setRetrievedChunks: (chunks) => set({ retrievedChunks: chunks }),
      setStreamError: (error) => set({ streamError: error }),
      resetStream: () =>
        set({
          streaming: false,
          streamingMessage: '',
          streamingCitations: [],
          isRetrieving: false,
          streamError: null,
        }),

      setContextScope: (scope) => set({ contextScope: scope }),
      setSelectedSourceIds: (ids) => set({ selectedSourceIds: ids }),

      setLoadingConversations: (loading) => set({ loadingConversations: loading }),
      setLoadingMessages: (loading) => set({ loadingMessages: loading }),
    }),
    {
      name: 'youju-chat-store',
      version: 1,
      partialize: (state) => ({
        contextScope: state.contextScope,
        selectedSourceIds: state.selectedSourceIds,
      }),
    },
  ),
)
