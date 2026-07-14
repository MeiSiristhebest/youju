const STORAGE_PREFIX = 'youju_'

export interface StorageApi {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

const createStorageApi = (): StorageApi => {
  const getPrefixedKey = (key: string): string => {
    if (key.startsWith(STORAGE_PREFIX)) return key
    return `${STORAGE_PREFIX}${key}`
  }

  return {
    getItem: (key: string): string | null => {
      try {
        return localStorage.getItem(getPrefixedKey(key))
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        localStorage.setItem(getPrefixedKey(key), value)
      } catch {}
    },
    removeItem: (key: string): void => {
      try {
        localStorage.removeItem(getPrefixedKey(key))
      } catch {}
    },
    clear: (): void => {
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX))
        keys.forEach((k) => localStorage.removeItem(k))
      } catch {}
    },
  }
}

export const storage = createStorageApi()

export const storageKeys = {
  token: 'token',
  refreshToken: 'refresh_token',
  user: 'user',
  sessionId: 'session_id',
  theme: 'theme',
  language: 'language',
  tourCompleted: 'tour_completed',
  lastFailedAnalysisLog: 'last_failed_analysis_log',
  sources: 'sources',
  results: 'results',
  preferences: 'preferences',
} as const

export const jsonStorage = {
  getItem: <T>(key: string): T | null => {
    const raw = storage.getItem(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },
  setItem: <T>(key: string, value: T): void => {
    try {
      storage.setItem(key, JSON.stringify(value))
    } catch {}
  },
}

export const clearAllAppData = (): void => {
  storage.clear()
}
