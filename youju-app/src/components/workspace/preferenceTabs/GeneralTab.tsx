import { FileText, Globe, Moon, Palette, Settings, Sun } from 'lucide-react'
import type { Language } from '../../../i18n'
import { cn } from '../../../lib/utils'
import { useUIPreferenceStore } from '../../../stores/useUIPreferenceStore'
import { SectionTitle, SelectRow, SettingRow, Toggle } from './shared'

export function GeneralTab() {
  const { generalSettings, updateGeneralSettings, theme, setTheme } = useUIPreferenceStore()

  const handleLanguageChange = (lang: Language) => {
    updateGeneralSettings({ language: lang })
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        icon={<Globe size={16} strokeWidth={1.5} />}
        title="语言与区域"
        description="选择界面显示语言"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleLanguageChange('zh-CN')}
            className={cn(
              'px-4 py-3 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border',
              generalSettings.language === 'zh-CN'
                ? 'bg-accent text-paper border-accent'
                : 'bg-paper text-ink-muted border-rule/60 hover:bg-paper-dark hover:text-ink',
            )}
          >
            简体中文
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange('en-US')}
            className={cn(
              'px-4 py-3 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border',
              generalSettings.language === 'en-US'
                ? 'bg-accent text-paper border-accent'
                : 'bg-paper text-ink-muted border-rule/60 hover:bg-paper-dark hover:text-ink',
            )}
          >
            English
          </button>
        </div>
      </div>

      <SectionTitle
        icon={<Palette size={16} strokeWidth={1.5} />}
        title="外观主题"
        description="选择你喜欢的界面主题"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={cn(
              'px-4 py-3 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border flex items-center justify-center gap-2',
              theme === 'light'
                ? 'bg-accent text-paper border-accent'
                : 'bg-paper text-ink-muted border-rule/60 hover:bg-paper-dark hover:text-ink',
            )}
          >
            <Sun size={14} strokeWidth={1.5} />
            浅色模式
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              'px-4 py-3 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border flex items-center justify-center gap-2',
              theme === 'dark'
                ? 'bg-accent text-paper border-accent'
                : 'bg-paper text-ink-muted border-rule/60 hover:bg-paper-dark hover:text-ink',
            )}
          >
            <Moon size={14} strokeWidth={1.5} />
            深色模式
          </button>
        </div>
      </div>

      <SectionTitle
        icon={<FileText size={16} strokeWidth={1.5} />}
        title="默认场景"
        description="新建分析时默认使用的场景模板"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SelectRow
          label="默认场景模板"
          description="选择新建分析时默认加载的场景"
          value={generalSettings.defaultScenario}
          options={[
            { value: 'custom', label: '自定义分析' },
            { value: 'jobOffer', label: '求职 Offer 确认' },
            { value: 'rentContract', label: '租房签约' },
            { value: 'homework', label: '作业/申请提交' },
          ]}
          onChange={(v) => updateGeneralSettings({ defaultScenario: v as any })}
        />
      </div>

      <SectionTitle
        icon={<Settings size={16} strokeWidth={1.5} />}
        title="其他"
        description="通用行为设置"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SettingRow
          label="自动保存草稿"
          description="自动保存未完成的分析草稿"
          action={
            <Toggle
              checked={generalSettings.autoSaveDraft}
              onChange={(v) => updateGeneralSettings({ autoSaveDraft: v })}
            />
          }
        />
      </div>
    </div>
  )
}
