import { Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useAnalysisStore } from '../../../stores'
import type { ReasoningStep } from '../../../types'
import type { FunnelStep } from '../FunnelChart'
import { FUNNEL_STEP_DEFINITIONS, FunnelChart } from '../FunnelChart'
import { IncrementalDetailPanel } from '../IncrementalDetailPanel'
import { ReasoningStepCard } from './ReasoningStepCard'

export function TraceView() {
  const result = useAnalysisStore((state) => state.result)
  const analysisStep = useAnalysisStore((state) => state.analysisStep)
  const analyzing = useAnalysisStore((state) => state.analyzing)
  const failedSteps = useAnalysisStore((state) => state.failedSteps)
  const skippedSteps = useAnalysisStore((state) => state.skippedSteps)
  const incrementalMeta = useAnalysisStore((state) => state.result?.incrementalMeta)

  const funnelSteps = useMemo<FunnelStep[]>(() => {
    const traceSteps = result?.reasoningTrace || []

    return FUNNEL_STEP_DEFINITIONS.map((stepDef, index) => {
      const traceStep = traceSteps[index]
      const isCompleted = index < analysisStep || (!!result && !analyzing)
      const isRunning = index === analysisStep && analyzing
      const isFailed = failedSteps.has(index)
      const isSkipped = skippedSteps.has(index)

      let status: FunnelStep['status'] = 'pending'
      if (isFailed) status = 'failed'
      else if (isSkipped) status = 'skipped'
      else if (isRunning) status = 'running'
      else if (isCompleted) status = 'completed'

      const durationMs = traceStep?.durationMs ?? (isCompleted ? 800 + index * 300 : undefined)

      return {
        id: stepDef.key,
        name: stepDef.name,
        description: stepDef.description,
        durationMs,
        status,
        failureRate: isFailed ? 100 : undefined,
        details: traceStep
          ? {
              ...traceStep,
              title: traceStep.title ?? stepDef.name,
              description: traceStep.description ?? stepDef.description,
            }
          : undefined,
        index,
      }
    })
  }, [result, analysisStep, analyzing, failedSteps, skippedSteps])

  if (!result?.reasoningTrace) return null

  return (
    <div className="space-y-4 p-4 text-left">
      {incrementalMeta?.isIncremental && <IncrementalDetailPanel meta={incrementalMeta} />}

      <div className="rounded-xl border border-rule bg-paper-dark/20 p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-bg text-accent flex items-center justify-center">
            <Sparkles size={14} strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">推理漏斗</div>
            <div className="text-[10px] text-ink-faint">7 步推理过程，宽度代表耗时占比</div>
          </div>
        </div>
        <FunnelChart steps={funnelSteps} />
      </div>

      <div className="mb-2 flex items-center gap-2.5 px-1">
        <div className="w-8 h-8 rounded-full bg-accent-tertiary-bg text-accent-tertiary flex items-center justify-center">
          <Sparkles size={15} strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-sm font-medium text-ink">AI 思考过程</div>
          <div className="text-[11px] text-ink-faint">
            共 {result.reasoningTrace.length} 个步骤，点击展开查看详情
          </div>
        </div>
      </div>

      <div className="relative pl-5">
        <div className="absolute left-[11px] top-1 bottom-1 w-px bg-rule" />
        {result.reasoningTrace?.map((step: ReasoningStep, idx: number) => (
          <ReasoningStepCard key={idx} step={step} index={idx} />
        ))}
      </div>

      {result.debugInfo && (
        <div className="mt-5 rounded-lg border border-rule bg-paper/[0.02] overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-rule flex items-center justify-between">
            <span className="text-xs font-medium text-ink">开发者调试信息</span>
          </div>
          <div className="p-3.5 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-ink-faint">模型</span>
              <span className="text-ink-faint font-mono">{result.debugInfo.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Prompt Tokens</span>
              <span className="text-ink-faint font-mono">{result.debugInfo.tokenPrompt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Completion Tokens</span>
              <span className="text-ink-faint font-mono">{result.debugInfo.tokenCompletion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Total Tokens</span>
              <span className="text-ink-faint font-mono">{result.debugInfo.tokenTotal}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
