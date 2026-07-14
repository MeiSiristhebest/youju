import {
  ArrowLeft,
  Bell,
  Brain,
  Download,
  Keyboard,
  RotateCcw,
  Settings,
  Shield,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../i18n'
import { cn } from '../../lib/utils'
import { type PreferenceTab, useUIPreferenceStore } from '../../stores/useUIPreferenceStore'
import { MemoryTab } from './MemoryTab'
import { AnalysisTab } from './preferenceTabs/AnalysisTab'
import { ExportTab } from './preferenceTabs/ExportTab'
import { GeneralTab } from './preferenceTabs/GeneralTab'
import { NotificationsTab } from './preferenceTabs/NotificationsTab'
import { PrivacyTab } from './preferenceTabs/PrivacyTab'
import { ShortcutsTab } from './preferenceTabs/ShortcutsTab'

export interface PreferenceData {
  riskWeights?: {
    dimensionWeights: Record<string, number>
    typeWeights: Record<string, number>
    totalChecks: number
    lastUpdated: string
  }
  draftStyle?: {
    formality: number
    friendliness: number
    conciseness: number
    directness: number
    totalCopies: number
    totalEdits: number
    lastUpdated: string
    preferredTone?: string
  }
}

interface PreferenceContentProps {
  prefs?: PreferenceData | null
  onClose?: () => void
}

interface TabItem {
  id: PreferenceTab
  label: string
  icon: React.ReactNode
  description: string
}

export function PreferenceContent({ prefs: _prefsProp, onClose }: PreferenceContentProps) {
  const { t } = useTranslation()
  const { activePreferenceTab, setActivePreferenceTab, resetAllSettings } = useUIPreferenceStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const tabs: TabItem[] = [
    {
      id: 'general',
      label: t('preference.general'),
      icon: <Settings size={14} strokeWidth={1.5} />,
      description: t('preference.generalDesc'),
    },
    {
      id: 'analysis',
      label: t('preference.analysis'),
      icon: <Brain size={14} strokeWidth={1.5} />,
      description: t('preference.analysisDesc'),
    },
    {
      id: 'notifications',
      label: t('preference.notifications'),
      icon: <Bell size={14} strokeWidth={1.5} />,
      description: t('preference.notificationsDesc'),
    },
    {
      id: 'export',
      label: t('preference.export'),
      icon: <Download size={14} strokeWidth={1.5} />,
      description: t('preference.exportDesc'),
    },
    {
      id: 'privacy',
      label: t('preference.privacy'),
      icon: <Shield size={14} strokeWidth={1.5} />,
      description: t('preference.privacyDesc'),
    },
    {
      id: 'memory',
      label: '长期记忆',
      icon: <Brain size={14} strokeWidth={1.5} />,
      description: '跨会话偏好记忆管理',
    },
    {
      id: 'shortcuts',
      label: t('preference.shortcuts'),
      icon: <Keyboard size={14} strokeWidth={1.5} />,
      description: t('preference.shortcutsDesc'),
    },
  ]

  const handleReset = () => {
    resetAllSettings()
    setShowResetConfirm(false)
  }

  const renderContent = () => {
    switch (activePreferenceTab) {
      case 'general':
        return <GeneralTab />
      case 'analysis':
        return <AnalysisTab />
      case 'notifications':
        return <NotificationsTab />
      case 'export':
        return <ExportTab />
      case 'privacy':
        return <PrivacyTab />
      case 'memory':
        return <MemoryTab />
      case 'shortcuts':
        return <ShortcutsTab />
      default:
        return <GeneralTab />
    }
  }

  return (
    <div className="h-full flex">
      <div className="w-56 border-r border-rule bg-paper-dark/30 flex flex-col shrink-0">
        <div className="px-3 py-3 border-b border-rule">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark/50 transition-colors w-full mb-2"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              返回工作区
            </button>
          )}
          <h3 className="text-sm font-semibold text-ink font-display tracking-tight">
            {t('preference.title')}
          </h3>
          <p className="text-[10px] text-ink-faint mt-0.5">个性化你的使用体验</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePreferenceTab(tab.id)}
              className={cn(
                'w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 mb-0.5',
                activePreferenceTab === tab.id
                  ? 'bg-accent/10 text-ink border border-accent/20'
                  : 'text-ink-muted hover:bg-paper-dark hover:text-ink border border-transparent',
              )}
            >
              <span
                className={cn(
                  'mt-0.5',
                  activePreferenceTab === tab.id ? 'text-accent' : 'text-ink-faint',
                )}
              >
                {tab.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{tab.label}</p>
                <p className="text-[10px] text-ink-faint mt-0.5">{tab.description}</p>
              </div>
            </button>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-rule">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
          >
            <RotateCcw size={12} strokeWidth={1.5} />
            恢复默认设置
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="px-5 py-4 border-b border-rule shrink-0">
          <div>
            <h4 className="text-sm font-semibold text-ink">
              {tabs.find((t) => t.id === activePreferenceTab)?.label}
            </h4>
            <p className="text-[10px] text-ink-faint mt-0.5">
              {tabs.find((t) => t.id === activePreferenceTab)?.description}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{renderContent()}</div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          <div className="bg-paper border border-rule rounded-xl p-5 max-w-sm mx-4 shadow-2xl">
            <h4 className="text-sm font-semibold text-ink mb-2">恢复默认设置</h4>
            <p className="text-xs text-ink-faint mb-4">
              确定要将所有偏好设置恢复为默认值吗？此操作不可撤销。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-paper-dark text-ink-muted rounded-lg text-xs font-medium hover:text-ink transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-accent text-paper rounded-lg text-xs font-medium hover:bg-accent-tertiary transition-colors"
              >
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
