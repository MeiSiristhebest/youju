import type { AnalyzeResult, IncrementalMeta, Risk, RiskLevel, Source } from '../types'

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
  levelChanged?: boolean
  levelUpgraded?: boolean
}

export interface IncrementalPrediction {
  isIncremental: boolean
  diff: SourceDiff
  estimatedAffectedRiskCount: number
  estimatedNewRiskCount: number
  estimatedUpdatedRiskCount: number
  estimatedAffectedDimensions: number
  estimatedRecomputedSteps: string[]
  estimatedTimeSavingPercent: number
}

const LEVEL_ORDER: Record<RiskLevel, number> = {
  critical: 3,
  warning: 2,
  info: 1,
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

  compareRisks(oldResult: AnalyzeResult, newResult: AnalyzeResult): RiskChange[] {
    const oldRiskMap = new Map(oldResult.risks.map((r) => [r.id, r]))
    const newRiskMap = new Map(newResult.risks.map((r) => [r.id, r]))
    const changes: RiskChange[] = []

    for (const [id, newRisk] of newRiskMap) {
      const oldRisk = oldRiskMap.get(id)
      if (!oldRisk) {
        changes.push({ riskId: id, type: 'added', newRisk })
      } else {
        const levelChanged = oldRisk.level !== newRisk.level
        const levelUpgraded =
          levelChanged && LEVEL_ORDER[newRisk.level] > LEVEL_ORDER[oldRisk.level]
        changes.push({
          riskId: id,
          type: 'modified',
          oldRisk,
          newRisk,
          levelChanged,
          levelUpgraded,
        })
      }
    }

    for (const [id, oldRisk] of oldRiskMap) {
      if (!newRiskMap.has(id)) {
        changes.push({ riskId: id, type: 'removed', oldRisk })
      }
    }

    return changes
  }

  markRisksWithChanges(risks: Risk[], changes: RiskChange[]): Risk[] {
    const changeMap = new Map(changes.map((c) => [c.riskId, c]))
    return risks.map((risk) => {
      const change = changeMap.get(risk.id)
      if (!change) return risk
      if (change.type === 'added') {
        return { ...risk, isNew: true }
      }
      if (change.type === 'modified' && change.levelChanged && change.oldRisk && change.newRisk) {
        return {
          ...risk,
          levelChange: {
            from: change.oldRisk.level,
            to: change.newRisk.level,
            upgraded: change.levelUpgraded || false,
          },
        }
      }
      return risk
    })
  }

  sortRisksByPriority(risks: Risk[]): Risk[] {
    return [...risks].sort((a, b) => {
      const aScore = this.getRiskPriorityScore(a)
      const bScore = this.getRiskPriorityScore(b)
      if (bScore !== aScore) return bScore - aScore
      return LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]
    })
  }

  private getRiskPriorityScore(risk: Risk): number {
    let score = 0
    if (risk.isNew) score += 100
    if (risk.levelChange?.upgraded) score += 80
    if (risk.levelChange && !risk.levelChange.upgraded) score += 30
    return score
  }

  calculatePredictionAccuracy(
    prediction: IncrementalPrediction,
    actualChanges: RiskChange[],
  ): number {
    const actualNewCount = actualChanges.filter((c) => c.type === 'added').length
    const actualUpdatedCount = actualChanges.filter(
      (c) => c.type === 'modified' && c.levelChanged,
    ).length

    const predictedNew = prediction.estimatedNewRiskCount
    const predictedUpdated = prediction.estimatedUpdatedRiskCount || 0

    const newDiff = Math.abs(actualNewCount - predictedNew)
    const updatedDiff = Math.abs(actualUpdatedCount - predictedUpdated)

    const maxNew = Math.max(actualNewCount, predictedNew, 1)
    const maxUpdated = Math.max(actualUpdatedCount, predictedUpdated, 1)

    const newAccuracy = Math.max(0, 1 - newDiff / maxNew)
    const updatedAccuracy = Math.max(0, 1 - updatedDiff / maxUpdated)

    return Math.round(((newAccuracy + updatedAccuracy) / 2) * 100)
  }

  getAffectedDimensionCount(risks: Risk[]): number {
    const dimensions = new Set<string>()
    for (const risk of risks) {
      if (risk.dimension) {
        dimensions.add(risk.dimension)
      }
    }
    return dimensions.size
  }

  mergeResults(oldResult: AnalyzeResult, newResult: AnalyzeResult): AnalyzeResult {
    const oldRiskMap = new Map(oldResult.risks.map((r) => [r.id, r]))
    const _newRiskMap = new Map(newResult.risks.map((r) => [r.id, r]))

    const changes = this.compareRisks(oldResult, newResult)
    let mergedRisks: Risk[] = []
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

    mergedRisks = this.markRisksWithChanges(mergedRisks, changes)
    mergedRisks = this.sortRisksByPriority(mergedRisks)

    const newRiskCount = changes.filter((c) => c.type === 'added').length
    const updatedRiskCount = changes.filter((c) => c.type === 'modified' && c.levelChanged).length

    const incrementalMeta: IncrementalMeta = {
      affectedSteps: newResult.incrementalMeta?.affectedSteps || [],
      recomputedSteps: newResult.incrementalMeta?.recomputedSteps || [],
      reusedSteps: newResult.incrementalMeta?.reusedSteps || [],
      change: newResult.incrementalMeta?.change || { added: [], removed: [], modified: [] },
      isIncremental: true,
      isFullRecompute: false,
      newRiskCount,
      updatedRiskCount,
      previousSourceCount: oldResult.meta?.sourceCount,
      newSourceCount: newResult.meta?.sourceCount,
      durationMs: newResult.meta?.durationMs,
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
        estimatedUpdatedRiskCount: 0,
        estimatedAffectedDimensions: 0,
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
    const estimatedUpdatedRiskCount = Math.min(affectedRiskCount, 3)

    const affectedRisks = existingResult.risks.filter((r) => affectedRiskIds.includes(r.id))
    const estimatedAffectedDimensions = this.getAffectedDimensionCount(affectedRisks)

    return {
      isIncremental: true,
      diff,
      estimatedAffectedRiskCount: affectedRiskCount,
      estimatedNewRiskCount,
      estimatedUpdatedRiskCount,
      estimatedAffectedDimensions,
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
