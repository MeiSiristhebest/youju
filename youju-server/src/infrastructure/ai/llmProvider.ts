import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { ProviderHealth, ProviderWithHealth } from '../../domain/ports/providerRegistry.js'
import type { AIConfig, ModelProvider } from '../../domain/types.js'

export interface LLMProvider extends ProviderWithHealth {
  readonly id: string
  readonly config: AIConfig
  generateText(params: {
    system: string
    user: string
    temperature?: number
    maxOutputTokens?: number
    abortSignal?: AbortSignal
  }): Promise<{
    text: string
    inputTokens: number
    outputTokens: number
    modelId: string
  }>
}

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
      const openai = createOpenAI({
        apiKey,
        baseURL: baseURL || undefined,
      })
      return openai(model)
    }
  }
}

export class DefaultLLMProvider implements LLMProvider {
  readonly id: string
  readonly config: AIConfig

  constructor(id: string, config: AIConfig) {
    this.id = id
    this.config = config
  }

  async generateText(params: {
    system: string
    user: string
    temperature?: number
    maxOutputTokens?: number
    abortSignal?: AbortSignal
  }): Promise<{
    text: string
    inputTokens: number
    outputTokens: number
    modelId: string
  }> {
    const model = createModel(this.config)
    const { text, usage, response } = await generateText({
      model,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      temperature: params.temperature ?? 0.2,
      maxOutputTokens: params.maxOutputTokens,
      abortSignal: params.abortSignal,
    })

    return {
      text,
      inputTokens: usage?.inputTokens || 0,
      outputTokens: usage?.outputTokens || 0,
      modelId: response?.modelId || this.config.model,
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now()
    try {
      if (!this.config.apiKey) {
        return {
          healthy: false,
          error: 'No API key configured',
          lastCheckedAt: Date.now(),
        }
      }

      await this.generateText({
        system: 'You are a helpful assistant.',
        user: 'Say "pong" in one word.',
        maxOutputTokens: 10,
        temperature: 0,
        abortSignal: AbortSignal.timeout(15000),
      })

      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        lastCheckedAt: Date.now(),
      }
    } catch (e) {
      return {
        healthy: false,
        error: (e as Error).message,
        latencyMs: Date.now() - startTime,
        lastCheckedAt: Date.now(),
      }
    }
  }
}

export function createLLMProviderFromEnv(): LLMProvider | null {
  const apiKey = process.env.AI_API_KEY || ''
  if (!apiKey) {
    return null
  }

  const config: AIConfig = {
    provider: (process.env.AI_PROVIDER as ModelProvider) || 'openai',
    apiKey,
    baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
  }

  return new DefaultLLMProvider('default', config)
}
