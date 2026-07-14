import { AlertTriangle, ArrowLeft, BookOpen, DollarSign, RefreshCw, Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../services/apiClient'

export interface SysStats {
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

interface MonitorContentProps {
  stats?: SysStats | null
  onClose?: () => void
}

export function MonitorContent({ stats: statsProp, onClose }: MonitorContentProps) {
  const [stats, setStats] = useState<SysStats | null>(statsProp ?? null)
  const [loading, setLoading] = useState(!statsProp)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (statsProp !== undefined) return
    setLoading(true)
    setError(null)
    try {
      const statsData = await apiClient.get<SysStats>('/api/admin/stats')
      setStats(statsData)
    } catch (err: any) {
      console.error('[MonitorContent] API 失败:', err)
      setError(err?.message || '获取统计数据失败')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [statsProp])

  useEffect(() => {
    if (statsProp !== undefined) {
      setStats(statsProp)
      setLoading(false)
      return
    }
    fetchStats()
  }, [statsProp, fetchStats])

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
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-rule shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark/50 transition-colors shrink-0"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              返回
            </button>
          )}
          <h3 className="text-base font-semibold text-ink font-display tracking-tight">系统监控</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-rule border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-xs text-ink-faint">加载中…</p>
          </div>
        ) : stats ? (
          <div className="p-5 space-y-6">
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
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-full bg-warning-bg flex items-center justify-center mb-4">
              <AlertTriangle size={20} strokeWidth={1.5} className="text-warning" />
            </div>
            <p className="text-sm font-medium text-ink mb-1">加载失败</p>
            <p className="text-xs text-ink-faint mb-4 max-w-xs">{error}</p>
            <button
              type="button"
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-ink text-paper hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
              重新加载
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-ink-faint">暂无统计数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
