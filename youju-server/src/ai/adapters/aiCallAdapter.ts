import type {
  AICallOptions,
  AIResponse,
  ValidatedAIResult,
  ValidatingAICaller,
} from '../../domain/ports/aiCallPort.js'
import { callAI } from '../llm.js'

export class DefaultAICaller implements ValidatingAICaller {
  async call(
    userPrompt: string,
    systemPrompt: string,
    options?: AICallOptions,
  ): Promise<AIResponse> {
    const response = await callAI(
      userPrompt,
      systemPrompt,
      options?.temperature || 0.7,
      options?.aiConfig,
    )
    return {
      content: response.content,
      model: response.model,
      tokenPrompt: response.tokenPrompt,
      tokenCompletion: response.tokenCompletion,
    }
  }

  async callWithValidation<T>(
    userPrompt: string,
    systemPrompt: string,
    validator: (raw: string) => T | null,
    options?: AICallOptions & { maxRetries?: number },
  ): Promise<ValidatedAIResult<T>> {
    const maxRetries = options?.maxRetries ?? 2
    let _lastError: Error | null = null
    let _lastRaw = ''

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await this.call(userPrompt, systemPrompt, options)
      _lastRaw = response.content
      const validated = validator(response.content)

      if (validated) {
        return {
          data: validated,
          rawOutput: response.content,
          model: response.model,
          tokenPrompt: response.tokenPrompt,
          tokenCompletion: response.tokenCompletion,
        }
      }

      _lastError = new Error('Validation failed')
    }

    throw new Error(`AI validation failed after ${maxRetries + 1} attempts`)
  }
}

export const defaultAICaller = new DefaultAICaller()
