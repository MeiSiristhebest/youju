import type { Risk } from '../../../domain/types.js'
import { CURRENT_PROMPT_VERSION } from '../../prompts/index.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'
import { getSharedMainCallResult } from './step-scenario-discovery.js'

export const systemPromptFragment = `
Step 5: DISCREPANCY DETECTION & EVIDENCE VALIDATION
For each dimension, analyze and classify findings into one of the risk types
defined in domain/rules/riskRules.ts (conflict, promise, missing, info).
Overview of each type:

  CONFLICT (conflict):
  → Multiple sources describe the same dimension with differing/contradictory values
  → Each claim must have supporting evidence (quote)

  PROMISE UNWRITTEN (promise):
  → A commitment/promise appears in an informal source but is absent from formal sources

  MISSING INFORMATION (missing):
  → A dimension important/expected for this scenario is absent from all sources
  → Use your judgment: would a reasonable person expect this to be specified?

  INFO (info):
  → Observation worth noting that does not rise to risk level

The exact classification conditions (e.g. minimum source counts) are defined
in domain/rules/riskRules.ts and must be respected.

Every finding MUST have:
  • At least one evidence entry with exact source quote
  • Clear reasoning for why it's categorized this way
  • Confidence score
`

export const outputSchema = {
  risks: {
    type: 'array',
    items: {
      id: 'string',
      dimension: 'string',
      type: 'string',
      level: 'string',
      title: 'string',
      description: 'string',
      sources: { type: 'array', items: 'string' },
      evidence: {
        type: 'array',
        items: {
          sourceName: 'string',
          sourceType: 'string',
          quote: 'string',
          confidence: 'number',
        },
      },
      confidence: 'number',
    },
    description: 'detected risks',
  },
  byType: {
    type: 'object',
    description: 'risks grouped by type',
  },
  byLevel: {
    type: 'object',
    description: 'risks grouped by level',
  },
  totalRisks: { type: 'number', description: 'total number of risks' },
}

const MAIN_CALL_STEP_COUNT = 5

export const stepDiscrepancyDetection: StepExecutor = async (
  _input: StepInput,
): Promise<StepOutput> => {
  const startTime = Date.now()
  const mainResult = getSharedMainCallResult()
  const parsed = mainResult?.parsed

  const rawRisks: any[] = parsed?.risks || []
  const risks: Risk[] = rawRisks.map((r: any, i: number) => {
    const sourceNames: string[] = r.evidence?.map((e: any) => String(e.sourceName)) || []
    return {
      id: `r${i + 1}`,
      dimension: r.dimension,
      type: r.type,
      level: r.level,
      title: r.title,
      description: r.description,
      sources: [...new Set(sourceNames)],
      evidence:
        r.evidence?.map((e: any) => ({
          sourceName: e.sourceName,
          sourceType: e.sourceType,
          quote: e.quote,
          confidence: e.confidence,
        })) || [],
    }
  })

  const byType: Record<string, Risk[]> = {
    conflict: [],
    promise: [],
    missing: [],
    info: [],
  }
  for (const risk of risks) {
    if (byType[risk.type]) {
      byType[risk.type].push(risk)
    }
  }

  const byLevel: Record<string, Risk[]> = {
    critical: [],
    warning: [],
    info: [],
  }
  for (const risk of risks) {
    if (byLevel[risk.level]) {
      byLevel[risk.level].push(risk)
    }
  }

  const reasoningStep = parsed?.reasoning_trace?.find(
    (r: any) =>
      String(r.step).toUpperCase().includes('DISCREPANCY') ||
      String(r.step).toUpperCase().includes('DETECTION'),
  )

  const tokenPrompt = mainResult ? Math.ceil(mainResult.tokenPrompt / MAIN_CALL_STEP_COUNT) : 0
  const tokenCompletion = mainResult
    ? Math.ceil(mainResult.tokenCompletion / MAIN_CALL_STEP_COUNT)
    : 0

  return {
    data: {
      risks,
      byType,
      byLevel,
      totalRisks: risks.length,
      reasoning: reasoningStep?.result || '差异检测完成',
    },
    modelVersion: mainResult?.model || process.env.AI_MODEL || 'mock-rule-engine',
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt,
    tokenCompletion,
    latencyMs: Date.now() - startTime,
  }
}
