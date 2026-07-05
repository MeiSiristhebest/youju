import { createTenantContext, type TenantContext } from '../context/tenantContext.js'
import type {
  AIChatPort,
  ChatCompleteResult,
  ChatMessageInput,
  ChatStreamCallbacks,
} from '../ports/aiPorts.js'
import type { ConversationRepository, MessageRepository } from '../ports/repositories.js'
import {
  buildInjectionWarning,
  detectInjection,
  type InjectionDetectionResult,
} from '../rules/chatRules.js'
import type { AIConfig, ChatMessage, Conversation, MessageFeedback } from '../types.js'
import type { MemoryService } from './memoryService.js'

const HISTORY_LIMIT = 16
const HISTORY_ARCHIVE_THRESHOLD = 16
const SUMMARY_OLD_N = 8

export interface SendMessageOptions {
  userId: number | null
  sessionId: string | null
  scenarioType?: string
  contextSourceIds?: string[]
  aiConfig?: AIConfig
  abortSignal?: AbortSignal
}

export type SendMessageCallbacks = ChatStreamCallbacks & {
  onInit?: (data: { conversationId: string; userMessageId: string }) => void
}

export interface CreateConversationInput {
  userId: number | null
  sessionId: string | null
  title?: string
  scenarioType?: string
  sourceIds?: string[]
  contextSourceIds?: string[]
}

function buildTenantCtx(userId: number | null, sessionId: string | null): TenantContext {
  return createTenantContext(userId, sessionId)
}

export class ChatService {
  constructor(
    private readonly chatPort: AIChatPort,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly memoryService: MemoryService | null,
  ) {}

