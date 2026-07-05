import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SharedReport, SharePermission, User } from '../types'

type PageType = 'home' | 'workspace' | 'share'
type Theme = 'light' | 'dark'
type DefaultScenario = 'jobOffer' | 'rentContract' | 'homework' | 'custom'
type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html'
type ReportStyle = 'standard' | 'detailed' | 'executive' | 'technical'
type DataRetention = '30days' | '90days' | '180days' | '1year' | 'forever'
export type RiskViewType = 'tree' | 'list' | 'kanban' | 'grouped'

interface SystemStats {
  totalAnalyses?: number
  totalUsers?: number
  totalSources?: number
  avgDurationMs?: number
  [key: string]: unknown
}

interface GeneralSettings {
  language: 'zh-CN' | 'en-US'
  theme: Theme
  defaultScenario: DefaultScenario
  autoSaveDraft: boolean
}

interface AnalysisSettings {
  defaultModel: string
  autoSave: boolean
  confidenceThreshold: number
  incrementalAnalysis: boolean
  autoValidate: boolean
}

interface NotificationSettings {
  emailNotification: boolean
  desktopNotification: boolean
  analysisCompleteReminder: boolean
  weeklyDigest: boolean
  soundEnabled: boolean
}

interface ExportSettings {
  defaultFormat: ExportFormat
  reportStyle: ReportStyle
  watermarkEnabled: boolean
  watermarkText: string
  includeEvidence: boolean
  includeCharts: boolean
}

interface PrivacySecuritySettings {
  dataRetention: DataRetention
  autoDeleteEnabled: boolean
  autoDeleteDays: number
  localEncryption: boolean
  analyticsOptOut: boolean
}

interface CustomShortcutOverride {
  key?: string
  modifiers?: ('ctrl' | 'meta' | 'alt' | 'shift')[]
  disabled?: boolean
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
  sharePermission: SharePermission
  sysStats: SystemStats | null
  loadingStats: boolean
  globalDragOver: boolean
  theme: Theme
  showPreferencePanel: boolean
  showMonitorPanel: boolean
  showKeyboardShortcuts: boolean
  showProductTour: boolean
  activePreferenceTab: PreferenceTab

  generalSettings: GeneralSettings
  analysisSettings: AnalysisSettings
  notificationSettings: NotificationSettings
  exportSettings: ExportSettings
  privacySecuritySettings: PrivacySecuritySettings
  customShortcuts: Record<string, CustomShortcutOverride>
  riskView: RiskViewType

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
  setSharePermission: (permission: SharePermission) => void
  setSysStats: (stats: SystemStats | null) => void
  setLoadingStats: (loading: boolean) => void
  setGlobalDragOver: (over: boolean) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setShowPreferencePanel: (show: boolean) => void
  setShowMonitorPanel: (show: boolean) => void
  setShowKeyboardShortcuts: (show: boolean) => void
  setShowProductTour: (show: boolean) => void
  restartProductTour: () => void
  setActivePreferenceTab: (tab: PreferenceTab) => void

  updateGeneralSettings: (settings: Partial<GeneralSettings>) => void
  updateAnalysisSettings: (settings: Partial<AnalysisSettings>) => void
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void
  updateExportSettings: (settings: Partial<ExportSettings>) => void
  updatePrivacySecuritySettings: (settings: Partial<PrivacySecuritySettings>) => void
  resetAllSettings: () => void
  setCustomShortcut: (shortcutId: string, override: CustomShortcutOverride) => void
  resetCustomShortcuts: () => void
  setRiskView: (view: RiskViewType) => void
}

export type PreferenceTab =
  | 'general'
  | 'analysis'
  | 'notifications'
  | 'export'
  | 'privacy'
  | 'memory'
  | 'shortcuts'

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

const DEFAULT_GENERAL: GeneralSettings = {
  language: 'zh-CN',
  theme: 'light',
  defaultScenario: 'custom',
  autoSaveDraft: true,
}

const DEFAULT_ANALYSIS: AnalysisSettings = {
  defaultModel: 'gpt-4o',
  autoSave: true,
  confidenceThreshold: 70,
  incrementalAnalysis: true,
  autoValidate: true,
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  emailNotification: true,
  desktopNotification: false,
  analysisCompleteReminder: true,
  weeklyDigest: false,
  soundEnabled: true,
}

const DEFAULT_EXPORT: ExportSettings = {
  defaultFormat: 'pdf',
  reportStyle: 'standard',
  watermarkEnabled: false,
  watermarkText: '有居分析',
  includeEvidence: true,
  includeCharts: true,
}

