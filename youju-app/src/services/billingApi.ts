import { apiClient } from './apiClient'

export interface UsageStats {
  totalTokens: number
  promptTokens: number
  completionTokens: number
  estimatedCost: number
  totalAnalyses: number
  successRate: number
  byModel: Array<{
    model: string
    count: number
    tokens: number
    estimatedCost: number
  }>
  byDay: Array<{
    date: string
    count: number
    tokens: number
    avgDurationMs: number
  }>
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  priceUnit: string
  tokenQuota: number
  analysisQuota: number
}

export interface BillingInfo {
  currentPlan: SubscriptionPlan
  usage: UsageStats
}

export const billingApi = {
  getUsageStats: async (): Promise<UsageStats> => {
    return apiClient.get<UsageStats>('/api/admin/stats')
  },

  getBillingInfo: async (): Promise<BillingInfo> => {
    const stats = await billingApi.getUsageStats()
    return {
      currentPlan: {
        id: 'free',
        name: '免费版',
        price: 0,
        priceUnit: '/月',
        tokenQuota: 100000,
        analysisQuota: 3,
      },
      usage: stats,
    }
  },
}