  async sendMessage(
    conversationId: string,
    content: string,
    options: SendMessageOptions,
    callbacks?: SendMessageCallbacks,
  ): Promise<ChatCompleteResult> {
    const { userId, sessionId } = options

    const injection = detectInjection(content)
    if (injection.detected && injection.severity === 'high') {
      return this.handleHighInjection(conversationId, content, callbacks)
    }

    const historyMessages = await this.messageRepo.findByConversationId(conversationId, {
      limit: HISTORY_LIMIT,
    })
    const recentMessages: ChatMessageInput[] = historyMessages
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }))

    const totalCount = await this.messageRepo.countByConversationId(conversationId)
    if (totalCount > HISTORY_ARCHIVE_THRESHOLD) {
      try {
        await this.summarizeHistory(conversationId, options.aiConfig)
      } catch (e) {
        console.error('[chatService] summarizeHistory failed:', e)
      }
    }

    const userMessage = await this.messageRepo.create({
      conversationId,
      role: 'user',
      content,
      parentMessageId: null,
    })

    callbacks?.onInit?.({ conversationId, userMessageId: userMessage.id })

    const injectionWarning =
      injection.detected && injection.severity === 'low' ? buildInjectionWarning() : ''

    const memoryContext = this.memoryService
      ? await this.memoryService.retrieveMemoryContext(content, userId, sessionId)
      : ''

    const result = await this.chatPort.chatStream(
      [...recentMessages, { role: 'user', content }],
      {
        userId,
        sessionId,
        conversationId,
        messageId: userMessage.id,
        scenarioType: options.scenarioType,
        contextSourceIds: options.contextSourceIds,
        aiConfig: options.aiConfig,
        abortSignal: options.abortSignal,
        injectionWarning,
        memoryContext,
      },
      callbacks || {},
    )

    const assistantMessage = await this.messageRepo.create({
      conversationId,
      role: 'assistant',
      content: result.content,
      toolCalls: result.toolCalls,
      citations: result.citations,
      parentMessageId: userMessage.id,
      langfuseTraceId: result.traceId ?? null,
    })

    if (options.abortSignal?.aborted) {
      await this.messageRepo.markPartial(assistantMessage.id, true)
    }

    void this.generateTitleIfDefault(conversationId, content, options).catch((e) => {
      console.error('[chatService] generateTitle failed:', e)
    })

    return result
  }

  private async handleHighInjection(
    conversationId: string,
    content: string,
    callbacks?: SendMessageCallbacks,
  ): Promise<ChatCompleteResult> {
    const userMessage = await this.messageRepo.create({
      conversationId,
      role: 'user',
      content,
      parentMessageId: null,
    })

    callbacks?.onInit?.({ conversationId, userMessageId: userMessage.id })

    const refuseContent = '检测到不安全输入，无法回答该问题。请重新描述您的问题。'
    await this.messageRepo.create({
      conversationId,
      role: 'assistant',
      content: refuseContent,
      parentMessageId: null,
    })
    const result: ChatCompleteResult = {
      content: refuseContent,
      citations: [],
      toolCalls: [],
      tokenPrompt: 0,
      tokenCompletion: 0,
      model: 'refused',
      isMock: false,
    }
    callbacks?.onComplete?.(result)
    return result
  }

  async summarizeHistory(conversationId: string, aiConfig?: AIConfig): Promise<void> {
    const allMessages = await this.messageRepo.findByConversationId(conversationId, {
      limit: 1000,
    })

    if (allMessages.length <= HISTORY_ARCHIVE_THRESHOLD) return

    const toArchive = allMessages.slice(0, SUMMARY_OLD_N)
    if (toArchive.length === 0) return

    const conversationText = toArchive.map((m) => `${m.role}: ${m.content}`).join('\n')

    let summary: string
    try {
      const result = await this.chatPort.summarizeConversation(conversationText, aiConfig)
      summary = result.content
    } catch (e) {
      console.error('[chatService] summarizeHistory failed:', e)
      return
    }

    for (const msg of toArchive) {
      await this.messageRepo.archive(msg.id)
    }

    await this.messageRepo.create({
      conversationId,
      role: 'system',
      content: `【历史对话摘要】${summary}`,
      parentMessageId: null,
    })
  }

  private async generateTitleIfDefault(
    conversationId: string,
    firstUserContent: string,
    options: SendMessageOptions,
  ): Promise<void> {
    const tenantCtx = buildTenantCtx(options.userId, options.sessionId)

    const conversation = await this.conversationRepo.findById(conversationId, tenantCtx)
    if (conversation?.title !== '新对话') {
      return
    }

    let newTitle: string
    try {
      const result = await this.chatPort.generateConversationTitle(
        firstUserContent.slice(0, 100),
        options.aiConfig,
      )
      newTitle = result.content.trim().slice(0, 50)
    } catch (e) {
      console.error('[chatService] generateTitle failed, fallback to text prefix:', e)
      newTitle = firstUserContent.slice(0, 20).trim() || '新对话'
    }

    await this.conversationRepo.updateTitle(conversationId, newTitle, tenantCtx)
  }

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    return this.conversationRepo.create({
      userId: input.userId !== null ? String(input.userId) : null,
      sessionId: input.sessionId,
      title: input.title,
      scenarioType: input.scenarioType ?? null,
      sourceIds: input.sourceIds,
      contextSourceIds: input.contextSourceIds,
    })
  }

  async listConversations(
    userId: number | null,
    sessionId: string | null,
    pagination?: { limit?: number; offset?: number },
  ): Promise<Conversation[]> {
    return this.conversationRepo.list(
      userId !== null ? String(userId) : null,
      sessionId,
      pagination,
    )
  }

  async getConversation(id: string, tenantCtx: TenantContext): Promise<Conversation | null> {
    return this.conversationRepo.findById(id, tenantCtx)
  }

  async renameConversation(
    id: string,
    title: string,
    tenantCtx: TenantContext,
  ): Promise<Conversation | null> {
    return this.conversationRepo.updateTitle(id, title, tenantCtx)
  }

  async deleteConversation(id: string, tenantCtx: TenantContext): Promise<boolean> {
    return this.conversationRepo.softDelete(id, tenantCtx)
  }

  async getMessages(
    conversationId: string,
    pagination?: { limit?: number; offset?: number },
  ): Promise<ChatMessage[]> {
    return this.messageRepo.findByConversationId(conversationId, pagination)
  }

  async getMessageById(messageId: string): Promise<ChatMessage | null> {
    return this.messageRepo.findById(messageId)
  }

  async updateMessageFeedback(messageId: string, feedback: MessageFeedback): Promise<boolean> {
    return this.messageRepo.updateFeedback(messageId, feedback)
  }
}

export type { InjectionDetectionResult }
