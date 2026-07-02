export interface Evidence {
  sourceName: string
  sourceType: string
  quote: string
  confidence?: number
}

export interface Risk {
  id: string
  level: 'critical' | 'warning' | 'info'
  type: string
  title: string
  description: string
  dimension?: string
  sources: string[]
  evidence?: Evidence[]
  confidence?: number
}

export interface Source {
  id: string
  name: string
  type: string
  content: string
  meta?: string
}

export interface Conflict {
  riskId: string
  dimension: string
  conflictingSources: string[]
  values: { source: string; value: string }[]
  severity: number
}

export interface ValidationResult {
  riskId: string
  isValid: boolean
  evidenceCount: number
  missingSources: string[]
  conflicts: Conflict[]
  confidence: number
}

export interface RiskRanking {
  riskId: string
  title: string
  confidence: number
  severity: number
  score: number
  rank: number
}

const SOURCE_CREDIBILITY: Record<string, number> = {
  contract: 95,
  doc: 80,
  chat: 60,
}

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 100,
  warning: 70,
  info: 40,
}

const TYPE_WEIGHTS: Record<string, number> = {
  conflict: 90,
  promise: 75,
  missing: 60,
  info: 30,
}

export class CrossValidator {
  private sources: Source[] = []
  private risks: Risk[] = []

  constructor(sources?: Source[], risks?: Risk[]) {
    if (sources) this.sources = sources
    if (risks) this.risks = risks
  }

  setSources(sources: Source[]): void {
    this.sources = sources
  }

  setRisks(risks: Risk[]): void {
    this.risks = risks
  }

  validateEvidence(risk: Risk): ValidationResult {
    const evidenceCount = risk.evidence?.length || 0
    const requiredEvidenceCount = risk.sources.length
    const missingSources: string[] = []

    if (risk.evidence) {
      const evidenceSources = risk.evidence.map((e) => e.sourceName)
      risk.sources.forEach((source) => {
        if (!evidenceSources.includes(source)) {
          missingSources.push(source)
        }
      })
    } else {
      missingSources.push(...risk.sources)
    }

    const conflicts = this.detectConflict(risk)
    const isValid =
      evidenceCount >= Math.max(1, requiredEvidenceCount * 0.5) && conflicts.length === 0
    const confidence = this.calculateConfidence(risk, conflicts)

    return {
      riskId: risk.id,
      isValid,
      evidenceCount,
      missingSources,
      conflicts,
      confidence,
    }
  }

  detectConflict(risk: Risk): Conflict[] {
    if (!risk.evidence || risk.evidence.length < 2) return []

    const conflicts: Conflict[] = []
    const dimension = risk.dimension || 'unknown'
    const sourceValues = new Map<string, string>()

    risk.evidence.forEach((ev) => {
      const value = ev.quote.replace(/[^\d\u4e00-\u9fa5]/g, '').trim()
      sourceValues.set(ev.sourceName, value)
    })

    const values = Array.from(sourceValues.entries())
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const [source1, value1] = values[i]
        const [source2, value2] = values[j]

        if (value1 !== value2 && value1 && value2) {
          const severity = this.calculateConflictSeverity(source1, source2, risk.level)

          conflicts.push({
            riskId: risk.id,
            dimension,
            conflictingSources: [source1, source2],
            values: [
              {
                source: source1,
                value: risk.evidence!.find((e) => e.sourceName === source1)?.quote || value1,
              },
              {
                source: source2,
                value: risk.evidence!.find((e) => e.sourceName === source2)?.quote || value2,
              },
            ],
            severity,
          })
        }
      }
    }

    return conflicts
  }

  private calculateConflictSeverity(source1: string, source2: string, level: string): number {
    const source1Type = this.sources.find((s) => s.name === source1)?.type || 'chat'
    const source2Type = this.sources.find((s) => s.name === source2)?.type || 'chat'

    const credibilityDiff = Math.abs(
      SOURCE_CREDIBILITY[source1Type] - SOURCE_CREDIBILITY[source2Type],
    )
    const levelWeight = SEVERITY_WEIGHTS[level] || 50

    if (credibilityDiff > 30) return Math.min(100, levelWeight + 20)
    if (credibilityDiff > 15) return Math.min(100, levelWeight + 10)
    return levelWeight
  }

  calculateConfidence(risk: Risk, conflicts?: Conflict[]): number {
    const conflictList = conflicts || this.detectConflict(risk)

    let baseScore = 50

    if (risk.evidence && risk.evidence.length > 0) {
      const avgEvidenceConfidence =
        risk.evidence.reduce((sum, ev) => sum + (ev.confidence || 70), 0) / risk.evidence.length
      baseScore += avgEvidenceConfidence * 0.3
    }

    const sourceCredibilitySum = risk.sources.reduce((sum, sourceName) => {
      const source = this.sources.find((s) => s.name === sourceName)
      return sum + (source ? SOURCE_CREDIBILITY[source.type] || 60 : 50)
    }, 0)
    const avgSourceCredibility = sourceCredibilitySum / risk.sources.length
    baseScore += avgSourceCredibility * 0.2

    const evidenceRatio = risk.evidence?.length ? risk.evidence.length / risk.sources.length : 0
    baseScore += evidenceRatio * 20

    const typeBonus = TYPE_WEIGHTS[risk.type] || 50
    baseScore += typeBonus * 0.1

    if (conflictList.length > 0) {
      const conflictSeverity =
        conflictList.reduce((sum, c) => sum + c.severity, 0) / conflictList.length
      baseScore -= conflictSeverity * 0.3
    }

    return Math.max(0, Math.min(100, Math.round(baseScore)))
  }

  rankRisks(risks?: Risk[]): RiskRanking[] {
    const targetRisks = risks || this.risks

    const rankings = targetRisks.map((risk) => {
      const conflicts = this.detectConflict(risk)
      const confidence = risk.confidence || this.calculateConfidence(risk, conflicts)
      const severity = SEVERITY_WEIGHTS[risk.level] || 50
      const score = (confidence / 100) * severity

      return {
        riskId: risk.id,
        title: risk.title,
        confidence,
        severity,
        score,
        rank: 0,
      }
    })

    rankings.sort((a, b) => b.score - a.score)

    rankings.forEach((r, index) => {
      r.rank = index + 1
    })

    return rankings
  }

  validateAll(): ValidationResult[] {
    return this.risks.map((risk) => this.validateEvidence(risk))
  }

  analyzeSourceConsistency(sourceName: string): { consistent: boolean; inconsistencies: string[] } {
    const sourceRisks = this.risks.filter((r) => r.sources.includes(sourceName))
    const inconsistencies: string[] = []

    const dimensionValues = new Map<string, Set<string>>()

    sourceRisks.forEach((risk) => {
      const dimension = risk.dimension || 'unknown'
      risk.evidence?.forEach((ev) => {
        if (ev.sourceName === sourceName) {
          const value = ev.quote.replace(/[^\d\u4e00-\u9fa5]/g, '').trim()
          if (!dimensionValues.has(dimension)) {
            dimensionValues.set(dimension, new Set())
          }
          dimensionValues.get(dimension)!.add(value)
        }
      })
    })

    dimensionValues.forEach((values, dimension) => {
      if (values.size > 1) {
        inconsistencies.push(`${dimension} 维度存在 ${values.size} 种不同表述`)
      }
    })

    return {
      consistent: inconsistencies.length === 0,
      inconsistencies,
    }
  }
}
