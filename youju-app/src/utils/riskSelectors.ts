import type { AnalysisDimension, Risk, RiskStatus } from '../types'

export function sortedRisks(
  risks: Risk[] | undefined | null,
  dimensions: AnalysisDimension[],
  riskStatuses: Record<string, RiskStatus>,
  riskStatusFilter: RiskStatus | 'all',
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): Risk[] {
  if (!risks || risks.length === 0) return []

  let filtered = [...risks]
  if (riskStatusFilter !== 'all') {
    filtered = filtered.filter((r) => getRiskStatus(r.id, riskStatuses[r.id]) === riskStatusFilter)
  }

  if (dimensions.length === 0) return filtered

  const dimensionWeightMap = new Map(dimensions.map((d) => [d.name, d.weight]))
  const levelOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 }

  return filtered.sort((a, b) => {
    const weightA = dimensionWeightMap.get(a.dimension || '') || 0
    const weightB = dimensionWeightMap.get(b.dimension || '') || 0
    if (weightB !== weightA) return weightB - weightA
    return (
      (levelOrder[b.level as keyof typeof levelOrder] || 0) -
      (levelOrder[a.level as keyof typeof levelOrder] || 0)
    )
  })
}

export function riskStatusCounts(
  risks: Risk[] | undefined | null,
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): { all: number; pending: number; processing: number; resolved: number; ignored: number } {
  const counts = { all: 0, pending: 0, processing: 0, resolved: 0, ignored: 0 }
  if (!risks) return counts

  counts.all = risks.length
  risks.forEach((r) => {
    const status = getRiskStatus(r.id)
    counts[status as keyof typeof counts]++
  })
  return counts
}

export function pendingRisks(
  risks: Risk[] | undefined | null,
  dimensions: AnalysisDimension[],
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): Risk[] {
  if (!risks || risks.length === 0) return []

  const dimensionWeightMap = new Map(dimensions.map((d) => [d.name, d.weight]))
  const levelOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 }

  return risks
    .filter((r) => {
      const status = getRiskStatus(r.id)
      return status === 'pending' || status === 'processing'
    })
    .sort((a, b) => {
      const weightA = dimensionWeightMap.get(a.dimension || '') || 0
      const weightB = dimensionWeightMap.get(b.dimension || '') || 0
      if (weightB !== weightA) return weightB - weightA
      return (
        (levelOrder[b.level as keyof typeof levelOrder] || 0) -
        (levelOrder[a.level as keyof typeof levelOrder] || 0)
      )
    })
}

export function totalUnresolved(
  risks: Risk[] | undefined | null,
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): number {
  if (!risks) return 0
  return risks.filter((r) => {
    const status = getRiskStatus(r.id)
    return status === 'pending' || status === 'processing'
  }).length
}
