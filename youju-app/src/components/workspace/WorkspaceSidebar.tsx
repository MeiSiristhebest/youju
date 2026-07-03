import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  History,
  Home,
  LogOut,
  Moon,
  PenLine,
  Plus,
  Server,
  Settings,
  Sparkles,
  Sun,
  User,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { SCENARIOS } from '../../constants/workspace'
import { useTranslation } from '../../i18n'
import { useUIPreferenceStore } from '../../stores'
import type { Scenario } from '../../types'

const scenarioIcons: Record<string, ReactNode> = {
  job: <Briefcase size={16} strokeWidth={1.5} />,
  rent: <Home size={16} strokeWidth={1.5} />,
  homework: <BookOpen size={16} strokeWidth={1.5} />,
}

interface WorkspaceSidebarProps {
  currentScenario: string | null
  user: { id: number; nickname: string; avatar: string; phone?: string } | null
  onGoHome: () => void
  onNewAnalysis: () => void
  onLoadScenario: (id: string) => void
  onShowHistory: () => void
  onShowLogin: () => void
  onLogout: () => void
  onShowPreference: () => void
  onShowModelSettings: () => void
  onShowMonitor: () => void
  onCollapse?: () => void
}

export function WorkspaceSidebar({
  currentScenario,
  user,
  onGoHome,
  onNewAnalysis,
  onLoadScenario,
  onShowHistory,
  onShowLogin,
  onLogout,
  onShowPreference,
  onShowModelSettings,
  onShowMonitor,
  onCollapse,
}: WorkspaceSidebarProps) {
  const { theme, toggleTheme } = useUIPreferenceStore()
  const { t } = useTranslation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <aside
      id="tour-sidebar"
      className="w-60 bg-paper border-r border-rule flex flex-col shrink-0"
      aria-label="主导航"
    >
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-rule">
        <button
          type="button"
          className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none hover:opacity-80 transition-opacity"
          onClick={onGoHome}
          aria-label="返回首页"
        >
          <div className="w-7 h-7 bg-ink rounded-md flex items-center justify-center">
            <Sparkles size={13} className="text-paper" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium text-ink font-display tracking-tight">YouJu</span>
        </button>
      </div>

      <div className="px-3 py-3 border-b border-rule">
        <button
          id="tour-new-analysis-btn"
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-ink text-paper cursor-pointer border-none hover:bg-accent transition-colors duration-200 group"
          onClick={onNewAnalysis}
        >
          <Plus
            size={14}
            strokeWidth={1.5}
            className="group-hover:scale-110 transition-transform duration-200"
          />
          {t('nav.newAnalysis')}
        </button>
      </div>

      <div className="px-2 py-3 space-y-0.5">
        <div
          className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.15em] px-3 mb-2 font-mono"
          id="workspace-nav-label"
        >
          {t('nav.workspace')}
        </div>
        <nav aria-labelledby="workspace-nav-label">
          <ul className="space-y-0.5 list-none p-0 m-0">
            <li>
              <button
                type="button"
                className="relative w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium bg-accent-bg text-accent cursor-pointer border border-transparent transition-colors duration-200"
                aria-current="page"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-accent rounded-r-full"></div>
                <BarChart3 size={15} strokeWidth={1.5} />
                {t('nav.analysisDesk')}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium text-ink-muted bg-paper-dark/60 hover:bg-paper-dark hover:text-ink cursor-pointer border border-rule/60 transition-colors duration-200"
                onClick={onShowHistory}
              >
                <History size={15} strokeWidth={1.5} />
                {t('nav.history')}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="px-3">
        <div className="h-px bg-rule-soft"></div>
      </div>

      <div className="px-2 py-3 flex-1 overflow-y-auto">
        <div
          className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.15em] px-3 mb-2 flex items-center justify-between font-mono"
          id="scenario-nav-label"
        >
          <span>{t('nav.scenarioTemplates')}</span>
        </div>
        <nav aria-labelledby="scenario-nav-label">
          <ul className="space-y-0.5 list-none p-0 m-0">
            {SCENARIOS.map((s: Scenario) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`relative w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors duration-200 ${
                    currentScenario === s.id
                      ? 'bg-paper-dark text-ink border border-rule'
                      : 'text-ink-muted bg-paper-dark/40 hover:bg-paper-dark hover:text-ink border border-rule/40'
                  }`}
                  onClick={() => onLoadScenario(s.id)}
                  aria-current={currentScenario === s.id ? 'page' : undefined}
                >
                  {currentScenario === s.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-accent rounded-r-full"></div>
                  )}
                  {scenarioIcons[s.id] || <PenLine size={15} strokeWidth={1.5} />}
                  <span className="flex-1 text-left truncate">{s.name}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={`relative w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors duration-200 ${
                  currentScenario === null
                    ? 'bg-paper-dark text-ink border border-rule'
                    : 'text-ink-muted bg-paper-dark/40 hover:bg-paper-dark hover:text-ink border border-rule/40'
                }`}
                onClick={onNewAnalysis}
                aria-current={currentScenario === null ? 'page' : undefined}
              >
                {currentScenario === null && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-accent rounded-r-full"></div>
                )}
                <PenLine size={15} strokeWidth={1.5} />
                <span className="flex-1 text-left truncate">{t('nav.custom')}</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="px-2 py-2 border-t border-rule space-y-0.5">
        <button
          type="button"
          onClick={onShowPreference}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-ink-muted bg-paper-dark/60 hover:bg-paper-dark hover:text-ink cursor-pointer border border-rule/60 transition-colors duration-200"
        >
          <Settings size={15} strokeWidth={1.5} />
          <span className="flex-1 text-left">{t('nav.preferences')}</span>
        </button>

        <button
          type="button"
          onClick={onShowModelSettings}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-ink-muted bg-paper-dark/60 hover:bg-paper-dark hover:text-ink cursor-pointer border border-rule/60 transition-colors duration-200"
        >
          <Server size={15} strokeWidth={1.5} />
          <span className="flex-1 text-left">模型设置</span>
        </button>

        <button
          type="button"
          onClick={onShowMonitor}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-ink-muted bg-paper-dark/60 hover:bg-paper-dark hover:text-ink cursor-pointer border border-rule/60 transition-colors duration-200"
        >
          <Activity size={15} strokeWidth={1.5} />
          <span className="flex-1 text-left">{t('nav.systemMonitor')}</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-ink-muted bg-paper-dark/60 hover:bg-paper-dark hover:text-ink cursor-pointer border border-rule/60 transition-colors duration-200"
        >
          {theme === 'light' ? (
            <Moon size={15} strokeWidth={1.5} />
          ) : (
            <Sun size={15} strokeWidth={1.5} />
          )}
          <span className="flex-1 text-left">
            {theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
          </span>
        </button>

        {user ? (
          <div className="relative">
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-paper-dark cursor-pointer transition-colors duration-200"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="用户菜单"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.nickname}
                  className="w-6 h-6 rounded-md border border-rule"
                />
              ) : (
                <div className="w-6 h-6 rounded-md border border-rule bg-paper-dark flex items-center justify-center">
                  <User size={12} strokeWidth={1.5} className="text-ink-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-ink truncate">{user.nickname}</div>
                <div className="text-[11px] text-ink-faint truncate">
                  {user.phone || t('auth.notBoundPhone')}
                </div>
              </div>
              {userMenuOpen ? (
                <ChevronUp size={14} strokeWidth={1.5} className="text-ink-muted" />
              ) : (
                <ChevronDown size={14} strokeWidth={1.5} className="text-ink-muted" />
              )}
            </button>

            {userMenuOpen && (
              <div
                className="absolute bottom-full left-2 right-2 mb-1 bg-paper border border-rule rounded-lg shadow-lg py-1 z-10"
                role="menu"
                aria-label="用户操作菜单"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-ink-muted hover:bg-paper-dark hover:text-ink cursor-pointer border border-transparent transition-colors duration-200"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onShowPreference()
                  }}
                  role="menuitem"
                >
                  <Settings size={13} strokeWidth={1.5} />
                  <span className="flex-1 text-left">{t('nav.accountSettings')}</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-danger hover:bg-danger-bg/60 cursor-pointer border border-transparent transition-colors duration-200"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onLogout()
                  }}
                  role="menuitem"
                >
                  <LogOut size={13} strokeWidth={1.5} />
                  <span className="flex-1 text-left">{t('nav.logout')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-ink text-paper cursor-pointer border-none hover:bg-accent transition-colors duration-200"
            onClick={onShowLogin}
          >
            {t('nav.loginRegister')}
          </button>
        )}
      </div>
      {onCollapse && (
        <div className="px-2 py-2 border-t border-rule">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-ink-muted hover:bg-paper-dark hover:text-ink cursor-pointer border border-rule/60 transition-colors duration-200"
            onClick={onCollapse}
            aria-label="折叠侧边栏"
            title="折叠侧边栏"
          >
            <ChevronLeft size={14} strokeWidth={1.5} />
            <span>折叠</span>
          </button>
        </div>
      )}
    </aside>
  )
}
