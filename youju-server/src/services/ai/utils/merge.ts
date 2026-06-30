import type { Risk, Evidence, AnalyzeResult, ChecklistItem, ReasoningStep, RiskRelations, Source } from '../types.js'
import { computeRiskRelations } from './relations.js'

function similarity(a: string, b: string): number {
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

export function mergeRisks(existing: Risk[], newRisks: Risk[]): Risk[] {
  const merged = [...existing]

  for (const newRisk of newRisks) {
    let matched = false
    for (let i = 0; i < merged.length; i++) {
      const existingRisk = merged[i]
      const typeMatch = existingRisk.type === newRisk.type
      const titleSim = similarity(existingRisk.title, newRisk.title)

      if (typeMatch && titleSim > 0.5) {
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

function mergeEvidence(a: Evidence[], b: Evidence[]): Evidence[] {
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

function mergeDescriptions(a: string, b: string): string {
  if (a.includes(b)) return a
  if (b.includes(a)) return b
  if (similarity(a, b) > 0.7) return a
  return `${a}\n\n补充：${b}`
}

export function mergeChecklist(existing: ChecklistItem[], newItems: ChecklistItem[]): ChecklistItem[] {
  const merged = [...existing]
  const existingTexts = new Set(existing.map(c => c.text))

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
  newSteps: ReasoningStep[] | undefined
): ReasoningStep[] | undefined {
  if (!existing && !newSteps) return undefined
  if (!existing) return newSteps
  if (!newSteps) return existing

  const incrementalStep: ReasoningStep = {
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

export function mergeAnalyzeResults(
  existing: AnalyzeResult,
  incremental: AnalyzeResult,
  allSources: Source[]
): AnalyzeResult {
  const mergedRisks = mergeRisks(existing.risks, incremental.risks)
  const mergedChecklist = mergeChecklist(existing.checklist, incremental.checklist)
  const mergedTrace = mergeReasoningTrace(existing.reasoningTrace, incremental.reasoningTrace)
  const mergedRelations = computeRiskRelations(mergedRisks, allSources)
  const mergedUncertainties = [...new Set([...(existing.uncertainties || []), ...(incremental.uncertainties || [])])]

  const summary = {
    critical: mergedRisks.filter(r => r.level === 'critical').length,
    warning: mergedRisks.filter(r => r.level === 'warning').length,
    info: mergedRisks.filter(r => r.level === 'info').length,
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
