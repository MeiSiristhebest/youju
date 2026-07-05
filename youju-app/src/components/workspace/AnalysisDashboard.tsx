import {
  BarChart3,
  Clock,
  FileText,
  Percent,
  PieChart,
  Shield,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { AnalyzeResult } from '../../types'
import { ConfidenceBar } from '../ui/ConfidenceBar'

interface AnalysisDashboardProps {
  result: AnalyzeResult
  className?: string
}

interface StatCardProps {
  icon: React.ReactNode
  iconBgClass: string
  iconColorClass: string
  value: string
  label: string
  trend?: {
    value: string
    direction: 'up' | 'down'
    positive?: boolean
  }
  extra?: React.ReactNode
  className?: string
}

function StatCard({
  icon,
  iconBgClass,
  iconColorClass,
  value,
  label,
  trend,
  extra,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-paper border border-rule/40 rounded-lg p-4 transition-colors duration-200 hover:border-rule/80',
        className,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center',
            iconBgClass,
            iconColorClass,
          )}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
              trend.positive !== false ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg',
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp size={10} strokeWidth={2} />
            ) : (
              <TrendingDown size={10} strokeWidth={2} />
            )}
            {trend.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-display font-semibold text-ink tracking-tight mb-1">
        {value}
      </div>
      <div className="text-xs text-ink-muted">{label}</div>
      {extra && <div className="mt-3">{extra}</div>}
    </div>
  )
}

function RiskLevelDots({
  critical,
  warning,
  info,
}: {
  critical: number
  warning: number
  info: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-danger" />
        <span className="text-[10px] text-ink-muted font-medium">{critical}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-warning" />
        <span className="text-[10px] text-ink-muted font-medium">{warning}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-[10px] text-ink-muted font-medium">{info}</span>
      </div>
    </div>
  )
}

interface StepTimingItem {
  name: string
  durationMs: number
  percent: number
}

function StepTimingChart({ steps }: { steps: StepTimingItem[] }) {
  const maxPercent = Math.max(...steps.map((s) => s.percent), 1)

  return (
    <div className="space-y-2.5">
      {steps.map((step, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-ink-muted truncate max-w-[120px]">{step.name}</span>
            <span className="text-[10px] text-ink-faint font-mono">
              {step.durationMs > 1000
                ? `${(step.durationMs / 1000).toFixed(1)}s`
                : `${step.durationMs}ms`}
            </span>
          </div>
          <div className="h-1.5 bg-paper-dark rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent transition-[width] duration-500 ease-out"
              style={{ width: `${(step.percent / maxPercent) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
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

const RISK_TYPE_LABELS: Record<string, string> = {
  conflict: '冲突',
  promise: '承诺缺失',
  missing: '遗漏',
  info: '提示',
}

function RiskTypeDistribution({ types }: { types: RiskTypeItem[] }) {
  const total = types.reduce((sum, t) => sum + t.count, 0)

  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden bg-paper-dark">
        {types.map((type, idx) => (
          <div
            key={idx}
            className={cn('h-full transition-all duration-500', type.color)}
            style={{ width: `${total > 0 ? (type.count / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {types.map((type, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', type.color)} />
            <span className="text-[10px] text-ink-muted flex-1 truncate">{type.type}</span>
            <span className="text-[10px] text-ink-faint font-mono">{type.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-paper border border-rule/40 rounded-lg p-4 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-paper-dark" />
            <div className="w-14 h-5 rounded bg-paper-dark" />
          </div>
          <div className="h-7 w-20 bg-paper-dark rounded mb-1.5" />
          <div className="h-3 w-16 bg-paper-dark rounded mb-3" />
          <div className="h-4 w-full bg-paper-dark rounded" />
        </div>
      ))}
    </div>
  )
}

export function AnalysisDashboard({ result, className }: AnalysisDashboardProps) {
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
        type: RISK_TYPE_LABELS[type] || type,
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
  }, [result])

  return (
    <div className={cn('p-4', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={<FileText size={18} strokeWidth={1.5} />}
          iconBgClass="bg-accent-bg"
          iconColorClass="text-accent"
          value={`${stats.sourceCount} 份`}
          label="材料总数"
          trend={{
            value: '12%',
            direction: 'up',
            positive: true,
          }}
        />

        <StatCard
          icon={<Shield size={18} strokeWidth={1.5} />}
          iconBgClass="bg-danger-bg"
          iconColorClass="text-danger"
          value={`${stats.totalRisks} 个`}
          label="风险总数"
          extra={
            <RiskLevelDots
              critical={stats.criticalCount}
              warning={stats.warningCount}
              info={stats.infoCount}
            />
          }
        />

        <StatCard
          icon={<Percent size={18} strokeWidth={1.5} />}
          iconBgClass="bg-success-bg"
          iconColorClass="text-success"
          value={`${stats.avgConfidence}%`}
          label="平均置信度"
          extra={
            <ConfidenceBar confidence={stats.avgConfidence} size="sm" showLabel={false} fullWidth />
          }
        />

        <StatCard
          icon={<Clock size={18} strokeWidth={1.5} />}
          iconBgClass="bg-warning-bg"
          iconColorClass="text-warning"
          value={stats.durationStr}
          label="分析耗时"
          trend={{
            value: '8%',
            direction: 'down',
            positive: true,
          }}
        />

        <div className="bg-paper border border-rule/40 rounded-lg p-4 transition-colors duration-200 hover:border-rule/80 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-accent-tertiary-bg text-accent-tertiary flex items-center justify-center">
              <BarChart3 size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs font-medium text-ink">7 步耗时分布</div>
              <div className="text-[10px] text-ink-faint">各分析步骤占比</div>
            </div>
          </div>
          {stats.stepTimings.length > 0 ? (
            <StepTimingChart steps={stats.stepTimings.slice(0, 7)} />
          ) : (
            <div className="text-center py-4 text-[11px] text-ink-faint">暂无步骤数据</div>
          )}
        </div>

        <div className="bg-paper border border-rule/40 rounded-lg p-4 transition-colors duration-200 hover:border-rule/80 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-accent-bg text-accent flex items-center justify-center">
              <PieChart size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs font-medium text-ink">风险类型分布</div>
              <div className="text-[10px] text-ink-faint">按风险类型统计</div>
            </div>
          </div>
          {stats.riskTypes.length > 0 ? (
            <RiskTypeDistribution types={stats.riskTypes} />
          ) : (
            <div className="text-center py-4 text-[11px] text-ink-faint">暂无风险数据</div>
          )}
        </div>
      </div>
    </div>
  )
}

AnalysisDashboard.Skeleton = DashboardSkeleton
