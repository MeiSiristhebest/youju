import {
  AlertTriangle,
  CheckCircle,
  FileCheck,
  FileText,
  LayoutGrid,
  Search,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../i18n'
import { cn } from '../../lib/utils'
import { useAnalysisStore } from '../../stores'

const STEP_LABELS = [
  { key: 'scenario', name: '场景识别', desc: '分析材料类型和场景', icon: Target },
  { key: 'parsing', name: '材料解析', desc: '提取关键信息和要素', icon: FileText },
  { key: 'dimensions', name: '维度提取', desc: '识别需要比对的维度', icon: LayoutGrid },
  { key: 'extraction', name: '要素提取', desc: '从各材料提取信息', icon: Search },
  { key: 'detection', name: '冲突检测', desc: '检测不一致和风险', icon: AlertTriangle },
  { key: 'validation', name: '结果校验', desc: '自我验证和修正', icon: CheckCircle },
  { key: 'output', name: '报告生成', desc: '生成最终分析报告', icon: FileCheck },
]

interface StepControlPanelProps {
  onCancel?: () => void
  onRetry?: () => void
  compact?: boolean
}

export function StepControlPanel({ onCancel, onRetry, compact = false }: StepControlPanelProps) {
  const { t } = useTranslation()
  const streaming = useAnalysisStore((state) => state.streaming)
  const streamProgress = useAnalysisStore((state) => state.streamProgress)
  const analysisStep = useAnalysisStore((state) => state.analysisStep)
  const streamError = useAnalysisStore((state) => state.streamError)
  const analyzing = useAnalysisStore((state) => state.analyzing)
  const result = useAnalysisStore((state) => state.result)
  const failedSteps = useAnalysisStore((state) => state.failedSteps)
  const skippedSteps = useAnalysisStore((state) => state.skippedSteps)
  const markStepSkipped = useAnalysisStore((state) => state.markStepSkipped)
  const retryStep = useAnalysisStore((state) => state.retryStep)
  const resetStepControl = useAnalysisStore((state) => state.resetStepControl)

  const [retrying, setRetrying] = useState<number | null>(null)
  const [skipping, setSkipping] = useState<number | null>(null)

  const progressPercent = streamProgress || (analysisStep + 1) * (100 / STEP_LABELS.length)

  const getStepStatus = (
    index: number,
  ): 'pending' | 'running' | 'completed' | 'failed' | 'skipped' => {
    if (failedSteps.has(index)) return 'failed'
    if (skippedSteps.has(index)) return 'skipped'
    if (index < analysisStep) return 'completed'
    if (index === analysisStep && analyzing) return 'running'
    return 'pending'
  }

  const handleRetryStep = async (index: number) => {
    setRetrying(index)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      retryStep(index)
      onRetry?.()
    } finally {
      setRetrying(null)
    }
  }

  const handleSkipStep = async (index: number) => {
    setSkipping(index)
    try {
      await new Promise((resolve) => setTimeout(resolve, 400))
      markStepSkipped(index)
    } finally {
      setSkipping(null)
    }
  }

  const hasFailedStep = failedSteps.size > 0

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 bg-paper-dark h-1 rounded-full overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-ink-faint font-mono tabular-nums">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="flex gap-1">
          {STEP_LABELS.map((step, idx) => {
            const status = getStepStatus(idx)
            return (
              <div
                key={step.key}
                className={cn(
                  'flex-1 h-1 rounded-full transition-all duration-300',
                  status === 'completed' && 'bg-success',
                  status === 'running' && 'bg-accent animate-pulse',
                  status === 'failed' && 'bg-danger',
                  status === 'skipped' && 'bg-warning/60',
                  status === 'pending' && 'bg-paper-dark',
                )}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto h-full my-auto">
      <div className="w-16 h-16 rounded-2xl bg-accent-bg flex items-center justify-center text-accent mb-6 animate-pulse">
        <Sparkles size={32} />
      </div>
      <h3 className="text-base font-semibold text-ink mb-2">
        {streaming ? 'AI 正在分析证据材料…' : analyzing ? '正在解析并提取材料…' : '步骤控制'}
      </h3>
      <p className="text-xs text-ink-faint mb-6 leading-relaxed">
        有据正在调用底层的多源推理
        Pipeline，对您提供的聊天记录、文档和网页进行交叉要素比对，生成可溯源的排雷检查报告。
      </p>

      <div className="w-full bg-paper-dark h-1.5 rounded-full overflow-hidden mb-8 border border-rule/50">
        <div
          className="bg-accent h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="w-full text-left space-y-2 mb-6">
        {STEP_LABELS.map((step, idx) => {
          const status = getStepStatus(idx)
          const Icon = step.icon
          const isActive = status === 'running'
          const isCompleted = status === 'completed'
          const isFailed = status === 'failed'
          const isSkipped = status === 'skipped'

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300',
                isActive
                  ? 'bg-paper border-accent shadow-sm scale-[1.01]'
                  : isFailed
                    ? 'bg-danger-bg/30 border-danger/30'
                    : isSkipped
                      ? 'bg-warning-bg/20 border-warning/20 opacity-70'
                      : isCompleted
                        ? 'bg-success-bg/30 border-success/20'
                        : 'bg-transparent border-transparent opacity-60',
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                  isCompleted
                    ? 'bg-success-bg text-success'
                    : isFailed
                      ? 'bg-danger-bg text-danger'
                      : isSkipped
                        ? 'bg-warning-bg text-warning'
                        : isActive
                          ? 'bg-accent-bg text-accent animate-pulse'
                          : 'bg-paper-dark text-ink-faint',
                )}
              >
                {isCompleted ? (
                  <CheckCircle size={14} />
                ) : isFailed ? (
                  <Zap size={14} />
                ) : isSkipped ? (
                  <Zap size={14} />
                ) : (
                  <Icon size={14} strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-xs font-semibold',
                    isActive
                      ? 'text-accent'
                      : isFailed
                        ? 'text-danger'
                        : isSkipped
                          ? 'text-warning'
                          : isCompleted
                            ? 'text-ink'
                            : 'text-ink-muted',
                  )}
                >
                  {step.name}
                  {isActive && (
                    <span className="text-[10px] font-normal text-accent/80 ml-2">
                      运行中 ({Math.round(progressPercent)}%)
                    </span>
                  )}
                  {isSkipped && (
                    <span className="text-[10px] font-normal text-warning/80 ml-2">已跳过</span>
                  )}
                </div>
                <div className="text-[10px] text-ink-faint mt-0.5">{step.desc}</div>
              </div>
              {isFailed && !retrying && !skipping && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-warning-bg text-warning border border-warning/20 cursor-pointer hover:bg-warning-bg/70 transition-colors duration-200 disabled:opacity-50"
                    onClick={() => handleRetryStep(idx)}
                    disabled={retrying === idx}
                  >
                    {retrying === idx ? t('steps.retrying') : t('common.retry')}
                  </button>
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-paper-dark text-ink-muted border border-rule cursor-pointer hover:bg-paper-deep transition-colors duration-200 disabled:opacity-50"
                    onClick={() => handleSkipStep(idx)}
                    disabled={skipping === idx}
                  >
                    {skipping === idx ? t('steps.skipping') : t('common.skip')}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {streamError && (
        <div className="w-full p-3 rounded-lg bg-danger-bg/50 border border-danger/20 text-danger text-[11px] text-left mb-4 flex gap-2 items-start animate-fade-in">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>{streamError}</div>
        </div>
      )}

      {hasFailedStep && (
        <button
          type="button"
          className="w-full px-4 py-2.5 rounded-lg text-xs font-medium bg-accent text-paper border-none cursor-pointer hover:bg-accent-soft transition-colors duration-200 mb-3"
          onClick={() => {
            resetStepControl()
            onRetry?.()
          }}
        >
          {t('steps.resumeFromBreakpoint')}
        </button>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-rule rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark transition-all duration-200"
        >
          取消分析
        </button>
      )}

      {result && !analyzing && (
        <div className="text-[10px] text-ink-faint font-mono mt-4">
          分析完成 · {result.risks?.length || 0} 个风险识别
        </div>
      )}
    </div>
  )
}
