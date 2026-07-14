import type {
  AIAnalysisPort,
  AIStepOutput,
  AnalyzeResult,
  ScenarioKnowledge,
  Source,
} from '../../domain/types.js'
import { isMockMode } from '../../infrastructure/env.js'
import type { AIConfig } from '../llm.js'
import { registerDefaultSteps } from '../pipeline/defaultSteps.js'
import { PipelineExecutor } from '../pipeline/executor.js'
import { defaultStepRegistry } from '../pipeline/registry.js'
import type { PipelineState, PipelineStep } from '../pipeline/types.js'

interface AnalysisResponse {
  result: AnalyzeResult
  steps: Array<{
    id: string
    name: string
    status: string
    modelVersion: string
    promptVersion: string
    tokenPrompt: number
    tokenCompletion: number
    latencyMs: number
  }>
  totalTokens: number
  totalLatencyMs: number
  isMock: boolean
}

interface BuildResponseOptions {
  finalState: PipelineState
  sources: Source[]
  aiConfig?: AIConfig
  isDemo?: boolean
}

function buildAnalysisResponse({
  finalState,
  sources,
  aiConfig,
  isDemo,
}: BuildResponseOptions): AnalysisResponse {
  const finalStep = finalState.steps.find((s) => s.id === 'step-final-output')
  const finalData = finalStep?.output?.data as { result?: AnalyzeResult } | undefined
  let result: AnalyzeResult = finalData?.result || {
    summary: { critical: 0, warning: 0, info: 0, total: 0 },
    risks: [],
    checklist: [],
    alignedVersion: '',
    extractedEntities: { dates: [], amounts: [], terms: [], promises: [] },
  }

  const steps = finalState.steps.map((step) => {
    const startedAt = step.startedAt ? new Date(step.startedAt).getTime() : 0
    const completedAt = step.completedAt ? new Date(step.completedAt).getTime() : 0
    const latencyMs =
      completedAt > startedAt ? completedAt - startedAt : step.output?.latencyMs || 0
    return {
      id: step.id,
      name: step.name,
      status: step.status,
      modelVersion: step.modelVersion,
      promptVersion: step.promptVersion,
      tokenPrompt: step.output?.tokenPrompt || 0,
      tokenCompletion: step.output?.tokenCompletion || 0,
      latencyMs,
    }
  })

  const totalTokens = steps.reduce((sum, s) => sum + s.tokenPrompt + s.tokenCompletion, 0)
  const totalLatencyMs = steps.reduce((sum, s) => sum + s.latencyMs, 0)

  const isMock = isMockMode(aiConfig?.apiKey, isDemo)

  const normalizedRisks = result.risks.map((r) => ({
    ...r,
    confidence:
      typeof r.confidence === 'number' && r.confidence <= 1
        ? Math.round(r.confidence * 100)
        : r.confidence,
    evidence: r.evidence.map((e) => ({
      ...e,
      confidence:
        typeof e.confidence === 'number' && e.confidence <= 1
          ? Math.round(e.confidence * 100)
          : e.confidence,
    })),
  }))
  const normalizedRelations = result.riskRelations
    ? {
        ...result.riskRelations,
        validationResults: result.riskRelations.validationResults?.map((v) => ({
          ...v,
          confidence:
            typeof v.confidence === 'number' && v.confidence <= 1
              ? Math.round(v.confidence * 100)
              : v.confidence,
        })),
      }
    : undefined

  const modelName = steps.find((s) => s.modelVersion)?.modelVersion || aiConfig?.model || ''
  const enrichedReasoningTrace = result.reasoningTrace
    ? result.reasoningTrace.map((r) => {
        const stepInfo = steps.find(
          (s) =>
            s.id === (r.stepId as string | undefined) ||
            s.id.toLowerCase().includes(String(r.step || '').toLowerCase()) ||
            s.name.toLowerCase().includes(String(r.step || '').toLowerCase()),
        )
        return {
          ...r,
          durationMs: stepInfo?.latencyMs,
        }
      })
    : []

  result = {
    ...result,
    risks: normalizedRisks,
    riskRelations: normalizedRelations,
    meta: {
      ...result.meta,
      durationMs: totalLatencyMs,
      isMock,
      sourceCount: sources.length,
      sourceIds: sources.map((s) => s.id),
    },
    debugInfo: {
      model: modelName,
      tokenPrompt: totalTokens > 0 ? Math.round(totalTokens * 0.5) : 0,
      tokenCompletion: totalTokens > 0 ? Math.round(totalTokens * 0.5) : 0,
      tokenTotal: totalTokens,
      rawOutput: result.debugInfo?.rawOutput || '',
      systemPromptPreview: result.debugInfo?.systemPromptPreview || '',
      userPromptPreview: result.debugInfo?.userPromptPreview || '',
      isMock,
    },
    reasoningTrace: enrichedReasoningTrace,
  }

  return {
    result,
    steps,
    totalTokens,
    totalLatencyMs,
    isMock,
  }
}

