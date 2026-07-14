import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ReasoningStep } from '@/types'

export interface FunnelStep {
  id: string
  name: string
  description?: string
  durationMs?: number
  status: 'completed' | 'running' | 'pending' | 'failed' | 'skipped'
  failureRate?: number
  details?: ReasoningStep
  index: number
}

interface FunnelChartProps {
  steps: FunnelStep[]
  totalDurationMs?: number
  onStepClick?: (step: FunnelStep) => void
  className?: string
}

const ACCENT_GRADIENT = [
  'bg-primary-700',
  'bg-primary-600',
  'bg-primary-500',
  'bg-primary-500/90',
  'bg-primary-400',
  'bg-primary-400/80',
  'bg-primary-300',
]

export function FunnelChart({ steps, totalDurationMs, onStepClick, className }: FunnelChartProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  const maxDuration = Math.max(...steps.map((s) => s.durationMs || 100), 1)
  const calculatedTotal = totalDurationMs ?? steps.reduce((sum, s) => sum + (s.durationMs || 0), 0)

  const handleStepClick = (step: FunnelStep, index: number) => {
    setExpandedStep(expandedStep === index ? null : index)
    onStepClick?.(step)
  }

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return '--'
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${ms}ms`
  }

  const getStepStatusIcon = (status: FunnelStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={12} className="text-success" />
      case 'running':
        return <RefreshCw size={12} className="text-accent animate-spin" />
      case 'failed':
        return <AlertTriangle size={12} className="text-danger" />
      case 'skipped':
        return <Zap size={12} className="text-warning" />
      default:
        return <Clock size={12} className="text-ink-faint" />
    }
  }

  const getBarBgClass = (status: FunnelStep['status'], index: number) => {
    if (status === 'failed') return 'bg-danger'
    if (status === 'skipped') return 'bg-warning/60'
    if (status === 'pending') return 'bg-paper-dark'
    if (status === 'running') return ACCENT_GRADIENT[Math.min(index, ACCENT_GRADIENT.length - 1)]
    return ACCENT_GRADIENT[Math.min(index, ACCENT_GRADIENT.length - 1)]
  }

  const calculateWidthPercent = (step: FunnelStep) => {
    if (step.status === 'pending') return 40
    const duration = step.durationMs || 0
    return Math.max(30, (duration / maxDuration) * 100)
  }

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {steps.map((step, index) => {
        const isExpanded = expandedStep === index
        const widthPercent = calculateWidthPercent(step)
        const barBgClass = getBarBgClass(step.status, index)
        const isInteractive = step.status !== 'pending' || step.details

        return (
          <div key={step.id} className="w-full">
            <button
              type="button"
              onClick={() => isInteractive && handleStepClick(step, index)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300 text-left',
                step.status === 'running'
                  ? 'bg-accent-bg/40 border-accent/30'
                  : step.status === 'failed'
                    ? 'bg-danger-bg/20 border-danger/20'
                    : step.status === 'skipped'
                      ? 'bg-warning-bg/20 border-warning/20'
                      : step.status === 'completed'
                        ? 'bg-success-bg/10 border-success/10 hover:border-success/20'
                        : 'bg-paper-dark/30 border-rule/50 opacity-60',
                isInteractive ? 'cursor-pointer hover:bg-paper-dark/50' : 'cursor-default',
              )}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                <span className="text-[10px] font-mono text-ink-faint">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      'text-xs font-semibold truncate',
                      step.status === 'running'
                        ? 'text-accent'
                        : step.status === 'failed'
                          ? 'text-danger'
                          : step.status === 'skipped'
                            ? 'text-warning'
                            : step.status === 'completed'
                              ? 'text-ink'
                              : 'text-ink-muted',
                    )}
                  >
                    {step.name}
                  </span>
                  {getStepStatusIcon(step.status)}
                  {step.failureRate !== undefined && step.failureRate > 0 && (
                    <span className="text-[9px] font-mono text-danger bg-danger-bg/50 px-1.5 py-0.5 rounded">
                      {step.failureRate}% 失败
                    </span>
                  )}
                </div>

                <div className="relative h-5 rounded-md overflow-hidden bg-paper-dark/60">
                  <div
                    className={cn(
                      'h-full rounded-md transition-all duration-500 ease-out',
                      barBgClass,
                      step.status === 'running' ? 'animate-pulse' : '',
                    )}
                    style={{ width: `${widthPercent}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-[9px] font-mono text-ink-faint">
                      {formatDuration(step.durationMs)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {step.durationMs !== undefined && calculatedTotal > 0 && (
                  <span className="text-[9px] font-mono text-ink-faint tabular-nums">
                    {((step.durationMs / calculatedTotal) * 100).toFixed(0)}%
                  </span>
                )}
                {isInteractive && (
                  <div className="w-5 h-5 flex items-center justify-center text-ink-faint">
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                )}
              </div>
            </button>

            {isExpanded && step.details && (
              <div className="mt-1.5 ml-9 mr-3 rounded-lg border border-rule/50 bg-paper/60 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                {step.details.description && (
                  <div className="px-3 py-2 border-b border-rule/30">
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      {step.details.description}
                    </p>
                  </div>
                )}
                {(step.details.detail || step.details.result) && (
                  <div className="px-3 py-2.5 max-h-40 overflow-y-auto">
                    <pre className="text-[10px] font-mono text-ink-muted leading-relaxed whitespace-pre-wrap break-all">
                      {step.details.detail || step.details.result}
                    </pre>
                  </div>
                )}
                <div className="px-3 py-2 border-t border-rule/30 bg-paper-dark/30 flex items-center gap-4">
                  {step.details.durationMs !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-ink-faint" />
                      <span className="text-[9px] font-mono text-ink-faint">
                        耗时: {formatDuration(step.details.durationMs)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {calculatedTotal > 0 && (
        <div className="flex items-center justify-between px-3 pt-2 mt-1 border-t border-rule/40">
          <span className="text-[10px] font-mono text-ink-faint">总耗时</span>
          <span className="text-[10px] font-mono text-ink-muted tabular-nums">
            {formatDuration(calculatedTotal)}
          </span>
        </div>
      )}
    </div>
  )
}

export const FUNNEL_STEP_DEFINITIONS = [
  {
    key: 'scenario_discovery',
    name: '场景发现',
    description: '识别材料类型，匹配分析场景模板',
  },
  {
    key: 'input_parsing',
    name: '输入解析',
    description: '从多源材料中提取关键信息和要素',
  },
  {
    key: 'dimension_discovery',
    name: '维度发现',
    description: '识别需要对比分析的核心维度',
  },
  {
    key: 'cross_source_extraction',
    name: '跨源提取',
    description: '按维度从各材料中提取标准化要素',
  },
  {
    key: 'diff_detection_evidence',
    name: '差异检测 + 证据校验',
    description: '检测不一致性，交叉验证证据链',
  },
  {
    key: 'self_check_loop',
    name: '自检循环',
    description: '自我验证与修正，置信度评估',
  },
  {
    key: 'final_output',
    name: '最终输出',
    description: '生成最终分析报告和检查清单',
  },
]
