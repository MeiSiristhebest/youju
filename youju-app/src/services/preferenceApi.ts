import { apiClient } from './apiClient'

// 通知设置类型
export interface NotificationSettings {
  emailNotifications: boolean
  analysisComplete: boolean
  weeklyDigest: boolean
  productUpdates: boolean
}

// 隐私设置类型
export interface PrivacySettings {
  shareUsageData: boolean
  allowAnalytics: boolean
  autoDeleteHistory: boolean
  retentionDays: number
}

export const preferenceApi = {
  // 获取通知设置
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    return apiClient.get<NotificationSettings>('/api/preferences/notifications')
  },

  // 更新通知设置
  setNotificationSettings: async (
    settings: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> => {
    return apiClient.post<NotificationSettings>('/api/preferences/notifications', settings)
  },

  // 获取隐私设置
  getPrivacySettings: async (): Promise<PrivacySettings> => {
    return apiClient.get<PrivacySettings>('/api/preferences/privacy')
  },

  // 更新隐私设置
  setPrivacySettings: async (settings: Partial<PrivacySettings>): Promise<PrivacySettings> => {
    return apiClient.post<PrivacySettings>('/api/preferences/privacy', settings)
  },
}
