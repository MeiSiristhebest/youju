import { BarChart3, CheckCheck, FileText, Loader2, Ruler, Search, Target, Zap } from 'lucide-react'
import { useState } from 'react'
import { apiClient } from '../../services/apiClient'

type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

interface StepInfo {
  key: string
  name: string
}

const ANALYSIS_STEPS: StepInfo[] = [
  { key: 'scenario', name: '场景识别' },
  { key: 'parsing', name: '材料解析' },
  { key: 'dimensions', name: '维度提取' },
  { key: 'extraction', name: '要素提取' },
  { key: 'detection', name: '冲突检测' },
  { key: 'validation', name: '结果校验' },
  { key: 'output', name: '报告生成' },
]

const stepIcons = [Target, FileText, Ruler, Search, Zap, CheckCheck, BarChart3]

interface StepControlPanelProps {
  analysisLogId: string | null
  onRetryStep: (stepIndex: number) => void
  onSkipStep: (stepIndex: number) => void
  onResumeAnalysis: () => void
}

export function StepControlPanel({
  analysisLogId,
  onRetryStep,
  onSkipStep,
  onResumeAnalysis,
}: StepControlPanelProps) {
  const [steps, setSteps] = useState<StepStatus[]>(
    ANALYSIS_STEPS.map(() => 'pending' as StepStatus),
  )
  const [retrying, setRetrying] = useState<number | null>(null)
  const [skipping, setSkipping] = useState<number | null>(null)

  const handleRetry = async (index: number) => {
    if (!analysisLogId) return
    setRetrying(index)
    try {
      await apiClient.post(`/api/analyze/step/${index}/retry`)
      const newSteps = [...steps]
      newSteps[index] = 'running'
      setSteps(newSteps)
      onRetryStep(index)
    } catch (err) {
      console.error('Retry step failed:', err)
    } finally {
      setRetrying(null)
    }
  }

  const handleSkip = async (index: number) => {
    if (!analysisLogId) return
    setSkipping(index)
    try {
      await apiClient.post(`/api/analyze/step/${index}/skip`)
      const newSteps = [...steps]
      newSteps[index] = 'completed'
      setSteps(newSteps)
      onSkipStep(index)
    } catch (err) {
      console.error('Skip step failed:', err)
    } finally {
      setSkipping(null)
    }
  }

  const hasFailedStep = steps.some((s) => s === 'failed')

  const statusIcon = (status: StepStatus) => {
    const _IconComponent = stepIcons[0]
    switch (status) {
      case 'completed':
        return <CheckCheck size={14} strokeWidth={1.5} className="text-success" />
      case 'running':
        return <Loader2 size={14} strokeWidth={1.5} className="text-accent animate-spin" />
      case 'failed':
        return <span className="text-danger text-sm font-bold">×</span>
      default:
        return <span className="text-ink-faint text-sm">○</span>
    }
  }

  const statusColor = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return 'border-success/20 bg-success-bg'
      case 'running':
        return 'border-accent-faint bg-accent-bg/50'
      case 'failed':
        return 'border-danger/20 bg-danger-bg'
      default:
        return 'border-rule bg-paper/50'
    }
  }

  const StepIcon = stepIcons

  return (
    <div className="bg-paper border border-rule rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-ink font-display tracking-tight">步骤控制</h3>
        {analysisLogId && (
          <span className="text-[10px] text-ink-faint font-mono">{analysisLogId.slice(0, 8)}</span>
        )}
      </div>

      <div className="space-y-1.5">
        {ANALYSIS_STEPS.map((step, index) => {
          const Icon = StepIcon[index]
          return (
            <div
              key={step.key}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${statusColor(steps[index])}`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {statusIcon(steps[index])}
              </div>
              <Icon
                size={14}
                strokeWidth={1.5}
                className={
                  steps[index] === 'failed'
                    ? 'text-danger'
                    : steps[index] === 'running'
                      ? 'text-accent'
                      : steps[index] === 'completed'
                        ? 'text-success'
                        : 'text-ink-faint'
                }
              />
              <span
                className={`flex-1 text-xs font-medium ${
                  steps[index] === 'failed'
                    ? 'text-danger'
                    : steps[index] === 'running'
                      ? 'text-accent'
                      : steps[index] === 'completed'
                        ? 'text-success'
                        : 'text-ink-faint'
                }`}
              >
                {step.name}
              </span>
              {steps[index] === 'failed' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-warning-bg text-warning border border-warning/20 cursor-pointer hover:bg-warning-bg/70 transition-colors duration-200 disabled:opacity-50"
                    onClick={() => handleRetry(index)}
                    disabled={retrying === index}
                  >
                    {retrying === index ? '重试中…' : '重试'}
                  </button>
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-paper-dark text-ink-muted border border-rule cursor-pointer hover:bg-paper-deep transition-colors duration-200 disabled:opacity-50"
                    onClick={() => handleSkip(index)}
                    disabled={skipping === index}
                  >
                    {skipping === index ? '跳过中…' : '跳过'}
                  </button>
                </div>
              )}
              {steps[index] === 'running' && (
                <span className="text-[10px] text-accent font-medium">执行中…</span>
              )}
            </div>
          )
        })}
      </div>

      {hasFailedStep && (
        <button
          type="button"
          className="w-full mt-4 px-3 py-2.5 rounded-lg text-xs font-medium bg-accent text-paper border-none cursor-pointer hover:bg-accent-soft transition-colors duration-200"
          onClick={onResumeAnalysis}
        >
          从断点恢复
        </button>
      )}
    </div>
  )
}
