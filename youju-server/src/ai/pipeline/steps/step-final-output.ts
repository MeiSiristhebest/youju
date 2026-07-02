import type { AnalyzeResult, ChecklistItem, ExtractedEntity, Risk } from '../../../domain/types.js'
import { CURRENT_PROMPT_VERSION } from '../../prompts/index.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'
import { getSharedMainCallResult } from './step-scenario-discovery.js'

export const systemPromptFragment = `
Step 7: FINAL OUTPUT GENERATION
- Strictly follow JSON schema
- No extra text, no explanations outside schema
- No markdown formatting
- Raw JSON only
`

export const outputSchema = {
  result: {
    type: 'object',
    description: 'final analyze result',
  },
  summary: {
    type: 'object',
    description: 'risk summary',
  },
}

export const stepFinalOutput: StepExecutor = async (input: StepInput): Promise<StepOutput> => {
  const startTime = Date.now()
  const mainResult = getSharedMainCallResult()
  const parsed = mainResult?.parsed
  const selfCheckOutput = input.previousOutputs['step-self-check'] as { risks?: Risk[] } | undefined
  const discrepancyOutput = input.previousOutputs['step-discrepancy-detection'] as
    | { risks?: Risk[] }
    | undefined
  const scenarioOutput = input.previousOutputs['step-scenario-discovery'] as
    | { scenario?: { type: string; description: string; keyDimensions?: string[] } }
    | undefined
  const extractionOutput = input.previousOutputs['step-cross-source-extraction'] as
    | { entities?: Array<{ dimension: string; value: string; evidence: unknown }> }
    | undefined
  const rawRisks = selfCheckOutput?.risks || discrepancyOutput?.risks || []
  const scenario = scenarioOutput?.scenario
  const entities = extractionOutput?.entities || []

  const risks: Risk[] = rawRisks

  const summary = {
    critical: risks.filter((r: Risk) => r.level === 'critical').length,
    warning: risks.filter((r: Risk) => r.level === 'warning').length,
    info: risks.filter((r: Risk) => r.level === 'info').length,
    total: risks.length,
  }

  const checklist: ChecklistItem[] = (parsed?.checklist || []).map((c: any, i: number) => ({
    id: `t${i + 1}`,
    text: c.text,
    hasDraft: true,
  }))

  const extractedEntities = categorizeEntities(entities)
  const riskRelations = computeRiskRelations(risks, input.sources)

  const alignedVersion = parsed?.aligned_version || ''

  const reasoningStep = parsed?.reasoning_trace?.find(
    (r: any) =>
      String(r.step).toUpperCase().includes('FINAL') ||
      String(r.step).toUpperCase().includes('OUTPUT'),
  )

  const finalResult: AnalyzeResult = {
    summary,
    scenario: scenario
      ? {
          type: scenario.type,
          description: scenario.description,
          keyDimensions: scenario.keyDimensions || [],
        }
      : undefined,
    risks,
    checklist,
    alignedVersion,
    extractedEntities,
    riskRelations,
    reasoningTrace: parsed?.reasoning_trace,
    uncertainties: parsed?.uncertainties,
    debugInfo: mainResult
      ? {
          model: mainResult.model,
          tokenPrompt: mainResult.tokenPrompt,
          tokenCompletion: mainResult.tokenCompletion,
          tokenTotal: mainResult.tokenPrompt + mainResult.tokenCompletion,
          rawOutput: mainResult.rawOutput,
          systemPromptPreview: '',
          userPromptPreview: '',
          isMock: mainResult.isMock,
        }
      : undefined,
  }

  return {
    data: {
      result: finalResult,
      summary,
      reasoning: reasoningStep?.result || '最终输出生成完成',
    },
    modelVersion: mainResult?.model || process.env.AI_MODEL || 'mock-rule-engine',
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt: 0,
    tokenCompletion: 0,
    latencyMs: Date.now() - startTime,
  }
}

