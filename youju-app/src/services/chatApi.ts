import { readSSEStream } from '../lib/sseParser'
import type {
  ChatCitation,
  ChatMemory,
  ChatMemoryCreated,
  ChatMessage,
  ChatToolCall,
  Conversation,
} from '../types'
import { apiClient } from './apiClient'
import { handleApiError } from './errorHandler'

export interface CreateConversationParams {
  title?: string
  scenarioType?: string
  sourceIds?: string[]
  contextSourceIds?: string[]
}

export interface ChatSSECompleteResult {
  content: string
  citations: ChatCitation[]
  toolCalls: ChatToolCall[]
  tokenPrompt: number
  tokenCompletion: number
  model: string
  isMock: boolean
}

export interface StreamMessageParams {
  content: string
  contextSourceIds?: string[]
  scenarioType?: string
  onInit?: (data: { conversationId: string; messageId?: string }) => void
  onToken?: (token: string) => void
  onToolCall?: (name: string, args: unknown) => void
  onCitation?: (citations: ChatCitation[]) => void
  onComplete?: (result: ChatSSECompleteResult) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

/**
 * 复用 apiClient 的鉴权头逻辑：从 localStorage 读取 token / sessionId，
 * 与 apiClient.request 中保持一致（else if 优先级）。
 */
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('youju_token')
  const sessionId = localStorage.getItem('youju_session_id')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else if (sessionId) {
    headers['X-Session-Id'] = sessionId
  }
  return headers
}

function defaultCompleteResult(): ChatSSECompleteResult {
  return {
    content: '',
    citations: [],
    toolCalls: [],
    tokenPrompt: 0,
    tokenCompletion: 0,
    model: '',
    isMock: false,
  }
}

export const chatApi = {
  async createConversation(params: CreateConversationParams): Promise<Conversation> {
    try {
      return await apiClient.post<Conversation>('/api/chat/conversations', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async listConversations(params?: { limit?: number; offset?: number }): Promise<Conversation[]> {
    try {
      const query = params ? `?limit=${params.limit || 20}&offset=${params.offset || 0}` : ''
      return await apiClient.get<Conversation[]>(`/api/chat/conversations${query}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async getMessages(conversationId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      const query = limit ? `?limit=${limit}` : ''
      return await apiClient.get<ChatMessage[]>(
        `/api/chat/conversations/${conversationId}/messages${query}`,
      )
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async renameConversation(conversationId: string, title: string): Promise<Conversation> {
    try {
      return await apiClient.request<Conversation>(`/api/chat/conversations/${conversationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/api/chat/conversations/${conversationId}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async sendFeedback(messageId: string, feedback: 'positive' | 'negative'): Promise<void> {
    try {
      await apiClient.post<void>(`/api/chat/messages/${messageId}/feedback`, { feedback })
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async streamMessage(
    conversationId: string,
    params: StreamMessageParams,
  ): Promise<ChatSSECompleteResult> {
    const response = await fetch(`/api/chat/conversations/${conversationId}/messages/stream`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        content: params.content,
        contextSourceIds: params.contextSourceIds,
        scenarioType: params.scenarioType,
      }),
      signal: params.signal,
    })

    if (!response.ok) {
      throw new Error(`Chat stream failed: ${response.status}`)
    }

    let result: ChatSSECompleteResult = defaultCompleteResult()

    await readSSEStream(
      response,
      (event) => {
        let data: unknown
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }
        switch (event.event) {
          case 'init': {
            const init = data as { conversationId: string; messageId?: string }
            params.onInit?.(init)
            break
          }
          case 'token': {
            const tokenEvt = data as { token: string }
            params.onToken?.(tokenEvt.token)
            break
          }
          case 'tool_call': {
            const toolEvt = data as { name: string; args: unknown }
            params.onToolCall?.(toolEvt.name, toolEvt.args)
            break
          }
          case 'citation': {
            const citationEvt = data as { citations: ChatCitation[] }
            params.onCitation?.(citationEvt.citations)
            break
          }
          case 'complete': {
            result = data as ChatSSECompleteResult
            params.onComplete?.(result)
            break
          }
          case 'error': {
            const errorEvt = data as { message: string }
            params.onError?.(new Error(errorEvt.message))
            break
          }
        }
      },
      params.signal,
    )

    return result
  },

  async regenerateMessage(
    messageId: string,
    params: Omit<StreamMessageParams, 'content'>,
  ): Promise<ChatSSECompleteResult> {
    const response = await fetch(`/api/chat/messages/${messageId}/regenerate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        contextSourceIds: params.contextSourceIds,
        scenarioType: params.scenarioType,
      }),
      signal: params.signal,
    })

    if (!response.ok) {
      throw new Error(`Chat regenerate failed: ${response.status}`)
    }

    let result: ChatSSECompleteResult = defaultCompleteResult()

    await readSSEStream(
      response,
      (event) => {
        let data: unknown
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }
        switch (event.event) {
          case 'init': {
            const init = data as { conversationId: string; messageId?: string }
            params.onInit?.(init)
            break
          }
          case 'token': {
            const tokenEvt = data as { token: string }
            params.onToken?.(tokenEvt.token)
            break
          }
          case 'tool_call': {
            const toolEvt = data as { name: string; args: unknown }
            params.onToolCall?.(toolEvt.name, toolEvt.args)
            break
          }
          case 'citation': {
            const citationEvt = data as { citations: ChatCitation[] }
            params.onCitation?.(citationEvt.citations)
            break
          }
          case 'complete': {
            result = data as ChatSSECompleteResult
            params.onComplete?.(result)
            break
          }
          case 'error': {
            const errorEvt = data as { message: string }
            params.onError?.(new Error(errorEvt.message))
            break
          }
        }
      },
      params.signal,
    )

    return result
  },

  // SubTask 22.5: 长期记忆 CRUD API（对应后端 /api/v1/chat/memory）
  async listMemories(): Promise<ChatMemory[]> {
    try {
      return await apiClient.get<ChatMemory[]>('/api/chat/memory')
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async createMemory(content: string): Promise<ChatMemoryCreated> {
    try {
      return await apiClient.post<ChatMemoryCreated>('/api/chat/memory', { content })
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async deleteMemory(id: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/api/chat/memory/${id}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },
}
