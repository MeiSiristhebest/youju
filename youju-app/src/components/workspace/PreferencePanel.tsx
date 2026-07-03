import { Globe, MessageCircle, Scale, Tag, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type Language, useTranslation } from '../../i18n'
import { apiClient } from '../../services/apiClient'

interface PreferenceData {
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

interface PreferencePanelProps {
  onClose: () => void
  prefs?: PreferenceData | null
}

function Slider({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-ink-muted">{label}</span>
        <span className="text-[11px] text-ink-faint font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-paper-dark rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const DIMENSION_LABELS: Record<string, string> = {
  salary: '薪资',
  benefit: '福利',
  term: '期限',
  responsibility: '责任',
  condition: '条件',
  timeline: '时间线',
  amount: '金额',
  penalty: '违约',
  scope: '范围',
  right: '权利',
  obligation: '义务',
}

const TYPE_LABELS: Record<string, string> = {
  conflict: '矛盾',
  promise: '承诺',
  missing: '缺失',
  info: '提示',
}

export function PreferencePanel({ onClose, prefs: prefsProp }: PreferencePanelProps) {
  const [prefs, setPrefs] = useState<PreferenceData | null>(prefsProp ?? null)
  const [loading, setLoading] = useState(!prefsProp)
  const { language, setLanguage, t } = useTranslation()

  useEffect(() => {
    if (prefsProp !== undefined) {
      setPrefs(prefsProp)
      setLoading(false)
      return
    }
    const fetchPrefs = async () => {
      setLoading(true)
      try {
        const prefsData = await apiClient.get<PreferenceData>('/api/preferences')
        setPrefs(prefsData)
      } catch (err) {
        console.error('Failed to fetch preferences:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPrefs()
  }, [prefsProp])

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-[1000] p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="button"
      tabIndex={-1}
    >
      <div className="bg-paper border border-rule rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-rule flex justify-between items-center sticky top-0 bg-paper z-10">
          <div>
            <h3 className="text-base font-semibold text-ink font-display tracking-tight">
              {t('preference.title')}
            </h3>
            <p className="text-[11px] text-ink-faint mt-0.5">{t('preference.subtitle')}</p>
          </div>
          <button
            type="button"
            className="w-8 h-8 bg-none border-none text-ink-faint cursor-pointer rounded-lg grid place-items-center hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onClose}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-rule border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-xs text-ink-faint">{t('common.loading')}</p>
          </div>
        ) : prefs ? (
          <div className="p-5 space-y-6">
            {/* 语言设置 */}
            <div>
              <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                <Globe size={14} strokeWidth={1.5} /> {t('preference.language')}
              </h4>
              <p className="text-[11px] text-ink-faint mb-3">{t('preference.languageDesc')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('zh-CN')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                    language === 'zh-CN'
                      ? 'bg-accent text-paper border border-accent'
                      : 'bg-paper-dark text-ink-muted border border-rule/60 hover:bg-paper-dark hover:text-ink'
                  }`}
                >
                  {t('preference.chinese')}
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en-US')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                    language === 'en-US'
                      ? 'bg-accent text-paper border border-accent'
                      : 'bg-paper-dark text-ink-muted border border-rule/60 hover:bg-paper-dark hover:text-ink'
                  }`}
                >
                  {t('preference.english')}
                </button>
              </div>
            </div>
            {/* 风险权重 - 按维度 */}
            {prefs.riskWeights && (
              <div>
                <h4 className="text-xs font-semibold text-ink mb-1 flex items-center gap-1.5">
                  <Scale size={14} strokeWidth={1.5} /> {t('preference.riskWeights')}
                  {t('preference.dimensions')}
                </h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent-bg text-accent border border-accent-faint">
                    {t('preference.systemAutoLearn')}
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    {t('preference.basedOnChecks', { count: prefs.riskWeights.totalChecks })}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {Object.entries(prefs.riskWeights.dimensionWeights).map(([key, value]) => (
                    <Slider key={key} label={DIMENSION_LABELS[key] || key} value={value} />
                  ))}
                </div>

                {/* 风险权重 - 按类型 */}
                <h4 className="text-xs font-semibold text-ink mt-5 mb-1 flex items-center gap-1.5">
                  <Tag size={14} strokeWidth={1.5} /> {t('preference.riskWeights')}
                  {t('preference.types')}
                </h4>
                <div className="space-y-0.5">
                  {Object.entries(prefs.riskWeights.typeWeights).map(([key, value]) => (
                    <Slider key={key} label={TYPE_LABELS[key] || key} value={value} />
                  ))}
                </div>
              </div>
            )}

            {/* 话术风格 */}
            {prefs.draftStyle && (
              <div>
                <h4 className="text-xs font-semibold text-ink mb-1 flex items-center gap-1.5">
                  <MessageCircle size={14} strokeWidth={1.5} /> {t('preference.draftStyle')}
                </h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent-bg text-accent border border-accent-faint">
                    {t('preference.systemAutoLearn')}
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    {t('preference.basedOnCopiesEdits', {
                      copies: prefs.draftStyle.totalCopies,
                      edits: prefs.draftStyle.totalEdits,
                    })}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <Slider label={t('preference.formality')} value={prefs.draftStyle.formality} />
                  <Slider
                    label={t('preference.friendliness')}
                    value={prefs.draftStyle.friendliness}
                  />
                  <Slider
                    label={t('preference.conciseness')}
                    value={prefs.draftStyle.conciseness}
                  />
                  <Slider label={t('preference.directness')} value={prefs.draftStyle.directness} />
                </div>
                {prefs.draftStyle.preferredTone && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-paper border border-rule">
                    <span className="text-[11px] text-ink-faint">
                      {t('preference.preferredStyle')}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {prefs.draftStyle.preferredTone}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 无数据 */}
            {!prefs.riskWeights && !prefs.draftStyle && (
              <div className="text-center py-8">
                <p className="text-xs text-ink-faint">{t('preference.noData')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xs text-ink-faint">{t('preference.failedToLoad')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
