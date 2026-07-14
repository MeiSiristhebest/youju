import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Clock, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { ReasoningStep } from '../../../types'

interface ReasoningStepCardProps {
  step: ReasoningStep
  index: number
}

export function ReasoningStepCard({ step, index }: ReasoningStepCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={12} className="text-success" />
      case 'running':
      case 'current':
        return <RefreshCw size={12} className="text-accent animate-spin" />
      case 'failed':
        return <AlertTriangle size={12} className="text-danger" />
      default:
        return <Clock size={12} className="text-ink-faint" />
    }
  }

  const stepTitle = step.title ?? step.name ?? `步骤 ${index + 1}`
  const stepDescription = step.description ?? ''
  const stepDetails = (step as { thought?: string }).thought ?? step.detail ?? step.result
  const stepLatency = (step as { latencyMs?: number }).latencyMs ?? step.durationMs

  return (
    <div className="mb-4 text-left">
      <div className="absolute left-[7px] w-2.5 h-2.5 rounded-full bg-paper border border-rule flex items-center justify-center -mt-0.5 shrink-0 z-10">
        <div className="w-1 h-1 rounded-full bg-ink-faint" />
      </div>
      <div className="bg-paper-dark/20 border border-rule/50 hover:border-rule rounded-xl transition-all duration-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-3 text-left cursor-pointer bg-transparent border-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono text-ink-faint">0{index + 1}</span>
                <span className="text-xs font-semibold text-ink">{stepTitle}</span>
                {getStepStatusIcon(step.status ?? '')}
              </div>
              {stepDescription && (
                <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">
                  {stepDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              {stepLatency !== undefined && (
                <span className="text-[9px] font-mono text-ink-faint">
                  {stepLatency > 1000 ? `${(stepLatency / 1000).toFixed(1)}s` : `${stepLatency}ms`}
                </span>
              )}
              {isOpen ? (
                <ChevronUp size={12} className="text-ink-faint" />
              ) : (
                <ChevronDown size={12} className="text-ink-faint" />
              )}
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="px-3.5 pb-3 border-t border-rule/30 pt-2.5 animate-slide-down">
            {stepDetails && stepDetails !== stepDescription && (
              <p className="text-[11px] text-ink-muted leading-relaxed mb-3">{stepDetails}</p>
            )}
            {((step as { output?: unknown }).output ?? step.result) && (
              <div className="rounded-lg bg-paper-dark/60 border border-rule p-2.5 overflow-x-auto max-h-48">
                <pre className="text-[9px] font-mono text-ink-muted leading-relaxed whitespace-pre-wrap break-all">
                  {typeof ((step as { output?: unknown }).output ?? step.result) === 'string'
                    ? String((step as { output?: unknown }).output ?? step.result)
                    : JSON.stringify((step as { output?: unknown }).output ?? step.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
