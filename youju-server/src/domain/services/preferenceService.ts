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

export class PreferenceService {
  async getUserRiskWeights(
    userId: number | null,
    sessionId: string | null,
  ): Promise<RiskWeightPreferences> {
    return getRiskWeights(userId, sessionId)
  }

  async recordChecklistPreference(
    userId: number | null,
    sessionId: string | null,
    riskType: string,
    dimension: string | undefined,
    checked: boolean,
  ): Promise<RiskWeightPreferences> {
    return recordChecklistAction(userId, sessionId, riskType, dimension, checked)
  }

  async getUserDraftStyle(
    userId: number | null,
    sessionId: string | null,
  ): Promise<DraftStylePreferences> {
    return getDraftStyle(userId, sessionId)
  }

  async recordDraftCopyPreference(
    userId: number | null,
    sessionId: string | null,
    riskType?: string,
  ): Promise<DraftStylePreferences> {
    return recordDraftCopy(userId, sessionId, riskType)
  }

  async recordDraftEditPreference(
    userId: number | null,
    sessionId: string | null,
    editCount: number = 1,
  ): Promise<DraftStylePreferences> {
    return recordDraftEdit(userId, sessionId, editCount)
  }

  sortRisksByPreference<T extends Risk>(risks: T[], weights: RiskWeightPreferences): T[] {
    return applyRiskWeights(risks, weights)
  }

  async getUserFeedbackStats(
    userId: number | null,
    sessionId: string | null,
  ): Promise<FeedbackStats> {
    return getFeedbackStats(userId, sessionId)
  }

  async recordRiskFeedbackPreference(
    userId: number | null,
    sessionId: string | null,
    riskId: string,
    riskType: string,
    isAccurate: boolean,
  ): Promise<FeedbackStats> {
    return recordRiskFeedback(userId, sessionId, riskId, riskType, isAccurate)
  }
}
