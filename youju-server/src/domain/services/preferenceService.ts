import {
  applyRiskWeights,
  getDraftStyle,
  getFeedbackStats,
  getRiskWeights,
  recordChecklistAction,
  recordDraftCopy,
  recordDraftEdit,
  recordRiskFeedback,
} from '../../infrastructure/memory.js'
import type { DraftStylePreferences, FeedbackStats, Risk, RiskWeightPreferences } from '../types.js'

export async function getUserRiskWeights(
  userId: number | null,
  sessionId: string | null,
): Promise<RiskWeightPreferences> {
  return getRiskWeights(userId, sessionId)
}

export async function recordChecklistPreference(
  userId: number | null,
  sessionId: string | null,
  riskType: string,
  dimension: string | undefined,
  checked: boolean,
): Promise<RiskWeightPreferences> {
  return recordChecklistAction(userId, sessionId, riskType, dimension, checked)
}

export async function getUserDraftStyle(
  userId: number | null,
  sessionId: string | null,
): Promise<DraftStylePreferences> {
  return getDraftStyle(userId, sessionId)
}

export async function recordDraftCopyPreference(
  userId: number | null,
  sessionId: string | null,
  riskType?: string,
): Promise<DraftStylePreferences> {
  return recordDraftCopy(userId, sessionId, riskType)
}

export async function recordDraftEditPreference(
  userId: number | null,
  sessionId: string | null,
  editCount: number = 1,
): Promise<DraftStylePreferences> {
  return recordDraftEdit(userId, sessionId, editCount)
}

export function sortRisksByPreference<T extends Risk>(
  risks: T[],
  weights: RiskWeightPreferences,
): T[] {
  return applyRiskWeights(risks, weights)
}

export async function getUserFeedbackStats(
  userId: number | null,
  sessionId: string | null,
): Promise<FeedbackStats> {
  return getFeedbackStats(userId, sessionId)
}

export async function recordRiskFeedbackPreference(
  userId: number | null,
  sessionId: string | null,
  riskId: string,
  riskType: string,
  isAccurate: boolean,
): Promise<FeedbackStats> {
  return recordRiskFeedback(userId, sessionId, riskId, riskType, isAccurate)
}
