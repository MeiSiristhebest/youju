import type { AnalyzeResult, IncrementalMeta, Risk, Source } from '../types'

export interface SourceDiff {
  added: Source[]
  removed: Source[]
  modified: { old: Source; new: Source }[]
  unchanged: Source[]
}

export interface RiskChange {
  riskId: string
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  oldRisk?: Risk
  newRisk?: Risk
}

export interface IncrementalPrediction {
  isIncremental: boolean
  diff: SourceDiff
  estimatedAffectedRiskCount: number
  estimatedNewRiskCount: number
  estimatedRecomputedSteps: string[]
  estimatedTimeSavingPercent: number
}

export class IncrementalEngine {
  private cache: Map<string, AnalyzeResult> = new Map()

  diffSources(oldSources: Source[], newSources: Source[]): SourceDiff {
    const oldSourceMap = new Map(oldSources.map((s) => [s.id, s]))
    const newSourceMap = new Map(newSources.map((s) => [s.id, s]))

    const added: Source[] = []
    const removed: Source[] = []
    const modified: { old: Source; new: Source }[] = []
    const unchanged: Source[] = []

    for (const [id, newSource] of newSourceMap) {
      if (!oldSourceMap.has(id)) {
        added.push(newSource)
      } else {
        const oldSource = oldSourceMap.get(id)!
        if (oldSource.content !== newSource.content || oldSource.meta !== newSource.meta) {
          modified.push({ old: oldSource, new: newSource })
        } else {
          unchanged.push(newSource)
        }
      }
    }

    for (const [id, oldSource] of oldSourceMap) {
      if (!newSourceMap.has(id)) {
        removed.push(oldSource)
      }
    }

    return { added, removed, modified, unchanged }
  }

  computeAffectedRisks(diff: SourceDiff, existingResult: AnalyzeResult): string[] {
    const affectedSourceNames = [
      ...diff.added.map((s) => s.name),
      ...diff.modified.map((m) => m.new.name),
    ]

    const affectedRiskIds = new Set<string>()

    for (const risk of existingResult.risks) {
      for (const sourceName of affectedSourceNames) {
        if (risk.sources.includes(sourceName)) {
          affectedRiskIds.add(risk.id)
        }
      }
    }

    return Array.from(affectedRiskIds)
  }

  recomputeRisks(
    affectedRiskIds: string[],
    existingResult: AnalyzeResult,
    newSources: Source[],
  ): RiskChange[] {
    const changes: RiskChange[] = []
    const _existingRiskMap = new Map(existingResult.risks.map((r) => [r.id, r]))

    for (const risk of existingResult.risks) {
      if (affectedRiskIds.includes(risk.id)) {
        changes.push({
          riskId: risk.id,
          type: 'modified',
          oldRisk: risk,
        })
      } else {
        changes.push({
          riskId: risk.id,
          type: 'unchanged',
          oldRisk: risk,
        })
      }
    }

    const newSourceNames = newSources.map((s) => s.name)
    for (const risk of existingResult.risks) {
      const hasAllSources = risk.sources.every((src) => newSourceNames.includes(src))
      if (!hasAllSources) {
        const idx = changes.findIndex((c) => c.riskId === risk.id)
        if (idx !== -1) {
          changes[idx].type = 'removed'
        }
      }
    }

    return changes
  }

