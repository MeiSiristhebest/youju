import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SharedReport, User } from '../types'

type PageType = 'home' | 'workspace' | 'share'
type Theme = 'light' | 'dark'

interface SystemStats {
  totalAnalyses?: number
  totalUsers?: number
  totalSources?: number
  avgDurationMs?: number
  [key: string]: unknown
}

interface UIPreferenceState {
  page: PageType
  user: User | null
  token: string | null
  sessionId: string | null
  showLoginModal: boolean
  loggingIn: boolean
  showShareModal: boolean
  shareLink: string
  shareExpired: string
  creatingShare: boolean
  sharedReport: SharedReport | null
  shareError: string
  copied: boolean
  shareViewCount: number
  shareExpiryDays: number | null
  sysStats: SystemStats | null
  loadingStats: boolean
  globalDragOver: boolean
  theme: Theme
  showPreferencePanel: boolean
  showMonitorPanel: boolean
  showKeyboardShortcuts: boolean

  setPage: (page: PageType) => void
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setSessionId: (sessionId: string | null) => void
  setShowLoginModal: (show: boolean) => void
  setLoggingIn: (logging: boolean) => void
  setShowShareModal: (show: boolean) => void
  setShareLink: (link: string) => void
  setShareExpired: (expired: string) => void
  setCreatingShare: (creating: boolean) => void
  setSharedReport: (report: SharedReport | null) => void
  setShareError: (error: string) => void
  setCopied: (copied: boolean) => void
  setShareViewCount: (count: number) => void
  setShareExpiryDays: (days: number | null) => void
  setSysStats: (stats: SystemStats | null) => void
  setLoadingStats: (loading: boolean) => void
  setGlobalDragOver: (over: boolean) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setShowPreferencePanel: (show: boolean) => void
  setShowMonitorPanel: (show: boolean) => void
  setShowKeyboardShortcuts: (show: boolean) => void
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useUIPreferenceStore = create<UIPreferenceState>()(
  persist(
    (set, get) => ({
      page: 'home',
      user: null,
      token: null,
      sessionId: null,
      showLoginModal: false,
      loggingIn: false,
      showShareModal: false,
      shareLink: '',
      shareExpired: '',
      creatingShare: false,
      sharedReport: null,
      shareError: '',
      copied: false,
      shareViewCount: 0,
      shareExpiryDays: 7,
      sysStats: null,
      loadingStats: false,
      globalDragOver: false,
      theme: getInitialTheme(),
      showPreferencePanel: false,
      showMonitorPanel: false,
      showKeyboardShortcuts: false,

      setPage: (page) => set({ page }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setSessionId: (sessionId) => set({ sessionId }),
      setShowLoginModal: (showLoginModal) => set({ showLoginModal }),
      setLoggingIn: (loggingIn) => set({ loggingIn }),
      setShowShareModal: (showShareModal) => set({ showShareModal }),
      setShareLink: (shareLink) => set({ shareLink }),
      setShareExpired: (shareExpired) => set({ shareExpired }),
      setCreatingShare: (creatingShare) => set({ creatingShare }),
      setSharedReport: (sharedReport) => set({ sharedReport }),
      setShareError: (shareError) => set({ shareError }),
      setCopied: (copied) => set({ copied }),
      setShareViewCount: (shareViewCount) => set({ shareViewCount }),
      setShareExpiryDays: (shareExpiryDays) => set({ shareExpiryDays }),
      setSysStats: (sysStats) => set({ sysStats }),
      setLoadingStats: (loadingStats) => set({ loadingStats }),
      setGlobalDragOver: (globalDragOver) => set({ globalDragOver }),
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })
        applyTheme(newTheme)
      },
      setShowPreferencePanel: (showPreferencePanel) => set({ showPreferencePanel }),
      setShowMonitorPanel: (showMonitorPanel) => set({ showMonitorPanel }),
      setShowKeyboardShortcuts: (showKeyboardShortcuts) => set({ showKeyboardShortcuts }),
    }),
    {
      name: 'youju-ui-preferences',
      partialize: (state) => ({
        theme: state.theme,
        showPreferencePanel: state.showPreferencePanel,
        showMonitorPanel: state.showMonitorPanel,
        token: state.token,
        sessionId: state.sessionId,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme)
        }
      },
    },
  ),
)
