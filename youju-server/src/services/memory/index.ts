import { getUserPreference, setUserPreference } from '../db'

export interface RiskWeightPreferences {
  dimensionWeights: Record<string, number>
  typeWeights: Record<string, number>
  totalChecks: number
  lastUpdated: string
}

export interface DraftStylePreferences {
  formality: number
  friendliness: number
  conciseness: number
  directness: number
  totalCopies: number
  totalEdits: number
  lastUpdated: string
  preferredTone?: string
}

const DEFAULT_RISK_WEIGHTS: RiskWeightPreferences = {
  dimensionWeights: {},
  typeWeights: {},
  totalChecks: 0,
  lastUpdated: new Date(0).toISOString()
}

const DEFAULT_DRAFT_STYLE: DraftStylePreferences = {
  formality: 0.5,
  friendliness: 0.5,
  conciseness: 0.5,
  directness: 0.5,
  totalCopies: 0,
  totalEdits: 0,
  lastUpdated: new Date(0).toISOString()
}

export function getRiskWeights(userId: number | null, sessionId: string | null): RiskWeightPreferences {
  const stored = getUserPreference(userId, sessionId, 'risk_weights')
  if (!stored) return { ...DEFAULT_RISK_WEIGHTS }
  try {
    return { ...DEFAULT_RISK_WEIGHTS, ...JSON.parse(stored) }
  } catch {
    return { ...DEFAULT_RISK_WEIGHTS }
  }
}

export function recordChecklistAction(
  userId: number | null,
  sessionId: string | null,
  riskType: string,
  dimension: string | undefined,
  checked: boolean
): RiskWeightPreferences {
  const prefs = getRiskWeights(userId, sessionId)
  prefs.totalChecks += 1
  
  if (checked) {
    prefs.typeWeights[riskType] = (prefs.typeWeights[riskType] || 0) + 1
    if (dimension) {
      prefs.dimensionWeights[dimension] = (prefs.dimensionWeights[dimension] || 0) + 1
    }
  }
  
  prefs.lastUpdated = new Date().toISOString()
  setUserPreference(userId, sessionId, 'risk_weights', JSON.stringify(prefs))
  return prefs
}

export function getDraftStyle(userId: number | null, sessionId: string | null): DraftStylePreferences {
  const stored = getUserPreference(userId, sessionId, 'draft_style')
  if (!stored) return { ...DEFAULT_DRAFT_STYLE }
  try {
    return { ...DEFAULT_DRAFT_STYLE, ...JSON.parse(stored) }
  } catch {
    return { ...DEFAULT_DRAFT_STYLE }
  }
}

export function recordDraftCopy(
  userId: number | null,
  sessionId: string | null,
  riskType?: string
): DraftStylePreferences {
  const prefs = getDraftStyle(userId, sessionId)
  prefs.totalCopies += 1
  prefs.lastUpdated = new Date().toISOString()
  setUserPreference(userId, sessionId, 'draft_style', JSON.stringify(prefs))
  return prefs
}

export function recordDraftEdit(
  userId: number | null,
  sessionId: string | null,
  editCount: number = 1
): DraftStylePreferences {
  const prefs = getDraftStyle(userId, sessionId)
  prefs.totalEdits += editCount
  prefs.lastUpdated = new Date().toISOString()
  
  if (prefs.totalEdits > 3) {
    const editRatio = prefs.totalEdits / (prefs.totalCopies + 1)
    if (editRatio > 0.5) {
      prefs.formality = Math.min(1, prefs.formality + 0.1)
      prefs.conciseness = Math.max(0, prefs.conciseness - 0.05)
    }
  }
  
  setUserPreference(userId, sessionId, 'draft_style', JSON.stringify(prefs))
  return prefs
}

export function inferToneFromPreferences(prefs: DraftStylePreferences): string {
  const { formality, friendliness, conciseness } = prefs
  
  let tone = 'neutral'
  if (formality > 0.7 && friendliness < 0.4) tone = 'formal'
  else if (formality < 0.4 && friendliness > 0.7) tone = 'casual'
  else if (friendliness > 0.6) tone = 'friendly'
  else if (formality > 0.6) tone = 'professional'
  
  return tone
}

export function applyRiskWeights<T extends { type: string; dimension?: string; level: string }>(
  risks: T[],
  weights: RiskWeightPreferences
): T[] {
  if (weights.totalChecks < 3) return risks
  
  const maxTypeWeight = Math.max(...Object.values(weights.typeWeights), 1)
  const maxDimWeight = Math.max(...Object.values(weights.dimensionWeights), 1)
  
  return risks
    .map(risk => {
      let score = 0
      if (risk.type && weights.typeWeights[risk.type]) {
        score += (weights.typeWeights[risk.type] / maxTypeWeight) * 0.6
      }
      if (risk.dimension && weights.dimensionWeights[risk.dimension]) {
        score += (weights.dimensionWeights[risk.dimension] / maxDimWeight) * 0.4
      }
      return { ...risk, _weightScore: score }
    })
    .sort((a: any, b: any) => {
      if (a.level !== b.level) {
        const levelOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
        return (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3)
      }
      return b._weightScore - a._weightScore
    })
    .map(({ _weightScore, ...rest }: any) => rest as T)
}

// ===== 用户反馈环 =====
export interface FeedbackStats {
  totalFeedbacks: number
  accurate: number
  inaccurate: number
  byRiskType: Record<string, { accurate: number; inaccurate: number }>
}

const DEFAULT_FEEDBACK: FeedbackStats = {
  totalFeedbacks: 0,
  accurate: 0,
  inaccurate: 0,
  byRiskType: {}
}

export function getFeedbackStats(userId: number | null, sessionId: string | null): FeedbackStats {
  const stored = getUserPreference(userId, sessionId, 'feedback_stats')
  if (!stored) return { ...DEFAULT_FEEDBACK }
  try {
    return { ...DEFAULT_FEEDBACK, ...JSON.parse(stored) }
  } catch {
    return { ...DEFAULT_FEEDBACK }
  }
}

export function recordRiskFeedback(
  userId: number | null,
  sessionId: string | null,
  riskId: string,
  riskType: string,
  isAccurate: boolean
): FeedbackStats {
  const stats = getFeedbackStats(userId, sessionId)
  stats.totalFeedbacks += 1
  
  if (isAccurate) {
    stats.accurate += 1
  } else {
    stats.inaccurate += 1
  }
  
  if (!stats.byRiskType[riskType]) {
    stats.byRiskType[riskType] = { accurate: 0, inaccurate: 0 }
  }
  if (isAccurate) {
    stats.byRiskType[riskType].accurate += 1
  } else {
    stats.byRiskType[riskType].inaccurate += 1
  }
  
  setUserPreference(userId, sessionId, 'feedback_stats', JSON.stringify(stats))
  return stats
}
