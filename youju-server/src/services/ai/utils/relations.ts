// ============================================================
// 有据 AI - 工具函数：风险关联 & 维度分类
// ============================================================

import type { Risk, RiskRelations, RiskAssociation, ExtractedEntity, Source } from '../types'

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

export function categorizeEntities(
  entities: { dimension: string; value: string; evidence: { sourceName: string; sourceType: string; quote: string; confidence: number } }[]
): {
  dates: ExtractedEntity[]
  amounts: ExtractedEntity[]
  terms: ExtractedEntity[]
  promises: ExtractedEntity[]
} {
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

export function computeRiskRelations(risks: Risk[], sources: Source[]): RiskRelations {
  const associations: RiskAssociation[] = []
  const relatedRiskIds: Record<string, string[]> = {}
  const conflictPairs: { risk1Id: string; risk2Id: string; reason: string }[] = []

  for (const risk of risks) {
    relatedRiskIds[risk.id] = []
  }

  const sourceToRisks: Record<string, Risk[]> = {}
  for (const risk of risks) {
    for (const ev of risk.evidence) {
      if (!sourceToRisks[ev.sourceName]) {
        sourceToRisks[ev.sourceName] = []
      }
      if (!sourceToRisks[ev.sourceName].find(r => r.id === risk.id)) {
        sourceToRisks[ev.sourceName].push(risk)
      }
    }
  }

  for (const sourceName of Object.keys(sourceToRisks)) {
    const sourceRisks = sourceToRisks[sourceName]
    const source = sources.find(s => s.name === sourceName)
    const isConflict = sourceRisks.some(r => r.type === 'conflict')

    associations.push({
      sourceName,
      sourceType: source?.type || 'unknown',
      riskIds: sourceRisks.map(r => r.id),
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

  const conflictRisks = risks.filter(r => r.type === 'conflict')
  for (let i = 0; i < conflictRisks.length; i++) {
    for (let j = i + 1; j < conflictRisks.length; j++) {
      const risk1 = conflictRisks[i]
      const risk2 = conflictRisks[j]
      const commonSources = risk1.evidence
        .map(e => e.sourceName)
        .filter(s => risk2.evidence.some(e => e.sourceName === s))
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
