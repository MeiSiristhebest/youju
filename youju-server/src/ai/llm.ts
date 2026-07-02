import { aiRequestQueue } from './concurrencyLimiter.js'

export interface AIResponse {
  content: string
  tokenPrompt: number
  tokenCompletion: number
  model: string
}

export async function callAI(
  userPrompt: string,
  systemPrompt: string,
  retries: number = 2,
): Promise<AIResponse> {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo'

  if (!apiKey) {
    throw new Error('No AI API key configured')
  }

  // 通过请求队列限制并发，避免 API 调用超限
  return aiRequestQueue.run(() =>
    withRetry(async () => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(`AI API error: ${response.status} ${errText}`)
      }

      const data = await response.json()
      return {
        content: data.choices[0].message.content,
        tokenPrompt: data.usage?.prompt_tokens || 0,
        tokenCompletion: data.usage?.completion_tokens || 0,
        model: data.model || model,
      }
    }, retries),
  )
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