  mergeResults(oldResult: AnalyzeResult, newResult: AnalyzeResult): AnalyzeResult {
    const oldRiskMap = new Map(oldResult.risks.map((r) => [r.id, r]))
    const _newRiskMap = new Map(newResult.risks.map((r) => [r.id, r]))

    const mergedRisks: Risk[] = []
    const newRiskIds = new Set<string>()

    for (const risk of newResult.risks) {
      newRiskIds.add(risk.id)
      if (oldRiskMap.has(risk.id)) {
        mergedRisks.push({
          ...risk,
        })
      } else {
        mergedRisks.push(risk)
      }
    }

    for (const risk of oldResult.risks) {
      if (!newRiskIds.has(risk.id)) {
        mergedRisks.push({
          ...risk,
        })
      }
    }

    const incrementalMeta: IncrementalMeta = {
      affectedSteps: newResult.incrementalMeta?.affectedSteps || [],
      recomputedSteps: newResult.incrementalMeta?.recomputedSteps || [],
      reusedSteps: newResult.incrementalMeta?.reusedSteps || [],
      change: newResult.incrementalMeta?.change || { added: [], removed: [], modified: [] },
      isIncremental: true,
      isFullRecompute: false,
      newRiskCount: newResult.incrementalMeta?.newRiskCount || 0,
    }

    return {
      ...newResult,
      risks: mergedRisks,
      incrementalMeta,
      meta: {
        ...newResult.meta,
        durationMs: newResult.meta?.durationMs ?? 0,
        isMock: newResult.meta?.isMock ?? false,
        sourceCount: newResult.meta?.sourceCount ?? 0,
        isIncremental: true,
      },
    }
  }

  cacheResults(key: string, result: AnalyzeResult): void {
    this.cache.set(key, result)
  }

  getCachedResult(key: string): AnalyzeResult | undefined {
    return this.cache.get(key)
  }

  clearCache(): void {
    this.cache.clear()
  }

  hasCache(key: string): boolean {
    return this.cache.has(key)
  }

  predictChanges(
    oldSources: Source[],
    newSources: Source[],
    existingResult?: AnalyzeResult,
  ): IncrementalPrediction {
    const diff = this.diffSources(oldSources, newSources)
    const hasChanges = diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0

    if (!hasChanges || !existingResult) {
      return {
        isIncremental: false,
        diff,
        estimatedAffectedRiskCount: 0,
        estimatedNewRiskCount: 0,
        estimatedRecomputedSteps: [],
        estimatedTimeSavingPercent: 0,
      }
    }

    const affectedRiskIds = this.computeAffectedRisks(diff, existingResult)
    const affectedRiskCount = affectedRiskIds.length

    const affectedSteps = this.estimateAffectedSteps(diff)
    const totalSteps = 7
    const recomputedStepCount = affectedSteps.length
    const timeSavingPercent = Math.round(((totalSteps - recomputedStepCount) / totalSteps) * 100)

    const newSourceCount = diff.added.length
    const estimatedNewRiskCount = Math.min(Math.floor(newSourceCount * 1.5), 5)

    return {
      isIncremental: true,
      diff,
      estimatedAffectedRiskCount: affectedRiskCount,
      estimatedNewRiskCount,
      estimatedRecomputedSteps: affectedSteps,
      estimatedTimeSavingPercent: timeSavingPercent > 0 ? timeSavingPercent : 0,
    }
  }

  private estimateAffectedSteps(diff: SourceDiff): string[] {
    const steps: string[] = []

    if (diff.added.length > 0) {
      steps.push('要素提取', '冲突检测', '结果校验')
    }

    if (diff.modified.length > 0) {
      if (!steps.includes('要素提取')) steps.push('要素提取')
      if (!steps.includes('冲突检测')) steps.push('冲突检测')
      if (!steps.includes('结果校验')) steps.push('结果校验')
    }

    if (diff.removed.length > 0) {
      if (!steps.includes('冲突检测')) steps.push('冲突检测')
      if (!steps.includes('结果校验')) steps.push('结果校验')
    }

    return steps
  }

  generateCacheKey(sources: Source[], scenarioType: string | null): string {
    const sourceIds = sources.map((s) => s.id).sort()
    return `${scenarioType || 'default'}_${sourceIds.join('_')}_${this.computeContentHash(sources)}`
  }

  private computeContentHash(sources: Source[]): string {
    const content = sources.map((s) => `${s.id}:${s.content.length}:${s.meta || ''}`).join('|')
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }
}

export const incrementalEngine = new IncrementalEngine()
