import type {
  AIAnalysisPort,
  AIStepOutput,
  AnalyzeResult,
  ScenarioKnowledge,
  SharedMainCallResult,
  Source,
} from '../../domain/types.js'
import type { AIConfig } from '../llm.js'
import { registerDefaultSteps } from '../pipeline/defaultSteps.js'
import { PipelineExecutor } from '../pipeline/executor.js'
import { defaultStepRegistry } from '../pipeline/registry.js'
import {
  resetSharedMainCallResult,
  setSharedMainCallResult,
} from '../pipeline/steps/step-scenario-discovery.js'
import type { PipelineStep } from '../pipeline/types.js'

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
      onStepStart?: (step: { id: string; name: string }) => void
      onStepComplete?: (step: { id: string; name: string; output: AIStepOutput }) => void
      onStepError?: (step: { id: string; name: string; error: string }) => void
      onProgress?: (state: Record<string, unknown>) => void
    } = {},
  ): Promise<{
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
  }> {
    resetSharedMainCallResult()

    const executor = new PipelineExecutor(defaultStepRegistry.getAll(), {
      onStepStart: (step: PipelineStep) => {
        options.onStepStart?.({ id: step.id, name: step.name })
      },
      onStepComplete: (step: PipelineStep) => {
        if (step.output) {
          options.onStepComplete?.({
            id: step.id,
            name: step.name,
            output: step.output as AIStepOutput,
          })
        }
      },
      onStepError: (step: PipelineStep, error: Error) => {
        options.onStepError?.({
          id: step.id,
          name: step.name,
          error: error.message,
        })
      },
      onProgress: (state) => {
        // PipelineState 是具体类型，转换为 Record<string, unknown> 用于对外回调
        options.onProgress?.(state as unknown as Record<string, unknown>)
      },
    })

    const finalState = await executor.execute({
      sources,
      scenarioType: options.scenarioType,
      scenarioKnowledge: options.scenarioKnowledge,
      aiConfig: options.aiConfig,
    })

    const finalStep = finalState.steps.find((s) => s.id === 'step-final-output')
    const finalData = finalStep?.output?.data as { result?: AnalyzeResult } | undefined
    const result: AnalyzeResult = finalData?.result || {
      summary: { critical: 0, warning: 0, info: 0, total: 0 },
      risks: [],
      checklist: [],
      alignedVersion: '',
      extractedEntities: { dates: [], amounts: [], terms: [], promises: [] },
    }

    const steps = finalState.steps.map((step) => ({
      id: step.id,
      name: step.name,
      status: step.status,
      modelVersion: step.modelVersion,
      promptVersion: step.promptVersion,
      tokenPrompt: step.output?.tokenPrompt || 0,
      tokenCompletion: step.output?.tokenCompletion || 0,
      latencyMs: step.output?.latencyMs || 0,
    }))

    const totalTokens = steps.reduce((sum, s) => sum + s.tokenPrompt + s.tokenCompletion, 0)
    const totalLatencyMs = steps.reduce((sum, s) => sum + s.latencyMs, 0)

    const isMock = !process.env.AI_API_KEY && !options.aiConfig?.apiKey

    return {
      result,
      steps,
      totalTokens,
      totalLatencyMs,
      isMock,
    }
  }

  async resumeFromCheckpoint(
    sources: Source[],
    checkpoint: {
      stepOutputs: Record<string, unknown>
      lastCompletedStepId: string
      lastCompletedStepIndex: number
      mainCallResult?: SharedMainCallResult
    },
    options: {
      scenarioType?: string
      scenarioKnowledge?: ScenarioKnowledge[]
      aiConfig?: AIConfig
      onStepStart?: (step: { id: string; name: string }) => void
      onStepComplete?: (step: { id: string; name: string; output: AIStepOutput }) => void
      onStepError?: (step: { id: string; name: string; error: string }) => void
    } = {},
  ): Promise<{
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
  }> {
    // 恢复 sharedMainCallResult：新 checkpoint 有 mainCallResult 字段时还原；旧 checkpoint 回退到旧行为
    if (checkpoint.mainCallResult) {
      setSharedMainCallResult(checkpoint.mainCallResult)
    } else {
      resetSharedMainCallResult()
    }

    const executor = new PipelineExecutor(defaultStepRegistry.getAll(), {
      onStepStart: (step: PipelineStep) => {
        options.onStepStart?.({ id: step.id, name: step.name })
      },
      onStepComplete: (step: PipelineStep) => {
        if (step.output) {
          options.onStepComplete?.({
            id: step.id,
            name: step.name,
            output: step.output as AIStepOutput,
          })
        }
      },
      onStepError: (step: PipelineStep, error: Error) => {
        options.onStepError?.({
          id: step.id,
          name: step.name,
          error: error.message,
        })
      },
    })

    // 从 checkpoint 恢复
    const resumeIndex = checkpoint.lastCompletedStepIndex + 1
    const previousOutputs = checkpoint.stepOutputs || {}

    // 准备恢复：设置 initialInput + initialPreviousOutputs + 标记已完成步骤
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

    const finalState = await executor.resumeFromStep(resumeIndex)

    const finalStep = finalState.steps.find((s) => s.id === 'step-final-output')
    const finalData = finalStep?.output?.data as { result?: AnalyzeResult } | undefined
    const result: AnalyzeResult = finalData?.result || {
      summary: { critical: 0, warning: 0, info: 0, total: 0 },
      risks: [],
      checklist: [],
      alignedVersion: '',
      extractedEntities: { dates: [], amounts: [], terms: [], promises: [] },
    }

    const steps = finalState.steps.map((step) => ({
      id: step.id,
      name: step.name,
      status: step.status,
      modelVersion: step.modelVersion,
      promptVersion: step.promptVersion,
      tokenPrompt: step.output?.tokenPrompt || 0,
      tokenCompletion: step.output?.tokenCompletion || 0,
      latencyMs: step.output?.latencyMs || 0,
    }))

    const totalTokens = steps.reduce((sum, s) => sum + s.tokenPrompt + s.tokenCompletion, 0)
    const totalLatencyMs = steps.reduce((sum, s) => sum + s.latencyMs, 0)

    const isMock = !process.env.AI_API_KEY && !options.aiConfig?.apiKey

    return {
      result,
      steps,
      totalTokens,
      totalLatencyMs,
      isMock,
    }
  }
}

export const analysisAdapter = new AnalysisAdapter()
