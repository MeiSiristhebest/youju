import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Crown,
  Gavel,
  History,
  Home,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Moon,
  Newspaper,
  PenLine,
  Plus,
  Server,
  Settings,
  Sparkles,
  Sun,
  Terminal,
  User,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SCENARIOS } from '../../constants/workspace'
import { useTranslation } from '../../i18n'
import { useUIPreferenceStore } from '../../stores'
import { ChatHistorySidebar } from '../chat/ChatHistorySidebar'
import { Button } from '../ui/button'
import { MagneticButton } from '../ui/MagneticButton'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const scenarioIconMap: Record<string, ReactNode> = {
  legal_case: <Gavel size={15} strokeWidth={1.5} />,
  academic_research: <BookOpen size={15} strokeWidth={1.5} />,
  due_diligence: <Briefcase size={15} strokeWidth={1.5} />,
  fact_check: <Newspaper size={15} strokeWidth={1.5} />,
  job_offer: <Briefcase size={15} strokeWidth={1.5} />,
  rental: <Home size={15} strokeWidth={1.5} />,
  homework: <Activity size={15} strokeWidth={1.5} />,
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
  onShowChat: () => void
  onShowTeam?: () => void
  onShowTemplates?: () => void
  onShowApiSettings?: () => void
  onShowApiLogs?: () => void
  onShowBilling?: () => void
  onCollapse?: () => void
}

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start gap-1 px-1.5 py-1 h-auto text-[11px] font-medium text-ink-faint hover:text-ink-muted hover:bg-paper-dark/50"
        aria-expanded={isOpen}
      >
        <ChevronRight
          size={12}
          strokeWidth={2}
          className={cn('shrink-0 transition-transform duration-150', isOpen && 'rotate-90')}
        />
        <span className="flex-1 text-left tracking-wide">{title}</span>
      </Button>
      {isOpen && (
        <div className="mt-0.5 ml-0.5 space-y-0.5 animate-[fadeIn_0.15s_ease-out]">{children}</div>
      )}
    </div>
  )
}

interface SidebarNavButtonProps {
  icon: ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  ariaCurrent?: 'page' | undefined
  variant?: 'default' | 'accent'
}

