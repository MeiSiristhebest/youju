import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAI } from '@ai-sdk/openai'
import { isStepCount, type LanguageModel, streamText } from 'ai'
import { z } from 'zod'
import type {
  AIChatPort,
  ChatCitation,
  ChatCompleteResult,
  ChatMessageInput,
  ChatStreamCallbacks,
  ChatStreamOptions,
  ChatToolCall,
  RetrievalQuery,
  RetrievalResult,
} from '../../domain/ports/aiPorts.js'
import { type AIConfig, callAI, type ModelProvider } from '../llm.js'
import { CURRENT_PROMPT_VERSION, getChatPrompt } from '../prompts/index.js'

/**
 * 默认 AIChatPort 实现：基于 Vercel AI SDK v7 streamText + tool（searchDocs）。
 *
 * - 通过 searchDocs 工具调用注入的 retrievalFn 实现检索增强
 * - 多轮工具调用通过 stopWhen: isStepCount(3) 控制
 * - 通过 experimental_telemetry 集成 Langfuse（若配置 LANGFUSE_SECRET）
 * - 未配置 API Key 时降级为 Mock 回答
 */
export class ChatAdapter implements AIChatPort {
  constructor(private readonly retrievalFn: (query: RetrievalQuery) => Promise<RetrievalResult>) {}

  async chatStream(
    messages: ChatMessageInput[],
    options: ChatStreamOptions,
    callbacks: ChatStreamCallbacks,
  ): Promise<ChatCompleteResult> {
    const apiKey = options.aiConfig?.apiKey || process.env.AI_API_KEY

    // SubTask 8.8: Mock 兜底
    if (!apiKey) {
      const mockContent =
        '（Mock 模式）当前未配置 AI API Key，无法执行真实对话。请配置 AI_API_KEY 环境变量后重试。'
      const mockResult: ChatCompleteResult = {
        content: mockContent,
        citations: [],
        toolCalls: [],
        tokenPrompt: 0,
        tokenCompletion: 0,
        model: 'mock',
        isMock: true,
      }
      callbacks.onToken?.(mockContent)
      callbacks.onComplete?.(mockResult)
      return mockResult
    }

    try {
      const model = createLanguageModel(options.aiConfig as AIConfig)
      const systemPrompt = buildSystemPrompt(options)
      const citations: ChatCitation[] = []
      const toolCalls: ChatToolCall[] = []

      const searchDocsTool = {
        description: '在用户上传的文档库中检索与问题相关的片段',
        inputSchema: z.object({
          query: z.string().describe('检索查询词'),
        }),
        execute: async (input: { query: string }): Promise<ChatCitation[]> => {
          const result = await this.retrievalFn({
            text: input.query,
            userId: options.userId,
            sessionId: options.sessionId,
            sourceFilter: options.contextSourceIds,
            topK: 20,
          })
          const items = result.items.map((item, idx) => {
            const citation: ChatCitation = {
              index: idx + 1,
              sourceId: item.chunk.sourceId,
              chunkId: item.chunk.id,
              quote: item.chunk.content.slice(0, 200),
              score: item.rerankScore ?? item.score,
              charOffsetStart: item.chunk.charOffsetStart,
              charOffsetEnd: item.chunk.charOffsetEnd,
            }
            return citation
          })
          for (const c of items) {
            citations.push(c)
          }
          callbacks.onCitation?.(items)
          return items
        },
      }

      const telemetry = process.env.LANGFUSE_SECRET
        ? {
            isEnabled: true,
            functionId: `chat-${options.conversationId}`,
            metadata: {
              userId: options.userId,
              sessionId: options.sessionId,
              conversationId: options.conversationId,
              messageId: options.messageId,
            },
          }
        : undefined

      const result = streamText({
        model,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        tools: { searchDocs: searchDocsTool },
        stopWhen: isStepCount(3),
        temperature: 0.3,
        maxOutputTokens: Number(process.env.CHAT_MAX_TOKENS) || 4096,
        abortSignal: options.abortSignal,
        experimental_telemetry: telemetry,
        onChunk: ({ chunk }) => {
          if (chunk.type === 'text-delta') {
            callbacks.onToken?.(chunk.text)
          }
        },
        onToolExecutionEnd: ({ toolCall, toolOutput }) => {
          const args = (toolCall as { input?: unknown }).input ?? toolCall
          const output =
            toolOutput.type === 'tool-result'
              ? (toolOutput as { output?: unknown }).output
              : undefined
          callbacks.onToolCall?.(toolCall.toolName, args)
          toolCalls.push({
            name: toolCall.toolName,
            args,
            result: output,
          })
        },
      })

      const [text, usage, response] = await Promise.all([
        result.text,
        result.usage,
        result.response,
      ])

      const completeResult: ChatCompleteResult = {
        content: text,
        citations,
        toolCalls,
        tokenPrompt: usage.inputTokens ?? 0,
        tokenCompletion: usage.outputTokens ?? 0,
        model: response.modelId || options.aiConfig?.model || 'unknown',
        isMock: false,
      }

      callbacks.onComplete?.(completeResult)
      return completeResult
    } catch (e) {
      const error = e as Error
      callbacks.onError?.(error)
      throw error
    }
  }

