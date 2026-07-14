import { generateText } from 'ai'
import { createModel, isSystemMessageUnsupported } from '../../ai/utils/modelFactory.js'
import type { ProviderHealth, ProviderWithHealth } from '../../domain/ports/providerRegistry.js'
import type { AIConfig } from '../../domain/types.js'
import { getEnv } from '../env.js'

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

    const needsCompat = isSystemMessageUnsupported(this.config.provider)
    const messages = needsCompat
      ? [{ role: 'user' as const, content: `${params.system}\n\n${params.user}` }]
      : [
          { role: 'system' as const, content: params.system },
          { role: 'user' as const, content: params.user },
        ]

    const { text, usage, response } = await generateText({
      model,
      messages,
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
        system: '你是一个简洁的助手。',
        user: '回复 pong，只需要一个单词。',
        maxOutputTokens: 50,
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(getEnv().AI_TEST_CONNECTION_TIMEOUT_MS),
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
  const env = getEnv()
  const apiKey = env.AI_API_KEY ?? ''
  if (!apiKey) {
    return null
  }

  const config: AIConfig = {
    provider: env.AI_PROVIDER,
    apiKey,
    baseURL: env.AI_BASE_URL,
    model: env.AI_MODEL,
  }

  return new DefaultLLMProvider('default', config)
}
