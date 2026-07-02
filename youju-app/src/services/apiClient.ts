import type { ApiResponse, User } from '../types'
import { ApiError, ErrorCode, getErrorCodeFromStatus } from './errorHandler'

const DEFAULT_TIMEOUT = 30000
const DEFAULT_RETRIES = 2
const RETRY_DELAY = 1000
const REFRESH_THRESHOLD = 5 * 60 * 1000

const isDev = import.meta.env.DEV

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const buildUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  if (path.startsWith('/api')) {
    return `${API_BASE_URL}${path.slice('/api'.length)}`
  }
  return path
}

const getSessionId = () => {
  let sessionId = localStorage.getItem('youju_session_id')
  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('youju_session_id', sessionId)
  }
  return sessionId
}

const getToken = () => {
  return localStorage.getItem('youju_token')
}

const getRefreshToken = () => {
  return localStorage.getItem('youju_refresh_token')
}

const getUser = (): User | null => {
  const userStr = localStorage.getItem('youju_user')
  return userStr ? JSON.parse(userStr) : null
}

const parseJwt = (token: string): Record<string, unknown> | null => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

const getTokenExpiration = (token: string): number | null => {
  const payload = parseJwt(token)
  if (payload && typeof payload.exp === 'number') {
    return payload.exp * 1000
  }
  return null
}

const isTokenExpiring = (token: string): boolean => {
  const expiration = getTokenExpiration(token)
  if (!expiration) return false
  return expiration - Date.now() < REFRESH_THRESHOLD
}

let refreshPromise: Promise<string | null> | null = null

const performRefresh = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(buildUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data.code === 200 && data.data?.token) {
      authStorage.setToken(data.data.token)
      authStorage.setRefreshToken(data.data.refreshToken)
      return data.data.token
    }
    return null
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetriableError = (error: unknown, response?: Response): boolean => {
  if (response) {
    return response.status >= 500 || response.status === 429
  }
  return (
    error instanceof TypeError ||
    (error as Error).message?.includes('fetch') ||
    (error as Error).message?.includes('network')
  )
}

const logRequest = (url: string, options: RequestInit) => {
  if (!isDev) return
  const method = options.method || 'GET'
  const body = options.body instanceof FormData ? '[FormData]' : options.body
  console.log(`[API Request] ${method} ${url}`, { headers: options.headers, body })
}

const logResponse = (url: string, status: number, data: unknown, duration: number) => {
  if (!isDev) return
  const method = url.startsWith('/api') ? 'API' : 'External'
  console.log(`[API Response] ${method} ${url} ${status} (${duration}ms)`, data)
}

const validateResponse = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 200) {
    const code = getErrorCodeFromStatus(response.code)
    throw new ApiError(code, response.msg || '请求失败', response.code, response.data)
  }
  return response.data
}

export const apiClient = {
  async request<T = unknown>(
    url: string,
    options: RequestInit & { retries?: number; timeout?: number; signal?: AbortSignal | null } = {},
  ): Promise<T> {
    const {
      retries = DEFAULT_RETRIES,
      timeout = DEFAULT_TIMEOUT,
      signal: externalSignal,
      ...fetchOptions
    } = options
    const headers = new Headers(fetchOptions.headers || {})

    let token = getToken()
    const sessionId = getSessionId()

    if (token && isTokenExpiring(token)) {
      if (!refreshPromise) {
        refreshPromise = performRefresh()
      }
      const newToken = await refreshPromise
      if (newToken) {
        token = newToken
      }
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    } else if (sessionId) {
      headers.set('X-Session-Id', sessionId)
    }

    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const abortSignal = externalSignal ?? controller.signal

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort())
    }

    let lastError: unknown
    const startTime = Date.now()

    const finalUrl = buildUrl(url)

    logRequest(finalUrl, { ...fetchOptions, headers, signal: abortSignal })

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        await sleep(RETRY_DELAY * 2 ** (attempt - 1))
      }

      try {
        const response = await fetch(finalUrl, { ...fetchOptions, headers, signal: abortSignal })
        clearTimeout(timeoutId)

        const duration = Date.now() - startTime

        if (response.ok) {
          const data = await response.json()
          logResponse(url, response.status, data, duration)

          try {
            return validateResponse<T>(data)
          } catch (validationError) {
            logResponse(url, response.status, { error: 'Validation failed', data }, duration)
            throw validationError
          }
        }

        const errorData = await response.json().catch(() => ({}))
        logResponse(url, response.status, { error: errorData }, duration)

        if (response.status === 401) {
          if (refreshPromise) {
            await refreshPromise
            refreshPromise = null
            token = getToken()
            if (token) {
              headers.set('Authorization', `Bearer ${token}`)
              continue
            }
          } else if (!url.includes('/api/auth/')) {
            const refreshToken = getRefreshToken()
            if (refreshToken) {
              refreshPromise = performRefresh()
              const newToken = await refreshPromise
              refreshPromise = null
              if (newToken) {
                token = newToken
                headers.set('Authorization', `Bearer ${token}`)
                continue
              }
            }
          }

          const code = ErrorCode.AUTH_ERROR
          throw new ApiError(code, errorData.msg || '登录失效', response.status, errorData)
        }

        if (!isRetriableError(null, response) || attempt >= retries) {
          const code = getErrorCodeFromStatus(response.status)
          throw new ApiError(
            code,
            errorData.msg || `请求失败: ${response.status}`,
            response.status,
            errorData,
          )
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId)
        lastError = error

        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError(ErrorCode.TIMEOUT_ERROR, '请求超时，请稍后重试', 408, null, error)
        }

        if (error instanceof ApiError) {
          throw error
        }

        if (!isRetriableError(error) || attempt >= retries) {
          throw new ApiError(
            ErrorCode.NETWORK_ERROR,
            '网络连接失败，请检查网络',
            -1,
            null,
            error instanceof Error ? error : undefined,
          )
        }

        if (isDev) {
          console.warn(
            `[API Retry] ${attempt + 1}/${retries}:`,
            error instanceof Error ? error.message : String(error),
          )
        }
      }
    }

    throw lastError || new ApiError(ErrorCode.SERVER_ERROR, '请求失败', 500)
  },

  get<T = unknown>(url: string, options?: Partial<RequestInit>): Promise<T> {
    return this.request<T>(url, { method: 'GET', ...options })
  },

  post<T = unknown>(url: string, body?: unknown, options?: Partial<RequestInit>): Promise<T> {
    const isFormData = body instanceof FormData
    return this.request<T>(url, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      ...options,
    })
  },

  put<T = unknown>(url: string, body?: unknown, options?: Partial<RequestInit>): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    })
  },

  delete<T = unknown>(url: string, options?: Partial<RequestInit>): Promise<T> {
    return this.request<T>(url, { method: 'DELETE', ...options })
  },
}

export const authStorage = {
  getToken,
  getRefreshToken,
  getUser,
  setToken(token: string | null) {
    if (token) {
      localStorage.setItem('youju_token', token)
    } else {
      localStorage.removeItem('youju_token')
    }
  },
  setRefreshToken(refreshToken: string | null) {
    if (refreshToken) {
      localStorage.setItem('youju_refresh_token', refreshToken)
    } else {
      localStorage.removeItem('youju_refresh_token')
    }
  },
  setUser(user: User | null) {
    if (user) {
      localStorage.setItem('youju_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('youju_user')
    }
  },
  getSessionId,
}