const DEFAULT_PRIVACY_SECURITY: PrivacySecuritySettings = {
  dataRetention: '90days',
  autoDeleteEnabled: false,
  autoDeleteDays: 180,
  localEncryption: false,
  analyticsOptOut: false,
}

const DEFAULT_CUSTOM_SHORTCUTS: Record<string, CustomShortcutOverride> = {}

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
      sharePermission: 'view',
      sysStats: null,
      loadingStats: false,
      globalDragOver: false,
      theme: getInitialTheme(),
      showPreferencePanel: false,
      showMonitorPanel: false,
      showKeyboardShortcuts: false,
      showProductTour: false,
      activePreferenceTab: 'general',

      generalSettings: DEFAULT_GENERAL,
      analysisSettings: DEFAULT_ANALYSIS,
      notificationSettings: DEFAULT_NOTIFICATIONS,
      exportSettings: DEFAULT_EXPORT,
      privacySecuritySettings: DEFAULT_PRIVACY_SECURITY,
      customShortcuts: DEFAULT_CUSTOM_SHORTCUTS,
      riskView: 'tree',

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
      setSharePermission: (sharePermission) => set({ sharePermission }),
      setSysStats: (sysStats) => set({ sysStats }),
      setLoadingStats: (loadingStats) => set({ loadingStats }),
      setGlobalDragOver: (globalDragOver) => set({ globalDragOver }),
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
        set((state) => ({
          generalSettings: { ...state.generalSettings, theme },
        }))
      },
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })
        applyTheme(newTheme)
        set((state) => ({
          generalSettings: { ...state.generalSettings, theme: newTheme },
        }))
      },
      setShowPreferencePanel: (showPreferencePanel) => set({ showPreferencePanel }),
      setShowMonitorPanel: (showMonitorPanel) => set({ showMonitorPanel }),
      setShowKeyboardShortcuts: (showKeyboardShortcuts) => set({ showKeyboardShortcuts }),
      setShowProductTour: (showProductTour) => set({ showProductTour }),
      restartProductTour: () => {
        localStorage.removeItem('youju_tour_completed')
        set({ showProductTour: true })
      },
      setActivePreferenceTab: (activePreferenceTab) => set({ activePreferenceTab }),

      updateGeneralSettings: (settings) =>
        set((state) => {
          const newSettings = { ...state.generalSettings, ...settings }
          if (settings.theme) {
            applyTheme(settings.theme)
          }
          return {
            generalSettings: newSettings,
            theme: newSettings.theme,
          }
        }),
      updateAnalysisSettings: (settings) =>
        set((state) => ({
          analysisSettings: { ...state.analysisSettings, ...settings },
        })),
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...settings },
        })),
      updateExportSettings: (settings) =>
        set((state) => ({
          exportSettings: { ...state.exportSettings, ...settings },
        })),
      updatePrivacySecuritySettings: (settings) =>
        set((state) => ({
          privacySecuritySettings: { ...state.privacySecuritySettings, ...settings },
        })),
      resetAllSettings: () =>
        set({
          generalSettings: DEFAULT_GENERAL,
          analysisSettings: DEFAULT_ANALYSIS,
          notificationSettings: DEFAULT_NOTIFICATIONS,
          exportSettings: DEFAULT_EXPORT,
          privacySecuritySettings: DEFAULT_PRIVACY_SECURITY,
          customShortcuts: DEFAULT_CUSTOM_SHORTCUTS,
        }),
      setCustomShortcut: (shortcutId, override) =>
        set((state) => ({
          customShortcuts: {
            ...state.customShortcuts,
            [shortcutId]: override,
          },
        })),
      resetCustomShortcuts: () =>
        set({
          customShortcuts: DEFAULT_CUSTOM_SHORTCUTS,
        }),
      setRiskView: (view) => set({ riskView: view }),
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
        generalSettings: state.generalSettings,
        analysisSettings: state.analysisSettings,
        notificationSettings: state.notificationSettings,
        exportSettings: state.exportSettings,
        privacySecuritySettings: state.privacySecuritySettings,
        activePreferenceTab: state.activePreferenceTab,
        customShortcuts: state.customShortcuts,
        riskView: state.riskView,
        shareExpiryDays: state.shareExpiryDays,
        sharePermission: state.sharePermission,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme)
        }
      },
    },
  ),
)