function SidebarNavButton({
  icon,
  label,
  active,
  onClick,
  ariaCurrent,
  variant = 'default',
}: SidebarNavButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-current={ariaCurrent}
      className={cn(
        'relative w-full justify-start gap-2 px-2 py-1 h-auto text-sm transition-colors duration-150',
        active
          ? 'bg-paper-dark text-ink hover:bg-paper-dark hover:text-ink'
          : variant === 'accent'
            ? 'text-accent hover:bg-accent-bg/50 hover:text-accent'
            : 'text-ink-muted hover:bg-paper-dark hover:text-ink',
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-accent rounded-r-full" />
      )}
      {icon}
      <span className="flex-1 text-left truncate">{label}</span>
    </Button>
  )
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
  onShowChat,
  onShowTeam,
  onShowTemplates,
  onShowApiSettings,
  onShowApiLogs,
  onShowBilling,
  onCollapse,
}: WorkspaceSidebarProps) {
  const { theme, toggleTheme } = useUIPreferenceStore()
  const { t } = useTranslation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  // AI 对话历史侧栏展开状态
  const [showChatHistory, setShowChatHistory] = useState(false)

  const isCustomScenario = currentScenario === null

  // 点击"AI 对话"入口：切换到对话 tab + 展开/收起会话历史
  const handleToggleChat = () => {
    onShowChat()
    setShowChatHistory((prev) => !prev)
  }

  return (
    <aside
      id="tour-sidebar"
      className="w-60 bg-paper border-r border-rule flex flex-col shrink-0 h-full"
      aria-label="主导航"
    >
      {/* 顶部 Logo */}
      <div className="h-12 px-3 flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-1.5 h-auto hover:bg-transparent"
          onClick={onGoHome}
          aria-label="返回首页"
        >
          <div className="w-6 h-6 bg-ink rounded-md flex items-center justify-center">
            <Sparkles size={12} className="text-paper" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium text-ink font-display tracking-tight">YouJu</span>
        </Button>
      </div>

      {/* 新建分析按钮 */}
      <div className="px-3 pb-3 shrink-0">
        <MagneticButton
          id="tour-new-analysis-btn"
          variant="primary"
          size="md"
          onClick={onNewAnalysis}
          iconLeft={<Plus size={14} strokeWidth={1.5} />}
          className="w-full"
          strength={0.3}
          radius={100}
        >
          {t('nav.newAnalysis')}
        </MagneticButton>
      </div>

      {/* 中间可滚动区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1">
        <CollapsibleSection title={t('nav.workspace')}>
          <SidebarNavButton
            icon={<BarChart3 size={14} strokeWidth={1.5} />}
            label={t('nav.analysisDesk')}
            active
            ariaCurrent="page"
          />
          <SidebarNavButton
            icon={<History size={14} strokeWidth={1.5} />}
            label={t('nav.history')}
            onClick={onShowHistory}
          />
        </CollapsibleSection>

        {['专业场景', '个人事务'].map((category) => {
          const categoryScenarios = SCENARIOS.filter((s) => s.category === category)
          if (categoryScenarios.length === 0) return null
          return (
            <CollapsibleSection key={category} title={category}>
              {categoryScenarios.map((s) => {
                const isActive = currentScenario === s.id
                return (
                  <SidebarNavButton
                    key={s.id}
                    icon={scenarioIconMap[s.id] || <PenLine size={14} strokeWidth={1.5} />}
                    label={s.name}
                    active={isActive}
                    onClick={() => onLoadScenario(s.id)}
                    ariaCurrent={isActive ? 'page' : undefined}
                  />
                )
              })}
            </CollapsibleSection>
          )
        })}

        <CollapsibleSection title="自定义">
          <SidebarNavButton
            icon={<PenLine size={14} strokeWidth={1.5} />}
            label={t('nav.custom')}
            active={isCustomScenario}
            onClick={onNewAnalysis}
            ariaCurrent={isCustomScenario ? 'page' : undefined}
          />
        </CollapsibleSection>

        <CollapsibleSection title="工具" defaultOpen={false}>
          <Tooltip>
            <TooltipTrigger render={<span className="block w-full" />}>
              <SidebarNavButton
                icon={<MessageCircle size={14} strokeWidth={1.5} />}
                label="AI 对话"
                active={showChatHistory}
                onClick={handleToggleChat}
              />
            </TooltipTrigger>
            <TooltipContent>Ctrl+J</TooltipContent>
          </Tooltip>
          <SidebarNavButton
            icon={<Settings size={14} strokeWidth={1.5} />}
            label={t('nav.preferences')}
            onClick={onShowPreference}
          />
          <SidebarNavButton
            icon={
              theme === 'light' ? (
                <Moon size={14} strokeWidth={1.5} />
              ) : (
                <Sun size={14} strokeWidth={1.5} />
              )
            }
            label={theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
            onClick={toggleTheme}
          />
          <SidebarNavButton
            icon={<Server size={14} strokeWidth={1.5} />}
            label="模型设置"
            onClick={onShowModelSettings}
          />
          <SidebarNavButton
            icon={<Activity size={14} strokeWidth={1.5} />}
            label={t('nav.systemMonitor')}
            onClick={onShowMonitor}
          />
          {onShowTemplates && (
            <SidebarNavButton
              icon={<LayoutGrid size={14} strokeWidth={1.5} />}
              label="模板市场"
              onClick={onShowTemplates}
            />
          )}
          {onShowTeam && (
            <SidebarNavButton
              icon={<Users size={14} strokeWidth={1.5} />}
              label="团队协作"
              onClick={onShowTeam}
            />
          )}
          {onShowApiSettings && (
            <SidebarNavButton
              icon={<Code2 size={14} strokeWidth={1.5} />}
              label="API / Webhook"
              onClick={onShowApiSettings}
            />
          )}
          {onShowApiLogs && (
            <SidebarNavButton
              icon={<Terminal size={14} strokeWidth={1.5} />}
              label="API 日志"
              onClick={onShowApiLogs}
            />
          )}
          {onShowBilling && (
            <SidebarNavButton
              icon={<Crown size={14} strokeWidth={1.5} />}
              label="升级 Pro"
              variant="accent"
              onClick={onShowBilling}
            />
          )}
        </CollapsibleSection>

        {/* AI 对话历史侧栏：点击"AI 对话"入口后展开 */}
        {showChatHistory && (
          <div className="mb-3 mx-0.5 h-64 rounded-lg overflow-hidden border border-rule/60 animate-[fadeIn_0.15s_ease-out]">
            <ChatHistorySidebar className="border-r-0" />
          </div>
        )}
      </div>

      {/* 底部区域 */}
      <div className="px-2 py-2 border-t border-rule/60 shrink-0 space-y-1">
        {user ? (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 px-2 py-1 h-auto"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="用户菜单"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.nickname}
                  className="w-5 h-5 rounded-md border border-rule/60 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-md border border-rule/60 bg-paper-dark flex items-center justify-center shrink-0">
                  <User size={11} strokeWidth={1.5} className="text-ink-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-ink truncate">{user.nickname}</div>
              </div>
              <ChevronDown size={12} strokeWidth={1.5} className="text-ink-faint" />
            </Button>

            {userMenuOpen && (
              <div
                className="absolute bottom-full left-1 right-1 mb-1 bg-paper border border-rule rounded-lg shadow-lg py-1 z-10"
                role="menu"
                aria-label="用户操作菜单"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 px-3 py-1.5 h-auto text-xs text-ink-muted hover:text-ink"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onShowPreference()
                  }}
                  role="menuitem"
                >
                  <Settings size={12} strokeWidth={1.5} />
                  <span className="flex-1 text-left">{t('nav.accountSettings')}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 px-3 py-1.5 h-auto text-xs text-danger hover:bg-danger-bg/60"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onLogout()
                  }}
                  role="menuitem"
                >
                  <LogOut size={12} strokeWidth={1.5} />
                  <span className="flex-1 text-left">{t('nav.logout')}</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button variant="default" size="sm" className="w-full" onClick={onShowLogin}>
            {t('nav.loginRegister')}
          </Button>
        )}

        {onCollapse && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-1.5 px-3 py-1 h-auto text-xs text-ink-faint hover:text-ink-muted"
            onClick={onCollapse}
            aria-label="折叠侧边栏"
            title="折叠侧边栏"
          >
            <ChevronLeft size={13} strokeWidth={1.5} />
            <span>折叠</span>
          </Button>
        )}
      </div>
    </aside>
  )
}
