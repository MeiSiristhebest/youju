import { Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useAnalysisStore } from '../../../stores'
import type { ReasoningStep } from '../../../types'
import type { FunnelStep } from '../FunnelChart'
import { FUNNEL_STEP_DEFINITIONS, FunnelChart } from '../FunnelChart'
import { IncrementalDetailPanel } from '../IncrementalDetailPanel'
import { ReasoningStepCard } from './ReasoningStepCard'

const STEP_ID_TO_FUNNEL_KEY: Record<string, string> = {
  'step-scenario-discovery': 'scenario_discovery',
  'step-input-parsing': 'input_parsing',
  'step-dimension-discovery': 'dimension_discovery',
  'step-cross-source-extraction': 'cross_source_extraction',
  'step-discrepancy-detection': 'diff_detection_evidence',
  'step-self-check': 'self_check_loop',
  'step-final-output': 'final_output',
}

const FUNNEL_KEY_ALIASES: Record<string, string[]> = {
  scenario_discovery: ['场景识别', '场景发现', 'scenario'],
  input_parsing: ['材料解析', '输入解析', '多材料结构化解析', 'parsing'],
  dimension_discovery: ['维度发现', '维度提取', '分析维度发现与归纳', 'dimensions'],
  cross_source_extraction: ['跨源提取', '要素提取', '跨源要素提取', 'extraction'],
  diff_detection_evidence: ['冲突检测', '差异检测', '冲突与差异检测', 'detection'],
  self_check_loop: ['结果校验', '证据校验', '证据链校验与自我验证', 'validation'],
  final_output: ['报告生成', '最终输出', '最终报告组装与输出', 'output'],
}

function matchTraceStepToFunnelKey(step: ReasoningStep, funnelKey: string): boolean {
  if (step.stepId && STEP_ID_TO_FUNNEL_KEY[step.stepId] === funnelKey) {
    return true
  }
  const aliases = FUNNEL_KEY_ALIASES[funnelKey] || []
  const stepText = [step.step, step.name, step.title].filter(Boolean).join(' ')
  return aliases.some((alias) => stepText.includes(alias))
}

export function TraceView() {
  const result = useAnalysisStore((state) => state.result)
  const analysisStep = useAnalysisStore((state) => state.analysisStep)
  const analyzing = useAnalysisStore((state) => state.analyzing)
  const failedSteps = useAnalysisStore((state) => state.failedSteps)
  const skippedSteps = useAnalysisStore((state) => state.skippedSteps)
  const incrementalMeta = useAnalysisStore((state) => state.result?.incrementalMeta)

  const funnelSteps = useMemo<FunnelStep[]>(() => {
    const traceSteps = result?.reasoningTrace || []

    const traceStepByKey = new Map<string, ReasoningStep>()
    FUNNEL_STEP_DEFINITIONS.forEach((stepDef) => {
      const matched = traceSteps.find((s) => matchTraceStepToFunnelKey(s, stepDef.key))
      if (matched) traceStepByKey.set(stepDef.key, matched)
    })

    return FUNNEL_STEP_DEFINITIONS.map((stepDef, defIndex) => {
      const traceStep = traceStepByKey.get(stepDef.key) ?? traceSteps[defIndex]

      const isCompleted = defIndex < analysisStep || (!!result && !analyzing)
      const isRunning = defIndex === analysisStep && analyzing
      const isFailed = failedSteps.has(defIndex)
      const isSkipped = skippedSteps.has(defIndex)

      let status: FunnelStep['status'] = 'pending'
      if (isFailed) status = 'failed'
      else if (isSkipped) status = 'skipped'
      else if (isRunning) status = 'running'
      else if (isCompleted) status = 'completed'

      const durationMs = traceStep?.durationMs

      return {
        id: stepDef.key,
        name: traceStep?.title || stepDef.name,
        description: traceStep?.description || stepDef.description,
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
        index: defIndex,
      }
    })
  }, [result, analysisStep, analyzing, failedSteps, skippedSteps])

  if (!result?.reasoningTrace || result.reasoningTrace.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4">
        <div className="w-16 h-16 mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
          <Sparkles size={28} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium text-ink mb-1">暂无思考过程</p>
        <p className="text-xs text-ink-faint">分析完成后将展示 AI 推理步骤</p>
      </div>
    )
  }

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
