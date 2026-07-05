export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageFeedback = 'positive' | 'negative' | null
export type ContextScope = 'all' | 'current' | 'custom'

export interface Conversation {
  id: string
  userId: string | null
  sessionId: string | null
  title: string
  scenarioType: string | null
  sourceIds: string[]
  contextSourceIds: string[]
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatCitation {
  index: number
  sourceId: string
  sourceName?: string
  chunkId: string
  quote: string
  score: number
  charOffsetStart?: number
  charOffsetEnd?: number
}

export interface ChatToolCall {
  name: string
  args: unknown
  result?: unknown
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  toolCalls: ChatToolCall[] | null
  citations: ChatCitation[] | null
  parentMessageId: string | null
  isArchived: boolean
  isPartial: boolean
  feedback: MessageFeedback
  langfuseTraceId: string | null
  createdAt: string
}

// SubTask 22.5: 跨会话长期记忆类型（对应后端 ChatMemory）
export interface ChatMemory {
  id: string
  userId: string | null
  sessionId: string | null
  content: string
  embedding?: number[] | null
  createdAt: string
}

// POST /memory 仅返回 id/content/createdAt 三个字段
export type ChatMemoryCreated = Pick<ChatMemory, 'id' | 'content' | 'createdAt'>

// SSE 事件类型
export interface ChatSSEInitEvent {
  conversationId: string
  messageId?: string
}

export interface ChatSSETokenEvent {
  token: string
}

export interface ChatSSEToolCallEvent {
  name: string
  args: unknown
}

export interface ChatSSECitationEvent {
  citations: ChatCitation[]
}

export interface ChatSSECompleteEvent {
  content: string
  citations: ChatCitation[]
  toolCalls: ChatToolCall[]
  tokenPrompt: number
  tokenCompletion: number
  model: string
  isMock: boolean
}

export interface ChatSSEErrorEvent {
  message: string
}

export type ChatStreamEvent =
  | { event: 'init'; data: ChatSSEInitEvent }
  | { event: 'token'; data: ChatSSETokenEvent }
  | { event: 'tool_call'; data: ChatSSEToolCallEvent }
  | { event: 'citation'; data: ChatSSECitationEvent }
  | { event: 'complete'; data: ChatSSECompleteEvent }
  | { event: 'error'; data: ChatSSEErrorEvent }
