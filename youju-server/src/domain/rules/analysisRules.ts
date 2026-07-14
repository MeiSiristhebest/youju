import type {
  AnalyzeResult,
  ChecklistItem,
  Evidence,
  ReasoningStep,
  Risk,
  RiskAssociation,
  Source,
} from '../types.js'
import { classifyRiskLevel } from './riskRules.js'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const SOURCE_AFFECTED_STEPS = [
  'step-scenario-discovery',
  'step-input-parsing',
  'step-cross-source-extraction',
  'step-discrepancy-detection',
  'step-self-check',
  'step-final-output',
]

export const SIMILARITY_THRESHOLD_MERGE = 0.5
export const SIMILARITY_THRESHOLD_DESCRIPTION = 0.7

// ─────────────────────────────────────────────────────────────────────────────
// Source diff & affected steps
// ─────────────────────────────────────────────────────────────────────────────

export function computeSourceDiff(
  existing: Source[],
  updated: Source[],
): {
  addedSources: Source[]
  removedSources: Source[]
  modifiedSources: Source[]
} {
  const existingMap = new Map(existing.map((s) => [s.id, s]))
  const updatedIds = new Set(updated.map((s) => s.id))

  const addedSources: Source[] = []
  const modifiedSources: Source[] = []
  const removedSources: Source[] = []

  for (const src of updated) {
    const existingSrc = existingMap.get(src.id)
    if (!existingSrc) {
      addedSources.push(src)
    } else if (existingSrc.content !== src.content) {
      modifiedSources.push(src)
    }
  }

  for (const src of existing) {
    if (!updatedIds.has(src.id)) {
      removedSources.push(src)
    }
  }

  return {
    addedSources,
    removedSources,
    modifiedSources,
  }
}

export function determineAffectedSteps(diff: {
  addedSources: Source[]
  removedSources: Source[]
  modifiedSources: Source[]
}): string[] {
  if (
    diff.addedSources.length === 0 &&
    diff.modifiedSources.length === 0 &&
    diff.removedSources.length === 0
  ) {
    return []
  }
  return [...SOURCE_AFFECTED_STEPS]
}

