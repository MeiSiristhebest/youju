import { MessageCircle, Scale, Tag, X } from 'lucide-react'
import { useEffect, useState } from 'react'
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
              偏好设置
            </h3>
            <p className="text-[11px] text-ink-faint mt-0.5">系统自动学习，无需手动调整</p>
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
            <p className="text-xs text-ink-faint">加载中…</p>
          </div>
        ) : prefs ? (
          <div className="p-5 space-y-6">
            {/* 风险权重 - 按维度 */}
            {prefs.riskWeights && (
              <div>
                <h4 className="text-xs font-semibold text-ink mb-1 flex items-center gap-1.5">
                  <Scale size={14} strokeWidth={1.5} /> 风险权重 · 维度
                </h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent-bg text-accent border border-accent-faint">
                    系统自动学习
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    基于 {prefs.riskWeights.totalChecks} 次勾选行为
                  </span>
                </div>
                <div className="space-y-0.5">
                  {Object.entries(prefs.riskWeights.dimensionWeights).map(([key, value]) => (
                    <Slider key={key} label={DIMENSION_LABELS[key] || key} value={value} />
                  ))}
                </div>

                {/* 风险权重 - 按类型 */}
                <h4 className="text-xs font-semibold text-ink mt-5 mb-1 flex items-center gap-1.5">
                  <Tag size={14} strokeWidth={1.5} /> 风险权重 · 类型
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
                  <MessageCircle size={14} strokeWidth={1.5} /> 话术风格
                </h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent-bg text-accent border border-accent-faint">
                    系统自动学习
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    基于 {prefs.draftStyle.totalCopies} 次复制 / {prefs.draftStyle.totalEdits}{' '}
                    次编辑
                  </span>
                </div>
                <div className="space-y-0.5">
                  <Slider label="正式度" value={prefs.draftStyle.formality} />
                  <Slider label="友好度" value={prefs.draftStyle.friendliness} />
                  <Slider label="简洁度" value={prefs.draftStyle.conciseness} />
                  <Slider label="直接度" value={prefs.draftStyle.directness} />
                </div>
                {prefs.draftStyle.preferredTone && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-paper border border-rule">
                    <span className="text-[11px] text-ink-faint">偏好风格：</span>
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
                <p className="text-xs text-ink-faint">暂无偏好数据，使用后将自动学习</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xs text-ink-faint">无法加载偏好数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