function categorizeEntities(entities: Array<{ dimension: string; value: string; evidence: any }>): {
  dates: ExtractedEntity[]
  amounts: ExtractedEntity[]
  terms: ExtractedEntity[]
  promises: ExtractedEntity[]
} {
  const DIMENSION_CATEGORIES: Record<string, 'dates' | 'amounts' | 'terms' | 'promises'> = {
    salary: 'amounts',
    compensation: 'amounts',
    amount: 'amounts',
    price: 'amounts',
    deposit: 'amounts',
    payment: 'amounts',
    rent: 'amounts',
    fee: 'amounts',
    cost: 'amounts',
    bonus: 'amounts',
    date: 'dates',
    deadline: 'dates',
    duration: 'dates',
    start_date: 'dates',
    end_date: 'dates',
    move_in: 'dates',
    trial: 'terms',
    probation: 'terms',
    benefits: 'terms',
    welfare: 'terms',
    responsibilities: 'terms',
    terms: 'terms',
    conditions: 'terms',
    location: 'terms',
    liability: 'terms',
    termination: 'terms',
  }

  const result = {
    dates: [] as ExtractedEntity[],
    amounts: [] as ExtractedEntity[],
    terms: [] as ExtractedEntity[],
    promises: [] as ExtractedEntity[],
  }

  for (const entity of entities) {
    const dim = entity.dimension.toLowerCase()
    let category: 'dates' | 'amounts' | 'terms' | 'promises' = 'terms'

    for (const [key, cat] of Object.entries(DIMENSION_CATEGORIES)) {
      if (dim.includes(key)) {
        category = cat
        break
      }
    }

    result[category].push({
      dimension: entity.dimension,
      value: entity.value,
      evidence: entity.evidence,
    })
  }

  return result
}

function computeRiskRelations(risks: Risk[], sources: { name: string; type: string }[]) {
  const associations: any[] = []
  const relatedRiskIds: Record<string, string[]> = {}
  const conflictPairs: any[] = []

  for (const risk of risks) {
    relatedRiskIds[risk.id] = []
  }

  const sourceToRisks: Record<string, Risk[]> = {}
  for (const risk of risks) {
    for (const ev of risk.evidence) {
      if (!sourceToRisks[ev.sourceName]) {
        sourceToRisks[ev.sourceName] = []
      }
      if (!sourceToRisks[ev.sourceName].find((r) => r.id === risk.id)) {
        sourceToRisks[ev.sourceName].push(risk)
      }
    }
  }

  for (const sourceName of Object.keys(sourceToRisks)) {
    const sourceRisks = sourceToRisks[sourceName]
    const source = sources.find((s) => s.name === sourceName)
    const isConflict = sourceRisks.some((r) => r.type === 'conflict')

    associations.push({
      sourceName,
      sourceType: source?.type || 'unknown',
      riskIds: sourceRisks.map((r) => r.id),
      riskCount: sourceRisks.length,
      isConflict,
    })

    for (let i = 0; i < sourceRisks.length; i++) {
      for (let j = i + 1; j < sourceRisks.length; j++) {
        const risk1 = sourceRisks[i]
        const risk2 = sourceRisks[j]
        if (!relatedRiskIds[risk1.id].includes(risk2.id)) {
          relatedRiskIds[risk1.id].push(risk2.id)
        }
        if (!relatedRiskIds[risk2.id].includes(risk1.id)) {
          relatedRiskIds[risk2.id].push(risk1.id)
        }
      }
    }
  }

  const conflictRisks = risks.filter((r) => r.type === 'conflict')
  for (let i = 0; i < conflictRisks.length; i++) {
    for (let j = i + 1; j < conflictRisks.length; j++) {
      const risk1 = conflictRisks[i]
      const risk2 = conflictRisks[j]
      const commonSources = risk1.evidence
        .map((e) => e.sourceName)
        .filter((s) => risk2.evidence.some((e) => e.sourceName === s))
      if (commonSources.length > 0) {
        conflictPairs.push({
          risk1Id: risk1.id,
          risk2Id: risk2.id,
          reason: `都与"${commonSources.join('、')}"相关`,
        })
      }
    }
  }

  return { associations, relatedRiskIds, conflictPairs }
}
