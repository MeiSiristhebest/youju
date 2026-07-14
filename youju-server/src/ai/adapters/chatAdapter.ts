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
import { getEnv } from '../../infrastructure/env.js'
import { type AIConfig, callAI } from '../llm.js'
import { draftCache } from '../promptCache.js'
import { CURRENT_PROMPT_VERSION, getChatPrompt } from '../prompts/index.js'
import { createModel } from '../utils/modelFactory.js'

/**
 * 默认 AIChatPort 实现：基于 Vercel AI SDK v7 streamText + tool（searchDocs）。
 *
 * - 通过 searchDocs 工具调用注入的 retrievalFn 实现检索增强
 * - 多轮工具调用通过 stopWhen: isStepCount(3) 控制
 * - 通过 experimental_telemetry 集成 Langfuse（若配置 LANGFUSE_SECRET）
 * - 未配置 API Key 时降级为 Mock 回答
 */
export class ChatAdapter implements AIChatPort {
  constructor(
    private readonly retrievalFn: (query: RetrievalQuery) => Promise<RetrievalResult>,
    /** 可选：批量查询 sourceId → sourceName 映射，用于填充 citation.sourceName */
    private readonly getSourceNamesByIds?: (
      ids: string[],
      userId: number | null,
      sessionId: string | null,
    ) => Promise<Map<string, string>>,
  ) {}

  async chatStream(
    messages: ChatMessageInput[],
    options: ChatStreamOptions,
    callbacks: ChatStreamCallbacks,
  ): Promise<ChatCompleteResult> {
    const apiKey = options.aiConfig?.apiKey || getEnv().AI_API_KEY

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

      for (let i = 0; i < mockContent.length; i += 5) {
        const chunk = mockContent.substring(i, Math.min(i + 5, mockContent.length))
        callbacks.onToken?.(chunk)
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

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
            topK: getEnv().CHAT_RETRIEVAL_TOP_K,
          })

          // 批量查询 sourceName，使前端引用标签能显示可读名称
          const sourceIds = [...new Set(result.items.map((item) => item.chunk.sourceId))]
          const nameMap =
            this.getSourceNamesByIds && sourceIds.length > 0
              ? await this.getSourceNamesByIds(sourceIds, options.userId, options.sessionId).catch(
                  () => new Map<string, string>(),
                )
              : new Map<string, string>()

          const items = result.items.map((item, idx) => {
            const citation: ChatCitation = {
              index: idx + 1,
              sourceId: item.chunk.sourceId,
              sourceName: nameMap.get(item.chunk.sourceId),
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

      const telemetry = getEnv().LANGFUSE_SECRET
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
        // 允许最多 6 步：确保工具调用后 AI 有足够轮次生成文字回答
        // (1 步工具调用 + 1 步文字生成 = 2 步；多次检索时仍留有余量)
        stopWhen: isStepCount(getEnv().CHAT_MAX_STEPS),
        temperature: getEnv().CHAT_TEMPERATURE,
        maxOutputTokens: getEnv().CHAT_MAX_TOKENS,
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

      let finalContent = text

      // 检测AI是否只返回了引用标记（如 "[1][2][3]"）而没有实际内容
      // 引用标记的模式：只包含数字、方括号、空格、换行
      const onlyCitationMarks =
        finalContent.trim() && /^[[\]\d\s\n,，.。、；;]*$/.test(finalContent)

      // P0 回退：如果 AI 只调用工具但未生成有意义的文字，且有检索结果，
      // 则基于 citations 生成一个摘要回答，避免只返回引用编号
      if ((!finalContent.trim() || onlyCitationMarks) && citations.length > 0) {
        // 按来源分组整理检索结果
        const sourceGroups: Record<string, { quotes: string[]; citations: ChatCitation[] }> = {}
        for (const c of citations) {
          const sourceName = c.sourceName || `来源${c.index}`
          if (!sourceGroups[sourceName]) {
            sourceGroups[sourceName] = { quotes: [], citations: [] }
          }
          sourceGroups[sourceName].quotes.push(c.quote.slice(0, 150))
          sourceGroups[sourceName].citations.push(c)
        }

        let summary = '根据检索到的文档内容，为您整理如下：\n\n'
        for (const [sourceName, group] of Object.entries(sourceGroups)) {
          summary += `【${sourceName}】\n`
          group.quotes.forEach((quote, idx) => {
            const citation = group.citations[idx]
            summary += `  ${citation ? `[${citation.index}]` : ''} ${quote}…\n`
          })
          summary += '\n'
        }
        summary += '如需更详细的分析，请具体描述您的问题。'

        finalContent = summary
        callbacks.onToken?.(finalContent)
      }

      const completeResult: ChatCompleteResult = {
        content: finalContent,
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
    const result = await callAI(conversationText, systemPrompt, 2, aiConfig, {
      enabled: true,
      cacheInstance: draftCache,
    })
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
    const result = await callAI(firstUserContent, systemPrompt, 2, aiConfig, {
      enabled: true,
      cacheInstance: draftCache,
    })
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

function createLanguageModel(config: AIConfig): LanguageModel {
  return createModel(config) as LanguageModel
}