export class AnalysisAdapter implements AIAnalysisPort {
  constructor() {
    registerDefaultSteps()
  }

  async analyze(
    sources: Source[],
    options: {
      scenarioType?: string
      scenarioKnowledge?: ScenarioKnowledge[]
      aiConfig?: AIConfig
      isDemo?: boolean
      onStepStart?: (step: { id: string; name: string }) => void
      onStepComplete?: (step: { id: string; name: string; output: AIStepOutput }) => void
      onStepError?: (step: { id: string; name: string; error: string }) => void
      onProgress?: (state: Record<string, unknown>) => void
    } = {},
  ): Promise<AnalysisResponse> {
    const executor = new PipelineExecutor(defaultStepRegistry.getAll(), {
      onStepStart: (step: PipelineStep) => {
        console.log('[AnalysisAdapter] onStepStart:', step.id, step.name)
        options.onStepStart?.({ id: step.id, name: step.name })
      },
      onStepComplete: (step: PipelineStep) => {
        console.log(
          '[AnalysisAdapter] onStepComplete:',
          step.id,
          step.name,
          'hasOutput:',
          !!step.output,
        )
        options.onStepComplete?.({
          id: step.id,
          name: step.name,
          output: (step.output || { data: null }) as AIStepOutput,
        })
      },
      onStepError: (step: PipelineStep, error: Error) => {
        console.log('[AnalysisAdapter] onStepError:', step.id, step.name, error.message)
        options.onStepError?.({
          id: step.id,
          name: step.name,
          error: error.message,
        })
      },
      onProgress: (state) => {
        options.onProgress?.(state as unknown as Record<string, unknown>)
      },
    })

    const finalState = await executor.execute({
      sources,
      scenarioType: options.scenarioType,
      scenarioKnowledge: options.scenarioKnowledge,
      aiConfig: options.aiConfig,
      isDemo: options.isDemo,
    })

    if (finalState.status === 'failed') {
      const failedStep = finalState.steps.find((s) => s.status === 'failed')
      const errorMsg = failedStep
        ? `步骤 ${failedStep.name} 执行失败: ${failedStep.error || '未知错误'}`
        : finalState.error || 'Pipeline 执行失败'
      throw new Error(errorMsg)
    }

    return buildAnalysisResponse({
      finalState,
      sources,
      aiConfig: options.aiConfig,
      isDemo: options.isDemo,
    })
  }

  async resumeFromCheckpoint(
    sources: Source[],
    checkpoint: {
      stepOutputs: Record<string, unknown>
      lastCompletedStepId: string
      lastCompletedStepIndex: number
    },
    options: {
      scenarioType?: string
      scenarioKnowledge?: ScenarioKnowledge[]
      aiConfig?: AIConfig
      onStepStart?: (step: { id: string; name: string }) => void
      onStepComplete?: (step: { id: string; name: string; output: AIStepOutput }) => void
      onStepError?: (step: { id: string; name: string; error: string }) => void
    } = {},
  ): Promise<AnalysisResponse> {
    const executor = new PipelineExecutor(defaultStepRegistry.getAll(), {
      onStepStart: (step: PipelineStep) => {
        options.onStepStart?.({ id: step.id, name: step.name })
      },
      onStepComplete: (step: PipelineStep) => {
        console.log(
          '[AnalysisAdapter] onStepComplete (resume):',
          step.id,
          step.name,
          'hasOutput:',
          !!step.output,
        )
        options.onStepComplete?.({
          id: step.id,
          name: step.name,
          output: (step.output || { data: null }) as AIStepOutput,
        })
      },
      onStepError: (step: PipelineStep, error: Error) => {
        options.onStepError?.({
          id: step.id,
          name: step.name,
          error: error.message,
        })
      },
    })

    const previousOutputs = checkpoint.stepOutputs || {}

    executor.prepareResumeFromCheckpoint(
      {
        sources,
        scenarioType: options.scenarioType,
        scenarioKnowledge: options.scenarioKnowledge,
        aiConfig: options.aiConfig,
      },
      previousOutputs,
      checkpoint.lastCompletedStepIndex + 1,
    )

    const finalState = await executor.resumeFromStep(checkpoint.lastCompletedStepIndex + 1)

    return buildAnalysisResponse({
      finalState,
      sources,
      aiConfig: options.aiConfig,
    })
  }
}

export const analysisAdapter = new AnalysisAdapter()
