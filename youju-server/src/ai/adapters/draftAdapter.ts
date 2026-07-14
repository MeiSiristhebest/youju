import type { AIDraftPort, Evidence } from '../../domain/types.js'
import { getEnv } from '../../infrastructure/env.js'
import { callAI } from '../llm.js'
import { mockGenerateDraft } from '../mock.js'
import { draftCache } from '../promptCache.js'
import {
  buildDraftUserPrompt,
  CURRENT_PROMPT_VERSION,
  getDraftSystemPrompt,
} from '../prompts/index.js'

export class DraftAdapter implements AIDraftPort {
  async generateDraft(
    risk: {
      title: string
      description: string
      evidence: Evidence[]
    },
    context?: string,
    stylePref?: {
      formality?: number
      friendliness?: number
      conciseness?: number
      preferredTone?: string
    },
  ): Promise<string> {
    const apiKey = getEnv().AI_API_KEY

    if (!apiKey) {
      return mockGenerateDraft(risk)
    }

    const userPrompt = buildDraftUserPrompt(
      {
        riskTitle: risk.title,
        riskDescription: risk.description,
        evidence: risk.evidence,
        context,
        stylePref,
      },
      CURRENT_PROMPT_VERSION,
    )

    try {
      const aiResponse = await callAI(
        userPrompt,
        getDraftSystemPrompt(CURRENT_PROMPT_VERSION),
        1,
        undefined,
        { enabled: true, cacheInstance: draftCache },
      )
      return aiResponse.content
    } catch (e) {
      console.log('[AI] Draft generation failed:', (e as Error).message)
      return mockGenerateDraft(risk)
    }
  }
}

export const draftAdapter = new DraftAdapter()
