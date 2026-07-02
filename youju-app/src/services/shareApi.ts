import type { SharedReport } from '../types'
import { apiClient } from './apiClient'
import { handleApiError } from './errorHandler'

export interface CreateShareParams {
  taskId: string
  expiresInDays?: number
}

export interface ShareResult {
  token: string
  expiresAt?: string
}

export const shareApi = {
  async createShare(params: CreateShareParams): Promise<ShareResult> {
    try {
      const { taskId, expiresInDays = 7 } = params
      return await apiClient.post<ShareResult>(`/api/share/${taskId}`, { expiresInDays })
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async getSharedReport(token: string): Promise<SharedReport> {
    try {
      return await apiClient.get<SharedReport>(`/api/share/${token}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },
}
