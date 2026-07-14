import { driver } from '../data/db.js'
import { createPreferenceRepository } from '../data/repositories/preferenceRepository.js'
import type {
  DraftStylePreferences,
  FeedbackStats,
  RiskWeightPreferences,
} from '../domain/types.js'

const preferenceRepository = createPreferenceRepository(driver)
const { getUserPreference, setUserPreference } = preferenceRepository

const DEFAULT_RISK_WEIGHTS: RiskWeightPreferences = {
  dimensionWeights: {},
  typeWeights: {},
  totalChecks: 0,
  lastUpdated: new Date(0).toISOString(),
}

const DEFAULT_DRAFT_STYLE: DraftStylePreferences = {
  formality: 0.5,
  friendliness: 0.5,
  conciseness: 0.5,
  directness: 0.5,
  totalCopies: 0,
  totalEdits: 0,
  lastUpdated: new Date(0).toISOString(),
}

const DEFAULT_FEEDBACK: FeedbackStats = {
  totalFeedbacks: 0,
  accurate: 0,
  inaccurate: 0,
  byRiskType: {},
}

export async function getRiskWeights(
  userId: number | null,
  sessionId: string | null,
): Promise<RiskWeightPreferences> {
  const stored = await getUserPreference(userId, sessionId, 'risk_weights')
  if (!stored) return { ...DEFAULT_RISK_WEIGHTS }
  try {
    return { ...DEFAULT_RISK_WEIGHTS, ...JSON.parse(stored as string) }
  } catch {
    return { ...DEFAULT_RISK_WEIGHTS }
  }
}

export async function recordChecklistAction(
  userId: number | null,
  sessionId: string | null,
  riskType: string,
  dimension: string | undefined,
  checked: boolean,
): Promise<RiskWeightPreferences> {
  const prefs = await getRiskWeights(userId, sessionId)
  prefs.totalChecks += 1

  if (checked) {
    prefs.typeWeights[riskType] = (prefs.typeWeights[riskType] || 0) + 1
    if (dimension) {
      prefs.dimensionWeights[dimension] = (prefs.dimensionWeights[dimension] || 0) + 1
    }
  }

  prefs.lastUpdated = new Date().toISOString()
  await setUserPreference(userId, sessionId, 'risk_weights', JSON.stringify(prefs))
  return prefs
}

export async function getDraftStyle(
  userId: number | null,
  sessionId: string | null,
): Promise<DraftStylePreferences> {
  const stored = await getUserPreference(userId, sessionId, 'draft_style')
  if (!stored) return { ...DEFAULT_DRAFT_STYLE }
  try {
    return { ...DEFAULT_DRAFT_STYLE, ...JSON.parse(stored as string) }
  } catch {
    return { ...DEFAULT_DRAFT_STYLE }
  }
}

export async function recordDraftCopy(
  userId: number | null,
  sessionId: string | null,
  _riskType?: string,
): Promise<DraftStylePreferences> {
  const prefs = await getDraftStyle(userId, sessionId)
  prefs.totalCopies += 1
  prefs.lastUpdated = new Date().toISOString()
  await setUserPreference(userId, sessionId, 'draft_style', JSON.stringify(prefs))
  return prefs
}

export async function recordDraftEdit(
  userId: number | null,
  sessionId: string | null,
  editCount: number = 1,
): Promise<DraftStylePreferences> {
  const prefs = await getDraftStyle(userId, sessionId)
  prefs.totalEdits += editCount
  prefs.lastUpdated = new Date().toISOString()

  if (prefs.totalEdits > 3) {
    const editRatio = prefs.totalEdits / (prefs.totalCopies + 1)
    if (editRatio > 0.5) {
      prefs.formality = Math.min(1, prefs.formality + 0.1)
      prefs.conciseness = Math.max(0, prefs.conciseness - 0.05)
    }
  }

  await setUserPreference(userId, sessionId, 'draft_style', JSON.stringify(prefs))
  return prefs
}

export function applyRiskWeights<T extends { type: string; dimension?: string; level: string }>(
  risks: T[],
  weights: RiskWeightPreferences,
): T[] {
  if (weights.totalChecks < 3) return risks

  const maxTypeWeight = Math.max(...Object.values(weights.typeWeights), 1)
  const maxDimWeight = Math.max(...Object.values(weights.dimensionWeights), 1)

  const sorted = [...risks].sort((a, b) => {
    let scoreA = 0
    let scoreB = 0

    if (a.type && weights.typeWeights[a.type]) {
      scoreA += (weights.typeWeights[a.type] / maxTypeWeight) * 0.6
    }
    if (a.dimension && weights.dimensionWeights[a.dimension]) {
      scoreA += (weights.dimensionWeights[a.dimension] / maxDimWeight) * 0.4
    }
    if (b.type && weights.typeWeights[b.type]) {
      scoreB += (weights.typeWeights[b.type] / maxTypeWeight) * 0.6
    }
    if (b.dimension && weights.dimensionWeights[b.dimension]) {
      scoreB += (weights.dimensionWeights[b.dimension] / maxDimWeight) * 0.4
    }

    if (a.level !== b.level) {
      const levelOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
      const levelDiff = (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3)
      if (levelDiff !== 0) return levelDiff
    }
    return scoreB - scoreA
  })

  return sorted
}

export async function getFeedbackStats(
  userId: number | null,
  sessionId: string | null,
): Promise<FeedbackStats> {
  const stored = await getUserPreference(userId, sessionId, 'feedback_stats')
  if (!stored) return { ...DEFAULT_FEEDBACK }
  try {
    return { ...DEFAULT_FEEDBACK, ...JSON.parse(stored as string) }
  } catch {
    return { ...DEFAULT_FEEDBACK }
  }
}

export async function recordRiskFeedback(
  userId: number | null,
  sessionId: string | null,
  _riskId: string,
  riskType: string,
  isAccurate: boolean,
): Promise<FeedbackStats> {
  const stats = await getFeedbackStats(userId, sessionId)
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

  await setUserPreference(userId, sessionId, 'feedback_stats', JSON.stringify(stats))
  return stats
}
