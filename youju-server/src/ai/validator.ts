import type { AIRawOutput } from '../domain/types.js'

export function extractAndValidateJSON(text: string): AIRawOutput | null {
  try {
    const parsed = JSON.parse(text)
    if (validateSchema(parsed)) {
      return parsed
    }
  } catch {
    /* continue to extraction attempt */
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (validateSchema(parsed)) {
        return parsed
      }
    } catch {
      /* continue */
    }
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
