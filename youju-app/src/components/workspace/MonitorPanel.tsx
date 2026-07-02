import { BookOpen, DollarSign, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiClient } from '../../services/apiClient'

interface SysStats {
  cost?: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
    estimatedCost: number
  }
  stepPerformance?: Array<{
    step: string
    avgDurationMs: number
    avgTokens: number
  }>
  knowledgeBase?: {
    scenarioCount: number
    dimensionCount: number
    topDimensions: Array<{ name: string; count: number }>
  }
}

interface MonitorPanelProps {
  onClose: () => void
  stats?: SysStats | null
}

export function MonitorPanel({ onClose, stats: statsProp }: MonitorPanelProps) {
  const [stats, setStats] = useState<SysStats | null>(statsProp ?? null)
  const [loading, setLoading] = useState(!statsProp)

  useEffect(() => {
    if (statsProp !== undefined) {
      setStats(statsProp)
      setLoading(false)
      return
    }
    const fetchStats = async () => {
      setLoading(true)
      try {
        const statsData = await apiClient.get<SysStats>('/api/admin/stats')
        setStats(statsData)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [statsProp])

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  const formatDuration = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${ms}ms`
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
      <div className="bg-paper border border-rule rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-lg">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-rule flex justify-between items-center sticky top-0 bg-paper z-10">
          <h3 className="text-base font-semibold text-ink font-display tracking-tight">系统监控</h3>
          <button
            type="button"
            className="w-8 h-8 bg-none border-none text-ink-faint cursor-pointer rounded-lg flex items-center justify-center hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-rule border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-xs text-ink-faint">加载中…</p>
          </div>
        ) : stats ? (
          <div className="p-5 space-y-6">
            {/* 成本估算 */}
            {stats.cost && (
              <div>
                <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                  <DollarSign size={14} strokeWidth={1.5} /> 成本估算
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="px-3 py-3 rounded-lg bg-paper border border-rule">
                    <div className="text-[11px] text-ink-faint mb-1">Prompt Tokens</div>
                    <div className="text-sm font-semibold text-ink">
                      {formatNumber(stats.cost.promptTokens)}
                    </div>
                  </div>
                  <div className="px-3 py-3 rounded-lg bg-paper border border-rule">
                    <div className="text-[11px] text-ink-faint mb-1">Completion Tokens</div>
                    <div className="text-sm font-semibold text-ink">
                      {formatNumber(stats.cost.completionTokens)}
                    </div>
                  </div>
                  <div className="px-3 py-3 rounded-lg bg-paper border border-rule">
                    <div className="text-[11px] text-ink-faint mb-1">Total Tokens</div>
                    <div className="text-sm font-semibold text-ink">
                      {formatNumber(stats.cost.totalTokens)}
                    </div>
                  </div>
                  <div className="px-3 py-3 rounded-lg bg-accent-bg border border-accent-faint">
                    <div className="text-[11px] text-accent mb-1">预估费用</div>
                    <div className="text-sm font-semibold text-ink">
                      ${stats.cost.estimatedCost.toFixed(4)}
                    </div>
                  </div>
                </div>
                {/* Token 分布进度条 */}
                <div className="mt-3">
                  <div className="h-2 bg-paper-dark rounded-full overflow-hidden flex">
                    <div
                      className="bg-accent/60 h-full"
                      style={{
                        width: `${stats.cost.totalTokens > 0 ? (stats.cost.promptTokens / stats.cost.totalTokens) * 100 : 0}%`,
                      }}
                    />
                    <div
                      className="bg-accent-secondary/60 h-full"
                      style={{
                        width: `${stats.cost.totalTokens > 0 ? (stats.cost.completionTokens / stats.cost.totalTokens) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-ink-faint">Prompt</span>
                    <span className="text-[10px] text-ink-faint">Completion</span>
                  </div>
                </div>
              </div>
            )}

            {/* 步骤性能 */}
            {stats.stepPerformance && stats.stepPerformance.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                  <Zap size={14} strokeWidth={1.5} /> 步骤性能
                </h4>
                <div className="space-y-2">
                  {stats.stepPerformance.map((step) => (
                    <div
                      key={step.step}
                      className="px-3 py-2.5 rounded-lg bg-paper border border-rule"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-ink font-medium">{step.step}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-ink-faint">
                            {formatDuration(step.avgDurationMs)}
                          </span>
                          <span className="text-[11px] text-accent">
                            {formatNumber(step.avgTokens)} tokens
                          </span>
                        </div>
                      </div>
                      <div className="h-1 bg-paper-dark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent/50 rounded-full"
                          style={{
                            width: `${Math.min(100, (step.avgDurationMs / Math.max(...stats.stepPerformance!.map((s) => s.avgDurationMs))) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 知识库统计 */}
            {stats.knowledgeBase && (
              <div>
                <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                  <BookOpen size={14} strokeWidth={1.5} /> 知识库
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="px-3 py-3 rounded-lg bg-paper border border-rule text-center">
                    <div className="text-lg font-semibold text-ink">
                      {stats.knowledgeBase.scenarioCount}
                    </div>
                    <div className="text-[11px] text-ink-faint">场景数</div>
                  </div>
                  <div className="px-3 py-3 rounded-lg bg-paper border border-rule text-center">
                    <div className="text-lg font-semibold text-ink">
                      {stats.knowledgeBase.dimensionCount}
                    </div>
                    <div className="text-[11px] text-ink-faint">维度数</div>
                  </div>
                </div>
                {stats.knowledgeBase.topDimensions.length > 0 && (
                  <div>
                    <div className="text-[11px] text-ink-faint mb-2 font-mono tracking-wide uppercase">
                      Top 维度
                    </div>
                    <div className="space-y-1.5">
                      {stats.knowledgeBase.topDimensions.map((dim) => (
                        <div key={dim.name} className="flex items-center gap-2">
                          <span className="text-[11px] text-ink-muted flex-1 truncate">
                            {dim.name}
                          </span>
                          <div className="w-24 h-1 bg-paper-dark rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent/50 rounded-full"
                              style={{
                                width: `${(dim.count / Math.max(...stats.knowledgeBase!.topDimensions.map((d) => d.count))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-ink-faint w-8 text-right font-mono">
                            {dim.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xs text-ink-faint">无法加载统计数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
