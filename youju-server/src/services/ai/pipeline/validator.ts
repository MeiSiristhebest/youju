// ============================================================
// 有据 AI - Schema 校验 & 输出解析
// ============================================================

import type { AIRawOutput } from '../types'

export function extractAndValidateJSON(text: string): AIRawOutput | null {
  try {
    const parsed = JSON.parse(text)
    if (validateSchema(parsed)) {
      return parsed
    }
  } catch { /* continue to extraction attempt */ }

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (validateSchema(parsed)) {
        return parsed
      }
    } catch { /* continue */ }
  }

  return null
}

function validateSchema(obj: any): obj is AIRawOutput {
  if (!obj || typeof obj !== 'object') return false
  if (obj.error) return true
  if (!Array.isArray(obj.risks)) return false
  if (!Array.isArray(obj.extracted_entities)) return false
  if (!Array.isArray(obj.checklist)) return false

  for (const risk of obj.risks) {
    if (!risk.dimension || !risk.type || !risk.level || !risk.title) return false
    if (!Array.isArray(risk.evidence)) return false
    for (const ev of risk.evidence) {
      if (!ev.sourceName || !ev.quote) return false
    }
  }

  return true
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e as Error
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
      }
    }
  }
  throw lastError || new Error('All retries failed')
}