export function mergeSourceLists(existing: Source[], updates: Source[]): Source[] {
  const updateMap = new Map(updates.map((s) => [s.id, s]))
  const existingIds = new Set(existing.map((s) => s.id))

  const result: Source[] = []
  for (const src of existing) {
    const updated = updateMap.get(src.id)
    result.push(updated || src)
  }
  for (const src of updates) {
    if (!existingIds.has(src.id)) {
      result.push(src)
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter & risk operations
// ─────────────────────────────────────────────────────────────────────────────

export function filterOutAffectedRisks(
  result: AnalyzeResult,
  modifiedSourceNames: Set<string>,
  removedSourceNames: Set<string>,
): AnalyzeResult {
  const affectedNames = new Set([...modifiedSourceNames, ...removedSourceNames])

  const filteredRisks = result.risks.filter((risk) => {
    const riskSources = risk.sources || []
    const allFromAffected = riskSources.length > 0 && riskSources.every((s) => affectedNames.has(s))
    return !allFromAffected
  })

  const filteredEvidenceRisks = filteredRisks
    .map((risk) => ({
      ...risk,
      evidence: (risk.evidence || []).filter((e) => !affectedNames.has(e.sourceName)),
      sources: (risk.sources || []).filter((s) => !affectedNames.has(s)),
    }))
    .filter((risk) => (risk.evidence || []).length > 0)

  const summary = {
    critical: filteredEvidenceRisks.filter((r) => r.level === 'critical').length,
    warning: filteredEvidenceRisks.filter((r) => r.level === 'warning').length,
    info: filteredEvidenceRisks.filter((r) => r.level === 'info').length,
    total: filteredEvidenceRisks.length,
  }

  return {
    ...result,
    risks: filteredEvidenceRisks,
    summary,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Similarity
// ─────────────────────────────────────────────────────────────────────────────

export function similarity(a: string, b: string): number {
  if (a === b) return 1
  const shorter = a.length < b.length ? a : b
  const longer = a.length < b.length ? b : a
  if (longer.length === 0) return 1

  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++
  }
  return matches / longer.length
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge functions (for incremental analysis)
// ─────────────────────────────────────────────────────────────────────────────

export function mergeAnalyzeResults(
  existing: AnalyzeResult,
  incremental: AnalyzeResult,
  allSources: Source[],
): AnalyzeResult {
  const mergedRisks = mergeRisks(existing.risks, incremental.risks)
  const mergedChecklist = mergeChecklist(existing.checklist, incremental.checklist)
  const mergedTrace = mergeReasoningTrace(existing.reasoningTrace, incremental.reasoningTrace)
  const mergedRelations = computeRiskRelationsSimple(mergedRisks, allSources)
  const mergedUncertainties = [
    ...new Set([...(existing.uncertainties || []), ...(incremental.uncertainties || [])]),
  ]

  const summary = {
    critical: mergedRisks.filter((r) => r.level === 'critical').length,
    warning: mergedRisks.filter((r) => r.level === 'warning').length,
    info: mergedRisks.filter((r) => r.level === 'info').length,
    total: mergedRisks.length,
  }

  return {
    ...existing,
    summary,
    risks: mergedRisks,
    checklist: mergedChecklist,
    riskRelations: mergedRelations,
    reasoningTrace: mergedTrace,
    uncertainties: mergedUncertainties.length > 0 ? mergedUncertainties : undefined,
    meta: {
      ...existing.meta,
      sourceCount: allSources.length,
    },
  }
}

export function mergeRisks(existing: Risk[], newRisks: Risk[]): Risk[] {
  const merged = [...existing]

  for (const newRisk of newRisks) {
    let matched = false
    for (let i = 0; i < merged.length; i++) {
      const existingRisk = merged[i]
      const typeMatch = existingRisk.type === newRisk.type
      const titleSim = similarity(existingRisk.title, newRisk.title)

      if (typeMatch && titleSim > SIMILARITY_THRESHOLD_MERGE) {
        const mergedEvidence = mergeEvidence(existingRisk.evidence || [], newRisk.evidence || [])
        merged[i] = {
          ...existingRisk,
          description: mergeDescriptions(existingRisk.description, newRisk.description),
          evidence: mergedEvidence,
          sources: [...new Set([...(existingRisk.sources || []), ...(newRisk.sources || [])])],
          confidence: Math.max(existingRisk.confidence || 0, newRisk.confidence || 0),
        }
        matched = true
        break
      }
    }

    if (!matched) {
      merged.push({
        ...newRisk,
        id: `r${merged.length + 1}`,
      })
    }
  }

  return merged
}

export function mergeEvidence(a: Evidence[], b: Evidence[]): Evidence[] {
  const seen = new Set<string>()
  const result: Evidence[] = []

  for (const e of [...a, ...b]) {
    const key = `${e.sourceName}:${e.quote.substring(0, 50)}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(e)
    }
  }

  return result
}

export function mergeDescriptions(a: string, b: string): string {
  if (a.includes(b)) return a
  if (b.includes(a)) return b
  if (similarity(a, b) > SIMILARITY_THRESHOLD_DESCRIPTION) return a
  return `${a}\n\n补充：${b}`
}

export function mergeChecklist(
  existing: ChecklistItem[],
  newItems: ChecklistItem[],
): ChecklistItem[] {
  const merged = [...existing]
  const existingTexts = new Set(existing.map((c) => c.text))

  for (const item of newItems) {
    if (!existingTexts.has(item.text)) {
      merged.push({
        ...item,
        id: `t${merged.length + 1}`,
      })
    }
  }

  return merged
}

export function mergeReasoningTrace(
  existing: ReasoningStep[] | undefined,
  newSteps: ReasoningStep[] | undefined,
): ReasoningStep[] | undefined {
  if (!existing && !newSteps) return undefined
  if (!existing) return newSteps
  if (!newSteps) return existing

  const incrementalStep = {
    step: existing.length + 1,
    title: '增量分析',
    description: '补充新材料后的增量核验过程',
    details: '基于新增材料进行补充分析，合并到已有结果中。',
    result: 'completed',
    timestamp: new Date().toISOString(),
  }

  return [
    ...existing,
    incrementalStep,
    ...newSteps.map((s, i) => ({
      ...s,
      step: existing.length + 2 + i,
    })),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk relations
// ─────────────────────────────────────────────────────────────────────────────

export function computeRiskRelationsSimple(risks: Risk[], sources: Source[]) {
  const associations: RiskAssociation[] = []
  const relatedRiskIds: Record<string, string[]> = {}
  const conflictPairs: Array<{ risk1Id: string; risk2Id: string; reason: string }> = []

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

// ─────────────────────────────────────────────────────────────────────────────
// Result post-processing
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisSummary {
  critical: number
  warning: number
  info: number
  total: number
}

export function computeAnalysisSummary(risks: Risk[]): AnalysisSummary {
  return {
    critical: risks.filter((r) => r.level === 'critical').length,
    warning: risks.filter((r) => r.level === 'warning').length,
    info: risks.filter((r) => r.level === 'info').length,
    total: risks.length,
  }
}

function getMinimumRiskCount(sourceCount: number): number {
  if (sourceCount <= 1) return 2
  if (sourceCount <= 3) return 3
  if (sourceCount <= 5) return 4
  return 5
}

function generateSuggestedRisks(
  existingRisks: Risk[],
  sourceCount: number,
  scenarioType?: string,
): Risk[] {
  const minCount = getMinimumRiskCount(sourceCount)
  if (existingRisks.length >= minCount) return []

  const needed = minCount - existingRisks.length
  const existingDimensions = new Set(existingRisks.map((r) => r.dimension))
  const existingTypes = new Set(existingRisks.map((r) => r.type))

  const suggestedDimensions: Record<string, { dimension: string; type: 'promise' | 'missing' }[]> =
    {
      job_offer: [
        { dimension: '试用期条款', type: 'missing' },
        { dimension: '社保缴纳基数', type: 'missing' },
        { dimension: '加班补偿政策', type: 'missing' },
        { dimension: '年终奖发放条件', type: 'promise' },
        { dimension: '竞业限制条款', type: 'missing' },
      ],
      rental: [
        { dimension: '押金退还条件', type: 'missing' },
        { dimension: '维修责任划分', type: 'missing' },
        { dimension: '提前解约条款', type: 'missing' },
        { dimension: '物业费承担方', type: 'promise' },
        { dimension: '家具家电清单', type: 'missing' },
      ],
      legal_case: [
        { dimension: '证据链完整性', type: 'missing' },
        { dimension: '诉讼时效', type: 'missing' },
        { dimension: '责任划分依据', type: 'missing' },
        { dimension: '赔偿计算标准', type: 'missing' },
        { dimension: '程序合规性', type: 'missing' },
      ],
      due_diligence: [
        { dimension: '财务数据真实性', type: 'missing' },
        { dimension: '法律合规风险', type: 'missing' },
        { dimension: '核心人员稳定性', type: 'missing' },
        { dimension: '知识产权归属', type: 'missing' },
        { dimension: '关联交易披露', type: 'missing' },
      ],
    }

  const genericDimensions = [
    { dimension: '时间节点约定', type: 'missing' },
    { dimension: '责任承担方式', type: 'missing' },
    { dimension: '争议解决机制', type: 'missing' },
    { dimension: '违约处理条款', type: 'missing' },
    { dimension: '保密义务约定', type: 'missing' },
  ]

  const scenarios = suggestedDimensions[scenarioType || ''] || genericDimensions
  const filtered = scenarios.filter((s) => !existingDimensions.has(s.dimension))

  const newRisks: Risk[] = []
  for (let i = 0; i < needed && i < filtered.length; i++) {
    const s = filtered[i]

    newRisks.push({
      id: `auto-${Date.now()}-${i}`,
      dimension: s.dimension,
      type: s.type,
      level: 'info',
      title: `${s.dimension}可能存在风险`,
      description: `材料中未明确提及${s.dimension}，建议确认相关约定。`,
      sources: [],
      evidence: [],
      confidence: 0.3,
    })
  }

  return newRisks
}

export function validateAndBuildResult(rawResult: AnalyzeResult): AnalyzeResult {
  const sourceCount = rawResult.meta?.sourceCount || 0
  const scenarioType = rawResult.scenario?.type

  const validatedRisks = rawResult.risks.map((risk) => ({
    ...risk,
    level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
  }))

  const suggestedRisks = generateSuggestedRisks(validatedRisks, sourceCount, scenarioType)
  const finalRisks = [...validatedRisks, ...suggestedRisks]

  return {
    ...rawResult,
    risks: finalRisks,
    summary: computeAnalysisSummary(finalRisks),
    uncertainties: [
      ...(rawResult.uncertainties || []),
      ...suggestedRisks.map((r) => `建议确认：${r.dimension}`),
    ],
  }
}

export interface AIStepSummary {
  id: string
  name: string
  status: string
  promptVersion: string
  modelVersion: string
  tokenPrompt: number
  tokenCompletion: number
  latencyMs: number
}

export interface AnalysisAIResult {
  result: AnalyzeResult
  steps: AIStepSummary[]
  totalTokens: number
  isMock: boolean
}
