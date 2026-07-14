import { Clock, FileText, Percent, Shield } from 'lucide-react'
import { useMemo } from 'react'
import { getRiskTypeShortLabel } from '@/constants/riskLabels'
import { cn } from '@/lib/utils'
import type { AnalyzeResult } from '../../types'

interface AnalysisDashboardProps {
  result: AnalyzeResult
  className?: string
}

interface RiskTypeItem {
  type: string
  count: number
  color: string
  percent: number
}

const RISK_TYPE_COLORS: Record<string, string> = {
  conflict: 'bg-danger',
  promise: 'bg-warning',
  missing: 'bg-accent',
  info: 'bg-success',
}

interface StepTimingItem {
  name: string
  durationMs: number
  percent: number
}

function ReportSection({
  number,
  title,
  subtitle,
  children,
}: {
  number: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="py-7">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-xs font-mono text-ink-faint tabular-nums">{number}</span>
        <h3 className="text-base font-medium text-ink tracking-tight">{title}</h3>
        {subtitle && <span className="text-xs text-ink-faint">— {subtitle}</span>}
      </div>
      <div className="pl-7">{children}</div>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="px-8 py-10 animate-pulse space-y-6">
      <div className="h-8 w-48 bg-paper-dark rounded" />
      <div className="h-px bg-rule/40" />
      <div className="grid grid-cols-4 gap-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-14 bg-paper-dark rounded" />
            <div className="h-8 w-16 bg-paper-dark rounded" />
          </div>
        ))}
      </div>
      <div className="h-px bg-rule/40" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-32 bg-paper-dark rounded" />
            <div className="h-1 w-full bg-paper-dark rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalysisDashboard({ result, className }: AnalysisDashboardProps) {
  const scenarioType = result?.scenario?.type
  const stats = useMemo(() => {
    const risks = result.risks || []
    const sourceCount = result.meta?.sourceCount ?? result.riskRelations?.associations?.length ?? 0
    const durationMs = result.meta?.durationMs ?? 0

    const criticalCount = risks.filter((r) => r.level === 'critical').length
    const warningCount = risks.filter((r) => r.level === 'warning').length
    const infoCount = risks.filter((r) => r.level === 'info').length

    const confidences = risks.map((r) => r.confidence ?? 0).filter((c) => c > 0)
    const avgConfidence =
      confidences.length > 0
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
        : 0

    const reasoningTrace = result.reasoningTrace || []
    const stepTimings: StepTimingItem[] = reasoningTrace
      .filter((s) => s.durationMs !== undefined)
      .map((s) => ({
        name: s.title ?? s.name ?? '未知步骤',
        durationMs: s.durationMs!,
        percent: 0,
      }))

    const totalStepDuration = stepTimings.reduce((sum, s) => sum + s.durationMs, 0)
    stepTimings.forEach((s) => {
      s.percent = totalStepDuration > 0 ? (s.durationMs / totalStepDuration) * 100 : 0
    })

    const typeCounts: Record<string, number> = {}
    risks.forEach((r) => {
      const type = r.type || 'info'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    const riskTypes: RiskTypeItem[] = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type: getRiskTypeShortLabel(type, scenarioType),
        count,
        color: RISK_TYPE_COLORS[type] || 'bg-accent',
        percent: risks.length > 0 ? (count / risks.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    const durationStr =
      minutes > 0 ? `${minutes}分${seconds}秒` : `${(durationMs / 1000).toFixed(1)}秒`

    return {
      sourceCount,
      totalRisks: risks.length,
      criticalCount,
      warningCount,
      infoCount,
      avgConfidence,
      durationMs,
      durationStr,
      stepTimings,
      riskTypes,
    }
  }, [result, scenarioType])

  const metrics = [
    {
      icon: <FileText size={16} strokeWidth={1.5} />,
      label: '材料总数',
      value: `${stats.sourceCount}`,
    },
    {
      icon: <Shield size={16} strokeWidth={1.5} />,
      label: '风险总数',
      value: `${stats.totalRisks}`,
    },
    {
      icon: <Percent size={16} strokeWidth={1.5} />,
      label: '置信度',
      value: `${stats.avgConfidence}%`,
      subValue: stats.avgConfidence >= 80 ? '高' : stats.avgConfidence >= 50 ? '中' : '低',
      confidence: stats.avgConfidence,
    },
    {
      icon: <Clock size={16} strokeWidth={1.5} />,
      label: '分析耗时',
      value: stats.durationStr,
    },
  ]

  const maxStepPercent = Math.max(...stats.stepTimings.map((s) => s.percent), 1)

  return (
    <div className={cn('px-8 py-10 max-w-4xl mx-auto', className)}>
      {/* 报告标题 */}
      <header className="pb-6 border-b border-rule/40">
        <h2 className="text-2xl font-display font-medium text-ink tracking-tight mb-1">分析概览</h2>
        <p className="text-sm text-ink-muted">本次 AI 交叉验证分析的关键指标与分布</p>
      </header>

      {/* 核心指标 */}
      <ReportSection number="01" title="核心指标" subtitle="四项关键数据一览">
        <div className="grid grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 text-ink-muted">
                {m.icon}
                <span className="text-sm">{m.label}</span>
              </div>
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-2xl font-display font-medium text-ink tracking-tight tabular-nums leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                  {m.value}
                </span>
                {m.subValue && m.confidence !== undefined && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded font-medium shrink-0',
                      m.confidence >= 80
                        ? 'bg-success-bg text-success'
                        : m.confidence >= 50
                          ? 'bg-warning-bg text-warning'
                          : 'bg-danger-bg text-danger',
                    )}
                  >
                    {m.subValue}
                  </span>
                )}
              </div>
              {m.confidence !== undefined && (
                <div className="w-full h-1 bg-paper-dark/40 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      m.confidence >= 80
                        ? 'bg-success'
                        : m.confidence >= 50
                          ? 'bg-warning'
                          : 'bg-danger',
                    )}
                    style={{ width: `${m.confidence}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {/* 风险等级细分 */}
        <div className="mt-5 flex items-center gap-5 text-xs text-ink-muted">
          <span>其中：</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            严重 {stats.criticalCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            警告 {stats.warningCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            提示 {stats.infoCount}
          </span>
        </div>
      </ReportSection>

      {/* 置信度 */}
      <div className="h-px bg-rule/40" />
      <ReportSection number="02" title="置信度评估" subtitle="AI 对分析结果的确信程度">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-display font-medium text-ink tabular-nums leading-none">
              {stats.avgConfidence}%
            </span>
            <span
              className={cn(
                'text-sm px-2 py-1 rounded font-medium',
                stats.avgConfidence >= 80
                  ? 'bg-success-bg text-success'
                  : stats.avgConfidence >= 50
                    ? 'bg-warning-bg text-warning'
                    : 'bg-danger-bg text-danger',
              )}
            >
              {stats.avgConfidence >= 80 ? '高' : stats.avgConfidence >= 50 ? '中' : '低'}
            </span>
          </div>
          <div className="flex-1">
            <div className="h-2.5 bg-paper-dark/40 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 relative',
                  stats.avgConfidence >= 80
                    ? 'bg-gradient-to-r from-success-faint to-success'
                    : stats.avgConfidence >= 50
                      ? 'bg-gradient-to-r from-warning-faint to-warning'
                      : 'bg-gradient-to-r from-danger-faint to-danger',
                )}
                style={{ width: `${stats.avgConfidence}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
              </div>
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-ink-faint">
              <span>低可信度</span>
              <span>高可信度</span>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-paper-dark/30 border border-rule/40">
          <p className="text-xs text-ink-muted leading-relaxed">
            置信度反映 AI 对分析结论的确信程度。高置信度表示 AI
            有充分的证据支持其判断；低置信度表示结论可能存在不确定性，建议人工复核。
          </p>
        </div>
      </ReportSection>

      {/* 步骤耗时 */}
      <div className="h-px bg-rule/40" />
      <ReportSection number="03" title="分析步骤耗时" subtitle="7 步推理各步骤时间占比">
        {stats.stepTimings.length > 0 ? (
          <div className="space-y-3">
            {stats.stepTimings.map((step, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto] gap-x-4 items-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-muted">{step.name}</span>
                    <span className="text-xs text-ink-faint font-mono tabular-nums">
                      {step.durationMs > 1000
                        ? `${(step.durationMs / 1000).toFixed(1)}s`
                        : `${step.durationMs}ms`}
                    </span>
                  </div>
                  <div className="h-1 bg-paper-dark/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent/70 transition-[width] duration-700 ease-out"
                      style={{ width: `${(step.percent / maxStepPercent) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">暂无步骤数据</p>
        )}
      </ReportSection>

      {/* 风险类型分布 */}
      <div className="h-px bg-rule/40" />
      <ReportSection number="04" title="风险类型分布" subtitle="按风险类型分类统计">
        {stats.riskTypes.length > 0 ? (
          <div className="space-y-4">
            {/* 堆叠条 */}
            <div className="flex h-2.5 rounded-full overflow-hidden bg-paper-dark/40">
              {stats.riskTypes.map((type, idx) => (
                <div
                  key={idx}
                  className={cn('h-full transition-all duration-700', type.color)}
                  style={{
                    width: `${stats.totalRisks > 0 ? (type.count / stats.totalRisks) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>
            {/* 明细列表 */}
            <div className="space-y-2">
              {stats.riskTypes.map((type, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', type.color)} />
                  <span className="text-ink-muted flex-1">{type.type}</span>
                  <span className="text-ink-faint tabular-nums">
                    {stats.totalRisks > 0 ? Math.round((type.count / stats.totalRisks) * 100) : 0}%
                  </span>
                  <span className="text-ink font-medium tabular-nums w-8 text-right">
                    {type.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-faint">暂无风险数据</p>
        )}
      </ReportSection>

      <div className="h-px bg-rule/40" />
    </div>
  )
}

AnalysisDashboard.Skeleton = DashboardSkeleton
