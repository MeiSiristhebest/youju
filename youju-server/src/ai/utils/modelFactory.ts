import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { AIConfig } from '../../domain/types.js'

export function isSystemMessageUnsupported(provider?: string): boolean {
  return provider === 'volcengine' || provider === 'spark' || provider === 'gemini'
}

export function createModel(config: AIConfig) {
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

    case 'gemini': {
      const google = createGoogleGenerativeAI({
        apiKey,
        baseURL: baseURL || undefined,
      })
      return google(model)
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
