import type { AnalysisDimension, Risk, RiskStatus } from '../types'

export function sortRisksByPriority(risks: Risk[], dimensions: AnalysisDimension[]): Risk[] {
  if (dimensions.length === 0) return risks

  const dimensionWeightMap = new Map(dimensions.map((d) => [d.name, d.weight]))
  const levelOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 }

  return [...risks].sort((a, b) => {
    const weightA = dimensionWeightMap.get(a.dimension || '') || 0
    const weightB = dimensionWeightMap.get(b.dimension || '') || 0
    if (weightB !== weightA) return weightB - weightA

    const levelA = levelOrder[a.level as keyof typeof levelOrder] || 0
    const levelB = levelOrder[b.level as keyof typeof levelOrder] || 0
    return levelB - levelA
  })
}

export function filterRisksByStatus(
  risks: Risk[],
  statusFilter: RiskStatus | 'all',
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): Risk[] {
  if (statusFilter === 'all') return risks
  return risks.filter((r) => getRiskStatus(r.id) === statusFilter)
}

export function getSortedAndFilteredRisks(
  risks: Risk[],
  dimensions: AnalysisDimension[],
  statusFilter: RiskStatus | 'all',
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): Risk[] {
  const filtered = filterRisksByStatus(risks, statusFilter, getRiskStatus)
  return sortRisksByPriority(filtered, dimensions)
}

export function calculateRiskStatusCounts(
  risks: Risk[],
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): { all: number; pending: number; processing: number; resolved: number; ignored: number } {
  const counts = { all: risks.length, pending: 0, processing: 0, resolved: 0, ignored: 0 }
  risks.forEach((r) => {
    const status = getRiskStatus(r.id)
    if (status in counts) {
      counts[status as keyof typeof counts]++
    }
  })
  return counts
}

export function getPendingRisks(
  risks: Risk[],
  dimensions: AnalysisDimension[],
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): Risk[] {
  const pending = risks.filter((r) => {
    const status = getRiskStatus(r.id)
    return status === 'pending' || status === 'processing'
  })
  return sortRisksByPriority(pending, dimensions)
}

export function countUnresolvedRisks(
  risks: Risk[],
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus,
): number {
  return risks.filter((r) => {
    const status = getRiskStatus(r.id)
    return status === 'pending' || status === 'processing'
  }).length
}

export function isIncrementalAnalysis(
  sourceIds: string[],
  oldSourceIds: string[] | undefined,
  forceFull: boolean,
): boolean {
  if (forceFull || !oldSourceIds || oldSourceIds.length === 0) return false
  const newIds = sourceIds.filter((id) => !oldSourceIds.includes(id))
  return newIds.length > 0 && newIds.length < sourceIds.length
}
