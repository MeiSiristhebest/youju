import { FileText, Globe, HelpCircle, Moon, Palette, Settings, Sun } from 'lucide-react'
import type { Language } from '../../../i18n'
import { useTranslation } from '../../../i18n'
import { cn } from '../../../lib/utils'
import { useUIPreferenceStore } from '../../../stores/useUIPreferenceStore'
import { SectionTitle, SelectRow, SettingRow, Toggle } from './shared'

export function GeneralTab() {
  const { generalSettings, updateGeneralSettings, theme, setTheme, restartProductTour } =
    useUIPreferenceStore()
  const { t, setLanguage } = useTranslation()

  const handleLanguageChange = (lang: Language) => {
    updateGeneralSettings({ language: lang })
    setLanguage(lang)
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        icon={<Globe size={16} strokeWidth={1.5} />}
        title={t('preference.languageAndRegion')}
        description={t('preference.languageAndRegionDesc')}
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
            {t('preference.chinese')}
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
            {t('preference.english')}
          </button>
        </div>
      </div>

      <SectionTitle
        icon={<Palette size={16} strokeWidth={1.5} />}
        title={t('preference.appearanceTheme')}
        description={t('preference.appearanceThemeDesc')}
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
            {t('preference.lightMode')}
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
            {t('preference.darkMode')}
          </button>
        </div>
      </div>

      <SectionTitle
        icon={<FileText size={16} strokeWidth={1.5} />}
        title={t('preference.defaultScenario')}
        description={t('preference.defaultScenarioDesc')}
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SelectRow
          label={t('preference.defaultScenarioTemplate')}
          description={t('preference.defaultScenarioTemplateDesc')}
          value={generalSettings.defaultScenario}
          options={[
            { value: 'custom', label: t('preference.customAnalysis') },
            { value: 'jobOffer', label: t('scenario.jobOffer') },
            { value: 'rentContract', label: t('scenario.rentContract') },
            { value: 'homework', label: t('scenario.homework') },
          ]}
          onChange={(v) => updateGeneralSettings({ defaultScenario: v as any })}
        />
      </div>

      <SectionTitle
        icon={<HelpCircle size={16} strokeWidth={1.5} />}
        title="帮助与引导"
        description="新手教程和使用帮助"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SettingRow
          label="重新查看新手教程"
          description="重新播放产品引导教程"
          action={
            <button
              type="button"
              onClick={restartProductTour}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
            >
              重新开始
            </button>
          }
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
