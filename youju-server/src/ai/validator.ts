import type { AIRawOutput } from '../domain/types.js'

/**
 * 宽松 JSON 提取：仅做 JSON.parse + 提取，不做 schema 验证。
 * 用于分步 AI 调用（每步输出 schema 不同，无法用统一的 validateSchema）。
 * 返回 any，由调用方按步骤专属 schema 处理。
 *
 * 支持多种 AI 响应格式：
 * 1. 纯 JSON 字符串
 * 2. markdown 代码块包裹的 JSON（```json ... ```）
 * 3. 前后有额外文本的 JSON
 * 4. 多语言响应中的 JSON 部分
 */
export function extractJSON(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== 'string') {
    return null
  }

  let cleaned = text.trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    /* continue to extraction attempt */
  }

  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    /* continue */
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch {
      /* continue */
    }
  }

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1)
    try {
      const parsed = JSON.parse(jsonCandidate)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch {
      /* continue */
    }
  }

  return null
}

export function extractAndValidateJSON(text: string): AIRawOutput | null {
  const extracted = extractJSON(text)
  if (extracted && validateSchema(extracted)) {
    return extracted
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
