import type { PreferenceRepository } from '../ports/repositories.js'
import type { DraftStylePreferences, FeedbackStats, Risk, RiskWeightPreferences } from '../types.js'

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

// 通知设置默认值
const DEFAULT_NOTIFICATION_SETTINGS = {
  emailNotifications: true,
  analysisComplete: true,
  weeklyDigest: false,
  productUpdates: true,
}

// 隐私设置默认值
const DEFAULT_PRIVACY_SETTINGS = {
  shareUsageData: false,
  allowAnalytics: true,
  autoDeleteHistory: false,
  retentionDays: 90,
}

export type NotificationSettings = typeof DEFAULT_NOTIFICATION_SETTINGS
export type PrivacySettings = typeof DEFAULT_PRIVACY_SETTINGS

export class PreferenceService {
  constructor(private readonly preferenceRepo: PreferenceRepository) {}

  private async getJsonPreference<T>(
    userId: number | null,
    sessionId: string | null,
    key: string,
    defaultVal: T,
  ): Promise<T> {
    const stored = await this.preferenceRepo.getUserPreference(userId, sessionId, key)
    if (!stored || typeof stored !== 'string') return { ...defaultVal }
    try {
      return { ...defaultVal, ...JSON.parse(stored) }
    } catch {
      return { ...defaultVal }
    }
  }

  private async setJsonPreference(
    userId: number | null,
    sessionId: string | null,
    key: string,
    value: unknown,
  ): Promise<void> {
    await this.preferenceRepo.setUserPreference(userId, sessionId, key, JSON.stringify(value))
  }

  async getUserRiskWeights(
    userId: number | null,
    sessionId: string | null,
  ): Promise<RiskWeightPreferences> {
    return this.getJsonPreference(userId, sessionId, 'risk_weights', DEFAULT_RISK_WEIGHTS)
  }

  async recordChecklistPreference(
    userId: number | null,
    sessionId: string | null,
    riskType: string,
    dimension: string | undefined,
    checked: boolean,
  ): Promise<RiskWeightPreferences> {
    const prefs = await this.getUserRiskWeights(userId, sessionId)
    prefs.totalChecks += 1

    if (checked) {
      prefs.typeWeights[riskType] = (prefs.typeWeights[riskType] || 0) + 1
      if (dimension) {
        prefs.dimensionWeights[dimension] = (prefs.dimensionWeights[dimension] || 0) + 1
      }
    }

    prefs.lastUpdated = new Date().toISOString()
    await this.setJsonPreference(userId, sessionId, 'risk_weights', prefs)
    return prefs
  }

  async getUserDraftStyle(
    userId: number | null,
    sessionId: string | null,
  ): Promise<DraftStylePreferences> {
    return this.getJsonPreference(userId, sessionId, 'draft_style', DEFAULT_DRAFT_STYLE)
  }

  async recordDraftCopyPreference(
    userId: number | null,
    sessionId: string | null,
    _riskType?: string,
  ): Promise<DraftStylePreferences> {
    const prefs = await this.getUserDraftStyle(userId, sessionId)
    prefs.totalCopies += 1
    prefs.lastUpdated = new Date().toISOString()
    await this.setJsonPreference(userId, sessionId, 'draft_style', prefs)
    return prefs
  }

  async recordDraftEditPreference(
    userId: number | null,
    sessionId: string | null,
    editCount: number = 1,
  ): Promise<DraftStylePreferences> {
    const prefs = await this.getUserDraftStyle(userId, sessionId)
    prefs.totalEdits += editCount
    prefs.lastUpdated = new Date().toISOString()

    if (prefs.totalEdits > 3) {
      const editRatio = prefs.totalEdits / (prefs.totalCopies + 1)
      if (editRatio > 0.5) {
        prefs.formality = Math.min(1, prefs.formality + 0.1)
        prefs.conciseness = Math.max(0, prefs.conciseness - 0.05)
      }
    }

    await this.setJsonPreference(userId, sessionId, 'draft_style', prefs)
    return prefs
  }

  sortRisksByPreference<T extends Risk>(risks: T[], weights: RiskWeightPreferences): T[] {
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

  async getUserFeedbackStats(
    userId: number | null,
    sessionId: string | null,
  ): Promise<FeedbackStats> {
    return this.getJsonPreference(userId, sessionId, 'feedback_stats', DEFAULT_FEEDBACK)
  }

  async recordRiskFeedbackPreference(
    userId: number | null,
    sessionId: string | null,
    _riskId: string,
    riskType: string,
    isAccurate: boolean,
  ): Promise<FeedbackStats> {
    const stats = await this.getUserFeedbackStats(userId, sessionId)
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

    await this.setJsonPreference(userId, sessionId, 'feedback_stats', stats)
    return stats
  }

  // ========== 通知设置 ==========

  async getUserNotificationSettings(
    userId: number | null,
    sessionId: string | null,
  ): Promise<NotificationSettings> {
    return this.getJsonPreference(
      userId,
      sessionId,
      'notification_settings',
      DEFAULT_NOTIFICATION_SETTINGS,
    )
  }

  async setUserNotificationSettings(
    userId: number | null,
    sessionId: string | null,
    settings: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> {
    const current = await this.getUserNotificationSettings(userId, sessionId)
    const updated = { ...current, ...settings }
    await this.setJsonPreference(userId, sessionId, 'notification_settings', updated)
    return updated
  }

  // ========== 隐私设置 ==========

  async getUserPrivacySettings(
    userId: number | null,
    sessionId: string | null,
  ): Promise<PrivacySettings> {
    return this.getJsonPreference(userId, sessionId, 'privacy_settings', DEFAULT_PRIVACY_SETTINGS)
  }

  async setUserPrivacySettings(
    userId: number | null,
    sessionId: string | null,
    settings: Partial<PrivacySettings>,
  ): Promise<PrivacySettings> {
    const current = await this.getUserPrivacySettings(userId, sessionId)
    const updated = { ...current, ...settings }
    await this.setJsonPreference(userId, sessionId, 'privacy_settings', updated)
    return updated
  }
}
