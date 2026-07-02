import type { User } from '../types'
import { apiClient, authStorage } from './apiClient'
import { handleApiError } from './errorHandler'

export interface LoginResult {
  token: string
  refreshToken: string
  user: User
}

export interface WechatQrCodeResult {
  qrCodeUrl: string
  state: string
}

export interface WechatPollResult {
  status: 'pending' | 'success' | 'failed'
  data?: LoginResult
}

export const authApi = {
  async wechatLogin(code: string): Promise<LoginResult> {
    try {
      const result = await apiClient.post<LoginResult>('/api/auth/wechat', { code })
      if (result.token) {
        authStorage.setToken(result.token)
        authStorage.setRefreshToken(result.refreshToken)
      }
      return result
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async wechatQrCode(): Promise<WechatQrCodeResult> {
    try {
      return await apiClient.get<WechatQrCodeResult>('/api/auth/wechat/qrcode')
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async wechatLoginPoll(state: string): Promise<WechatPollResult> {
    try {
      return await apiClient.get<WechatPollResult>(`/api/auth/wechat/poll/${state}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async emailLogin(email: string, password: string): Promise<LoginResult> {
    try {
      const result = await apiClient.post<LoginResult>('/api/auth/email', { email, password })
      if (result.token) {
        authStorage.setToken(result.token)
        authStorage.setRefreshToken(result.refreshToken)
      }
      return result
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async register(email: string, password: string, nickname: string): Promise<LoginResult> {
    try {
      const result = await apiClient.post<LoginResult>('/api/auth/register', {
        email,
        password,
        nickname,
      })
      if (result.token) {
        authStorage.setToken(result.token)
        authStorage.setRefreshToken(result.refreshToken)
      }
      return result
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      const result = await apiClient.post<LoginResult>('/api/auth/refresh', { refreshToken })
      if (result.token) {
        authStorage.setToken(result.token)
        authStorage.setRefreshToken(result.refreshToken)
      }
      return result
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async getUserInfo(): Promise<User> {
    try {
      return await apiClient.get<User>('/api/user/info')
    } catch (error) {
      throw handleApiError(error)
    }
  },

  logout(): void {
    authStorage.setToken(null)
    authStorage.setRefreshToken(null)
    authStorage.setUser(null)
  },
}
