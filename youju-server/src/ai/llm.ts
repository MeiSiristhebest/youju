import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { EmbeddingResult } from '../domain/ports/aiPorts.js'
import { EmbeddingAdapter, embeddingAdapter } from './adapters/embeddingAdapter.js'
import { aiRequestQueue } from './concurrencyLimiter.js'

export interface AIResponse {
  content: string
  tokenPrompt: number
  tokenCompletion: number
  model: string
}

// ModelProvider 与 AIConfig 已迁移至 domain/types.ts（消除 domain ports 反向依赖）
// 此处 import 供本文件内部使用，re-export 保持 ai 内部代码 import 兼容
import type { AIConfig } from '../domain/types.js'

export type { AIConfig, ModelProvider } from '../domain/types.js'

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

/**
 * 指数退避重试：delay = baseDelayMs * 2 ** attempt（默认 1s / 2s / 4s）。
 * 独立于 withRetry，避免修改 callAI 已有的线性退避行为。
 */
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e as Error
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError || new Error('All retries failed')
}

/**
 * 调用 Embedding 服务，复用 aiRequestQueue 限流，失败按指数退避重试 3 次（1s / 2s / 4s）。
 * 未配置 config 时使用全局 embeddingAdapter 单例（读取 EMBEDDING_* 环境变量）。
 */
export async function callEmbedding(
  texts: string[],
  config?: { baseURL?: string; apiKey?: string; model?: string },
): Promise<EmbeddingResult[]> {
  const adapter = config ? new EmbeddingAdapter(config) : embeddingAdapter

  return aiRequestQueue.run(() => retryWithExponentialBackoff(() => adapter.embed(texts), 3, 1000))
}
