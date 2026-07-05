import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import {
  type ChatSSECompleteResult,
  type CreateConversationParams,
  chatApi,
} from '../services/chatApi'
import { useChatStore } from '../stores/useChatStore'
import type { ChatMessage, ContextScope } from '../types'

const RETRY_COUNT = 2

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('abort')) return true
  }
  return false
}

function retryOnlyNetwork(failureCount: number, error: unknown): boolean {
  if (failureCount >= RETRY_COUNT) return false
  return isNetworkError(error)
}

function computeContextSourceIds(scope: ContextScope, selectedIds: string[]): string[] | undefined {
  if (scope === 'all') return undefined
  if (scope === 'current') return undefined // 由后端根据 conversation 关联
  if (scope === 'custom') return selectedIds.length > 0 ? selectedIds : undefined
  return undefined
}

export const useChat = () => {
  const queryClient = useQueryClient()

  const {
    activeConversationId,
    conversations,
    messages,
    streaming,
    streamingMessage,
    streamingCitations,
    isRetrieving,
    streamError,
    contextScope,
    selectedSourceIds,
    setConversations,
    addConversation,
    updateConversation,
    removeConversation,
    setActiveConversationId,
    setMessages,
    addMessage,
    updateMessage,
    setStreaming,
    setStreamingMessage,
    appendStreamingToken,
    setStreamingCitations,
    setIsRetrieving,
    setStreamError,
    resetStream,
    setContextScope,
    setSelectedSourceIds,
  } = useChatStore()

  const abortControllerRef = useRef<AbortController | null>(null)

  // 列出会话
  const conversationsQuery = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      const list = await chatApi.listConversations()
      setConversations(list)
      return list
    },
    refetchOnWindowFocus: false,
    retry: retryOnlyNetwork,
  })

  // 加载消息
  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [] as ChatMessage[]
      const msgs = await chatApi.getMessages(activeConversationId, 50)
      setMessages(msgs)
      return msgs
    },
    enabled: !!activeConversationId,
    refetchOnWindowFocus: false,
    retry: retryOnlyNetwork,
  })

  // 创建会话
  const createConversationMutation = useMutation({
    mutationFn: (params: CreateConversationParams) => chatApi.createConversation(params),
    onSuccess: (conv) => {
      addConversation(conv)
      setActiveConversationId(conv.id)
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
    retry: retryOnlyNetwork,
  })

  // 流式发送消息（核心）
  const sendMessageMutation = useMutation({
    mutationFn: async (params: {
      content: string
      scenarioType?: string
    }): Promise<ChatSSECompleteResult> => {
      if (!activeConversationId) throw new Error('No active conversation')

      const contextSourceIds = computeContextSourceIds(contextScope, selectedSourceIds)

      // 重置流式状态
      resetStream()
      setStreaming(true)
      setStreamingMessage('')

      // 乐观添加 user 消息
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId: activeConversationId,
        role: 'user',
        content: params.content,
        toolCalls: null,
        citations: null,
        parentMessageId: null,
        isArchived: false,
        isPartial: false,
        feedback: null,
        langfuseTraceId: null,
        createdAt: new Date().toISOString(),
      }
      addMessage(tempUserMessage)

      abortControllerRef.current = new AbortController()

      try {
        const result = await chatApi.streamMessage(activeConversationId, {
          content: params.content,
          contextSourceIds,
          scenarioType: params.scenarioType,
          signal: abortControllerRef.current.signal,
          onToken: (token) => appendStreamingToken(token),
          onToolCall: () => {
            setIsRetrieving(true)
          },
          onCitation: (citations) => {
            setStreamingCitations(citations)
            setIsRetrieving(false)
          },
          onComplete: (completeResult) => {
            const assistantMessage: ChatMessage = {
              id: `msg-${Date.now()}`,
              conversationId: activeConversationId,
              role: 'assistant',
              content: completeResult.content,
              toolCalls: completeResult.toolCalls,
              citations: completeResult.citations,
              parentMessageId: tempUserMessage.id,
              isArchived: false,
              isPartial: false,
              feedback: null,
              langfuseTraceId: null,
              createdAt: new Date().toISOString(),
            }
            addMessage(assistantMessage)
          },
          onError: (error) => {
            setStreamError(error.message)
          },
        })

        return result
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Chat stream failed'
        setStreamError(msg)
        console.error('[useChat] streamMessage error:', error)
        throw error
      } finally {
        setStreaming(false)
        setIsRetrieving(false)
        abortControllerRef.current = null
      }
    },
  })

  // 中断流
  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStreaming(false)
    setIsRetrieving(false)
  }, [setStreaming, setIsRetrieving])

  // 重命名
  const renameConversationMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      chatApi.renameConversation(id, title),
    onSuccess: (conv) => {
      updateConversation(conv.id, conv)
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
    retry: retryOnlyNetwork,
  })

  // 删除
  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: (_, id) => {
      removeConversation(id)
      if (activeConversationId === id) setActiveConversationId(null)
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
    retry: retryOnlyNetwork,
  })

  // 反馈
  const sendFeedbackMutation = useMutation({
    mutationFn: ({
      messageId,
      feedback,
    }: {
      messageId: string
      feedback: 'positive' | 'negative'
    }) => chatApi.sendFeedback(messageId, feedback),
    onSuccess: (_, { messageId, feedback }) => {
      updateMessage(messageId, { feedback })
    },
    retry: retryOnlyNetwork,
  })

  return {
    // state
    conversations,
    activeConversationId,
    messages,
    streaming,
    streamingMessage,
    streamingCitations,
    isRetrieving,
    streamError,
    contextScope,
    selectedSourceIds,
    loadingConversations: conversationsQuery.isLoading,
    loadingMessages: messagesQuery.isLoading,

    // actions
    createConversation: createConversationMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    abortStream,
    renameConversation: renameConversationMutation.mutate,
    deleteConversation: deleteConversationMutation.mutate,
    sendFeedback: sendFeedbackMutation.mutate,
    selectConversation: setActiveConversationId,
    setContextScope,
    setSelectedSourceIds,

    // mutation states
    isCreating: createConversationMutation.isPending,
    isSending: sendMessageMutation.isPending,
    isRenaming: renameConversationMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,
  }
}
