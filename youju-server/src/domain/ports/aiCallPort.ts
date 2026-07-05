import type { AIConfig } from '../../ai/llm.js'

export interface AIResponse {
  content: string
  model: string
  tokenPrompt: number
  tokenCompletion: number
  reasoningContent?: string
}

export interface AICallOptions {
  temperature?: number
  maxTokens?: number
  aiConfig?: AIConfig
}

export interface AICaller {
  call(userPrompt: string, systemPrompt: string, options?: AICallOptions): Promise<AIResponse>
}

export interface ValidatedAIResult<T> {
  data: T
  rawOutput: string
  model: string
  tokenPrompt: number
  tokenCompletion: number
}

export interface ValidatingAICaller extends AICaller {
  callWithValidation<T>(
    userPrompt: string,
    systemPrompt: string,
    validator: (raw: string) => T | null,
    options?: AICallOptions & { maxRetries?: number },
  ): Promise<ValidatedAIResult<T>>
}
