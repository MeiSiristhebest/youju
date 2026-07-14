import crypto from 'node:crypto'
import { generateText } from 'ai'
import type { EmbeddingResult, PromptCacheLike } from '../domain/ports/aiPorts.js'
import {
  ANTHROPIC_FALLBACK_MODELS,
  GEMINI_FALLBACK_MODELS,
} from '../domain/registry/modelRegistry.js'
import type { AIConfig } from '../domain/types.js'
import { getEnv } from '../infrastructure/env.js'
import { EmbeddingAdapter, embeddingAdapter } from './adapters/embeddingAdapter.js'
import { aiRequestQueue } from './concurrencyLimiter.js'
import type { PromptCache } from './promptCache.js'
import { createModel } from './utils/modelFactory.js'

export interface AIResponse {
  content: string
  tokenPrompt: number
  tokenCompletion: number
  model: string
}

export type { AIConfig, ModelProvider } from '../domain/types.js'

function getDefaultConfig(): AIConfig {
  const env = getEnv()
  return {
    provider: 'openai',
    apiKey: env.AI_API_KEY ?? '',
    baseURL: env.AI_BASE_URL,
    model: env.AI_MODEL,
  }
}

function hashCacheKey(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16)
}

export async function callAI(
  userPrompt: string,
  systemPrompt: string,
  retries: number = 2,
  config?: AIConfig,
  cache?: {
    enabled: boolean
    cacheInstance: PromptCacheLike<{
      content: string
      tokenPrompt: number
      tokenCompletion: number
      model: string
    }>
  },
): Promise<AIResponse> {
  const cfg = config || getDefaultConfig()

  if (!cfg.apiKey) {
    throw new Error('No AI API key configured')
  }

  const cacheKey = hashCacheKey(`${systemPrompt}\n---\n${userPrompt}\n---\n${cfg.model}`)

  if (cache?.enabled) {
    const cached = cache.cacheInstance.get(cacheKey)
    if (cached) {
      const stats = (cache.cacheInstance as PromptCache).getStats?.()
      if (stats) {
        console.log(
          `[AI] Cache hit (hit rate: ${(stats.hitRate * 100).toFixed(1)}%, size: ${stats.size}/${stats.maxSize})`,
        )
      }
      return {
        content: cached.content,
        tokenPrompt: Math.ceil(cached.tokenPrompt * 0.1),
        tokenCompletion: cached.tokenCompletion,
        model: cached.model,
      }
    }
  }

  const result = await aiRequestQueue.run(() =>
    withRetry(async () => {
      try {
        const model = createModel(cfg)

        const { text, usage, response } = await generateText({
          model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: getEnv().AI_TEMPERATURE,
          maxOutputTokens: 8000,
          abortSignal: AbortSignal.timeout(getEnv().AI_CALL_TIMEOUT_MS),
        })

        if (!text.trim()) {
          throw new Error('模型返回了空响应')
        }

        return {
          content: text,
          tokenPrompt: usage?.inputTokens || 0,
          tokenCompletion: usage?.outputTokens || 0,
          model: response?.modelId || cfg.model,
        }
      } catch (e) {
        const err = e as Error
        console.error('[callAI] failed:', {
          message: err.message,
          name: err.name,
        })
        const msg = err.message || ''
        if (msg.includes('memory overloaded') || msg.includes('memory')) {
          throw new Error('AI 服务内存不足，请尝试减少材料长度或更换模型')
        }
        if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
          throw new Error('AI 服务请求频率超限，请稍后重试')
        }
        if (msg.includes('timeout') || msg.includes('aborted')) {
          throw new Error('AI 请求超时，请尝试减少材料长度或更换模型')
        }
        throw err
      }
    }, retries),
  )

  if (cache?.enabled) {
    cache.cacheInstance.set(cacheKey, result)
  }

  return result
}

export async function listModels(config: AIConfig): Promise<{ id: string; name?: string }[]> {
  const provider = config.provider as string | undefined
  const { apiKey, baseURL } = config

  if (provider === 'anthropic') {
    return ANTHROPIC_FALLBACK_MODELS
  }

  if (provider === 'gemini') {
    return GEMINI_FALLBACK_MODELS
  }

  try {
    const url = `${baseURL.replace(/\/$/, '')}/models`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }
    if (provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01'
    }
    const resp = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(getEnv().AI_LIST_MODELS_TIMEOUT_MS),
    })

    const respText = await resp.text()

    if (!resp.ok) {
      let errMsg = `HTTP ${resp.status}`
      try {
        const errorJson = JSON.parse(respText)
        if (errorJson.error?.message) {
          errMsg = errorJson.error.message
        } else if (errorJson.message) {
          errMsg = errorJson.message
        } else if (errorJson.msg) {
          errMsg = errorJson.msg
        } else {
          errMsg = `HTTP ${resp.status}: ${respText.slice(0, 200)}`
        }
      } catch {
        if (respText && respText.trim()) {
          errMsg = `HTTP ${resp.status}: ${respText.slice(0, 200)}`
        }
      }
      throw new Error(errMsg)
    }

    let data: any
    try {
      data = JSON.parse(respText)
    } catch {
      throw new Error(`响应不是有效的 JSON 格式（${respText.slice(0, 200)}）`)
    }

    let models: any[] = []
    const candidates = [data?.data, data?.models, data?.result, data?.items, data]

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        models = candidate
        break
      }
    }

    return models
      .map((m: any) => ({ id: m.id, name: m.name || m.id }))
      .filter((m: any) => m.id && typeof m.id === 'string')
      .sort((a: any, b: any) => a.id.localeCompare(b.id))
  } catch (e) {
    throw new Error(`获取模型列表失败: ${(e as Error).message}`)
  }
}

export async function testModelConnection(config: AIConfig): Promise<{
  success: boolean
  model: string
  latencyMs: number
  error?: string
}> {
  const startTime = Date.now()
  const { provider, model } = config

  try {
    const aiModel = createModel(config)

    const { text, response } = await generateText({
      model: aiModel,
      system: '你是一个简洁的助手。',
      messages: [{ role: 'user', content: '回复 pong，只需要一个单词。' }],
      temperature: 0.7,
      maxOutputTokens: 500,
      abortSignal: AbortSignal.timeout(getEnv().AI_TEST_CONNECTION_TIMEOUT_MS),
    })

    const latencyMs = Date.now() - startTime
    const modelId = response?.modelId || model

    if (!text.trim()) {
      return {
        success: false,
        model: modelId,
        latencyMs,
        error: '模型返回了空响应',
      }
    }

    return {
      success: true,
      model: modelId,
      latencyMs,
    }
  } catch (e) {
    const err = e as any
    let errMsg = err?.message || String(e)

    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      errMsg = `请求超时（${Math.round(getEnv().AI_TEST_CONNECTION_TIMEOUT_MS / 1000)}秒）`
    } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
      errMsg = `网络连接失败: ${err.message}`
    }

    return {
      success: false,
      model,
      latencyMs: Date.now() - startTime,
      error: errMsg,
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

  return aiRequestQueue.run(() =>
    retryWithExponentialBackoff(
      () => adapter.embed(texts),
      getEnv().EMBEDDING_RETRIES,
      getEnv().EMBEDDING_RETRY_BASE_DELAY_MS,
    ),
  )
}
