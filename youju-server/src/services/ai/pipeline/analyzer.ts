// ============================================================
// 有据 AI - 核心分析流水线
// 三阶段：场景理解 → 维度发现 → 交叉核验
// ============================================================

import type { Source, AnalyzeResult, Risk } from '../types'
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '../prompts/analysis'
import { DRAFT_SYSTEM_PROMPT, buildDraftUserPrompt } from '../prompts/draft'
import { extractAndValidateJSON, withRetry } from './validator'
import { computeRiskRelations, categorizeEntities } from '../utils/relations'
import { mockAnalyze, mockGenerateDraft } from '../utils/mock'

interface AIResponse {
  content: string
  tokenPrompt: number
  tokenCompletion: number
  model: string
}

async function callAI(
  userPrompt: string,
  systemPrompt: string,
  retries: number = 2
): Promise<AIResponse> {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo'

  if (!apiKey) {
    throw new Error('No AI API key configured')
  }

  return withRetry(async () => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
  }, retries)
}

export async function analyzeSources(
  sources: Source[],
  scenarioType?: string,
  scenarioKnowledge?: Array<{ dimension: string; riskType: string; frequency: number; avgConfidence: number }>
): Promise<AnalyzeResult> {
  const userPrompt = buildAnalysisUserPrompt(sources, scenarioType, scenarioKnowledge)
  const systemPrompt = ANALYSIS_SYSTEM_PROMPT

  try {
    const aiResponse = await callAI(userPrompt, systemPrompt)
    const response = aiResponse.content
    const parsed = extractAndValidateJSON(response)

    if (!parsed) {
      console.log('[AI] Output schema validation failed, falling back to mock')
      return mockAnalyze(sources)
    }

    if ((parsed as any).error) {
      console.log('[AI] Analysis error:', (parsed as any).error, (parsed as any).details)
      return mockAnalyze(sources)
    }

    const risks: Risk[] = parsed.risks.map((r, i) => ({
      id: `r${i + 1}`,
      dimension: r.dimension,
      type: r.type,
      level: r.level,
      title: r.title,
      description: r.description,
      sources: [...new Set(r.evidence.map(e => e.sourceName))],
      evidence: r.evidence.map(e => ({
        sourceName: e.sourceName,
        sourceType: e.sourceType,
        quote: e.quote,
        confidence: e.confidence,
      })),
    }))

    const checklist = parsed.checklist.map((c, i) => ({
      id: `t${i + 1}`,
      text: c.text,
      hasDraft: true,
    }))

    const summary = {
      critical: risks.filter(r => r.level === 'critical').length,
      warning: risks.filter(r => r.level === 'warning').length,
      info: risks.filter(r => r.level === 'info').length,
      total: risks.length,
    }

    const extractedEntities = categorizeEntities(parsed.extracted_entities)
    const riskRelations = computeRiskRelations(risks, sources)

    return {
      summary,
      scenario: parsed.scenario ? {
        type: parsed.scenario.type,
        description: parsed.scenario.description,
        keyDimensions: parsed.scenario.key_dimensions,
      } : undefined,
      risks,
      checklist,
      alignedVersion: parsed.aligned_version,
      extractedEntities,
      riskRelations,
      reasoningTrace: parsed.reasoning_trace,
      uncertainties: parsed.uncertainties,
      debugInfo: {
        model: aiResponse.model,
        tokenPrompt: aiResponse.tokenPrompt,
        tokenCompletion: aiResponse.tokenCompletion,
        tokenTotal: aiResponse.tokenPrompt + aiResponse.tokenCompletion,
        rawOutput: response,
        systemPromptPreview: systemPrompt.substring(0, 500),
        userPromptPreview: userPrompt.substring(0, 500),
      },
    }
  } catch (e) {
    console.log('[AI] Analysis failed, using mock:', (e as Error).message)
    return mockAnalyze(sources)
  }
}

export async function generateDraft(
  risk: {
    title: string
    description: string
    evidence: { sourceName: string; sourceType: string; quote: string; confidence: number }[]
  },
  context?: string,
  stylePref?: { formality?: number; friendliness?: number; conciseness?: number; preferredTone?: string }
): Promise<string> {
  const apiKey = process.env.AI_API_KEY

  if (!apiKey) {
    return mockGenerateDraft(risk)
  }

  const userPrompt = buildDraftUserPrompt({
    riskTitle: risk.title,
    riskDescription: risk.description,
    evidence: risk.evidence,
    context,
    stylePref
  })

  try {
    const aiResponse = await callAI(userPrompt, DRAFT_SYSTEM_PROMPT, 1)
    return aiResponse.content
  } catch (e) {
    console.log('[AI] Draft generation failed:', (e as Error).message)
    return mockGenerateDraft(risk)
  }
}
