import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import {
  authHeaders,
  type ChatSSECompleteResult,
  type CreateConversationParams,
  chatApi,
} from '../services/chatApi'
import { useChatStore } from '../stores/useChatStore'
import { useModelConfigStore } from '../stores/useModelConfigStore'
import { useSourceStore } from '../stores/useSourceStore'
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

export const useChat = (taskId?: string) => {
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

  // 获取当前任务的素材列表，用于自动绑定到新对话
  const taskSources = useSourceStore((s) => s.sources)

  const abortControllerRef = useRef<AbortController | null>(null)

  // 列出会话（按 taskId 过滤）
  // 仅在 taskId 存在时查询，避免初始空查询
  const conversationsQuery = useQuery({
    queryKey: ['chat', 'conversations', taskId],
    queryFn: async () => {
      const list = await chatApi.listConversations(taskId ? { taskId } : undefined)
      setConversations(list)
      return list
    },
    enabled: !!taskId,
    refetchOnWindowFocus: false,
    retry: retryOnlyNetwork,
    staleTime: 30 * 1000,
  })

  // taskId 变化时，如果当前活跃会话不属于该任务，则重置
  useEffect(() => {
    if (!activeConversationId) return
    const activeConv = conversations.find((c) => c.id === activeConversationId)
    if (!activeConv) return
    const belongs = taskId ? activeConv.taskId === taskId : !activeConv.taskId
    if (!belongs) {
      setActiveConversationId(null)
      setMessages([])
    }
  }, [taskId, conversations, activeConversationId, setActiveConversationId, setMessages])

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
    staleTime: 10 * 1000,
  })

  // 创建会话
  const createConversationMutation = useMutation({
    mutationFn: (params: CreateConversationParams) => chatApi.createConversation(params),
    onSuccess: (conv) => {
      addConversation(conv)
      setActiveConversationId(conv.id)
      queryClient.setQueryData(['chat', 'conversations', taskId], (prev: unknown) => {
        const list = Array.isArray(prev) ? prev : []
        return [conv, ...list]
      })
    },
    retry: retryOnlyNetwork,
  })

  // 生成对话标题
  const generateTitle = async (content: string, scenarioType?: string): Promise<string> => {
    try {
      const aiConfig = useModelConfigStore.getState().getAIConfig()
      const response = await fetch('/api/chat/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          content,
          scenarioType,
          ...(aiConfig ? { aiConfig } : {}),
        }),
      })
      if (response.ok) {
        const data = await response.json()
        return data.title || content.slice(0, 30)
      }
    } catch {
      // fallback
    }
    return content.slice(0, 30) || '新对话'
  }

  // 流式发送消息（核心）
  const sendMessageMutation = useMutation({
    mutationFn: async (params: {
      content: string
      scenarioType?: string
    }): Promise<ChatSSECompleteResult> => {
      console.log('[useChat] sendMessage 开始:', {
        content: params.content,
        scenarioType: params.scenarioType,
        activeConversationId,
        contextScope,
        selectedSourceIds,
      })

      let conversationId = activeConversationId
      let isNewConversation = false

      // 首次发送：自动创建会话
      if (!conversationId) {
        console.log('[useChat] 首次发送，创建新会话')
        const sourceIds = taskSources.map((s) => s.id)
        const newConv = await chatApi.createConversation({
          taskId,
          title: params.content.slice(0, 30) || '新对话',
          scenarioType: params.scenarioType,
          sourceIds: sourceIds.length > 0 ? sourceIds : undefined,
        })
        addConversation(newConv)
        setActiveConversationId(newConv.id)
        conversationId = newConv.id
        isNewConversation = true
        queryClient.setQueryData(['chat', 'conversations', taskId], (prev: unknown) => {
          const list = Array.isArray(prev) ? prev : []
          return [newConv, ...list]
        })
        console.log('[useChat] 新会话创建成功:', conversationId)
      }

      const contextSourceIds = computeContextSourceIds(contextScope, selectedSourceIds)
      console.log('[useChat] 计算上下文范围:', { contextScope, contextSourceIds })

      // 重置流式状态
      resetStream()
      setStreaming(true)
      setStreamingMessage('')
      console.log('[useChat] 流式状态已重置，开始发送消息')

      // 乐观添加 user 消息
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId,
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
        const result = await chatApi.streamMessage(conversationId, {
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
          onComplete: async (completeResult) => {
            const assistantMessage: ChatMessage = {
              id: `msg-${Date.now()}`,
              conversationId,
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

            if (isNewConversation) {
              try {
                const newTitle = await generateTitle(params.content, params.scenarioType)
                if (newTitle && newTitle !== (params.content.slice(0, 30) || '新对话')) {
                  renameConversationMutation.mutate({ id: conversationId, title: newTitle })
                }
              } catch {
                // ignore
              }
            }
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
      queryClient.setQueryData(['chat', 'conversations', taskId], (prev: unknown) => {
        const list = Array.isArray(prev) ? prev : []
        return list.map((c: any) => (c.id === conv.id ? { ...c, ...conv } : c))
      })
    },
    retry: retryOnlyNetwork,
  })

  // 删除
  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: (_, id) => {
      removeConversation(id)
      if (activeConversationId === id) setActiveConversationId(null)
      queryClient.setQueryData(['chat', 'conversations', taskId], (prev: unknown) => {
        const list = Array.isArray(prev) ? prev : []
        return list.filter((c: any) => c.id !== id)
      })
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
    resetStream,
    renameConversation: renameConversationMutation.mutate,
    deleteConversation: deleteConversationMutation.mutate,
    sendFeedback: sendFeedbackMutation.mutate,
    selectConversation: setActiveConversationId,
    setContextScope,
    setSelectedSourceIds,
    updateMessage,

    // mutation states
    isCreating: createConversationMutation.isPending,
    isSending: sendMessageMutation.isPending,
    isRenaming: renameConversationMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,
  }
}
