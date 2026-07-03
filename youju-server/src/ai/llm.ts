import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { aiRequestQueue } from './concurrencyLimiter.js'

export interface AIResponse {
  content: string
  tokenPrompt: number
  tokenCompletion: number
  model: string
}

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'zhipu'
  | 'moonshot'
  | 'qwen'
  | 'custom'

export interface AIConfig {
  provider?: ModelProvider
  apiKey: string
  baseURL: string
  model: string
}

function getDefaultConfig(): AIConfig {
  return {
    provider: 'openai',
    apiKey: process.env.AI_API_KEY || '',
    baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
  }
}

/**
 * 根据 provider 类型创建对应的 AI SDK model 实例。
 * openai/zhipu/moonshot/qwen/custom 都走 OpenAI 兼容协议，
 * anthropic 走原生 Anthropic SDK，deepseek 走 DeepSeek SDK。
 */
function createModel(config: AIConfig) {
  const { provider, apiKey, baseURL, model } = config

  switch (provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey,
        baseURL: baseURL || undefined,
      })
      return anthropic(model)
    }

    case 'deepseek': {
      const deepseek = createDeepSeek({
        apiKey,
        baseURL: baseURL || undefined,
      })
      return deepseek(model)
    }

    case 'openai':
    case 'zhipu':
    case 'moonshot':
    case 'qwen':
    case 'custom':
    default: {
      // 所有 OpenAI 兼容的 provider 都走 createOpenAI
      const openai = createOpenAI({
        apiKey,
        baseURL: baseURL || undefined,
      })
      return openai(model)
    }
  }
}

export async function callAI(
  userPrompt: string,
  systemPrompt: string,
  retries: number = 2,
  config?: AIConfig,
): Promise<AIResponse> {
  const cfg = config || getDefaultConfig()

  if (!cfg.apiKey) {
    throw new Error('No AI API key configured')
  }

  const model = createModel(cfg)

  return aiRequestQueue.run(() =>
    withRetry(async () => {
      const { text, usage, response } = await generateText({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      })

      return {
        content: text,
        tokenPrompt: usage?.inputTokens || 0,
        tokenCompletion: usage?.outputTokens || 0,
        model: response?.modelId || cfg.model,
      }
    }, retries),
  )
}

export async function testModelConnection(config: AIConfig): Promise<{
  success: boolean
  model: string
  latencyMs: number
  error?: string
}> {
  const startTime = Date.now()
  try {
    const model = createModel(config)

    const { text } = await generateText({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "pong" in one word.' },
      ],
      maxOutputTokens: 10,
      temperature: 0,
      abortSignal: AbortSignal.timeout(15000),
    })

    // 确保模型确实返回了内容
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        model: config.model,
        latencyMs: Date.now() - startTime,
        error: '模型返回了空响应',
      }
    }

    return {
      success: true,
      model: config.model,
      latencyMs: Date.now() - startTime,
    }
  } catch (e) {
    return {
      success: false,
      model: config.model,
      latencyMs: Date.now() - startTime,
      error: (e as Error).message,
    }
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e as Error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
      }
    }
  }
  throw lastError || new Error('All retries failed')
}