  async summarizeConversation(
    conversationText: string,
    aiConfig?: AIConfig,
  ): Promise<{ content: string; tokenPrompt: number; tokenCompletion: number; model: string }> {
    const systemPrompt =
      '你是一个对话总结助手。请用简洁的中文总结以下对话的核心内容，不超过 200 字。'
    const result = await callAI(conversationText, systemPrompt, 2, aiConfig)
    return {
      content: result.content,
      tokenPrompt: result.tokenPrompt,
      tokenCompletion: result.tokenCompletion,
      model: result.model,
    }
  }

  async generateConversationTitle(
    firstUserContent: string,
    aiConfig?: AIConfig,
  ): Promise<{ content: string; tokenPrompt: number; tokenCompletion: number; model: string }> {
    const systemPrompt =
      '你是一个标题生成助手。请根据用户的第一条消息，生成一个简洁的中文标题（不超过 20 字），只输出标题本身，不要任何前缀或解释。'
    const result = await callAI(firstUserContent, systemPrompt, 2, aiConfig)
    return {
      content: result.content.trim(),
      tokenPrompt: result.tokenPrompt,
      tokenCompletion: result.tokenCompletion,
      model: result.model,
    }
  }
}

function buildSystemPrompt(options: ChatStreamOptions): string {
  const { systemPrompt: rawPrompt } = getChatPrompt(CURRENT_PROMPT_VERSION)
  const scenarioContext = options.scenarioType ? `当前场景：${options.scenarioType}` : ''
  const injectionWarning = options.injectionWarning ?? ''
  const memoryContext = options.memoryContext ?? ''
  return rawPrompt
    .replaceAll('{{SCENARIO_CONTEXT}}', scenarioContext)
    .replaceAll('{{INJECTION_WARNING}}', injectionWarning)
    .replaceAll('{{MEMORY_CONTEXT}}', memoryContext)
}

/**
 * 根据 provider 创建对应的 AI SDK model 实例。
 * 与 llm.ts 中 createModel 行为保持一致，但独立实现以避免修改 llm.ts。
 */
function createLanguageModel(config: AIConfig): LanguageModel {
  const provider = (config.provider ?? 'openai') as ModelProvider
  const { apiKey, baseURL, model } = config

  switch (provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey, baseURL: baseURL || undefined })
      return anthropic(model) as LanguageModel
    }
    case 'deepseek': {
      const deepseek = createDeepSeek({ apiKey, baseURL: baseURL || undefined })
      return deepseek(model) as LanguageModel
    }
    default: {
      const openai = createOpenAI({ apiKey, baseURL: baseURL || undefined })
      return openai(model) as LanguageModel
    }
  }
}
