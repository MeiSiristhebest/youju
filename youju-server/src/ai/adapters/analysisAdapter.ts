import type {
  AIAnalysisPort,
  AIStepOutput,
  AnalyzeResult,
  ScenarioKnowledge,
  Source,
} from '../../domain/types.js'
import type { AIConfig } from '../llm.js'
import { PipelineExecutor } from '../pipeline/executor.js'
import { stepCrossSourceExtraction } from '../pipeline/steps/step-cross-source-extraction.js'
import { stepDimensionDiscovery } from '../pipeline/steps/step-dimension-discovery.js'
import { stepDiscrepancyDetection } from '../pipeline/steps/step-discrepancy-detection.js'
import { stepFinalOutput } from '../pipeline/steps/step-final-output.js'
import { stepInputParsing } from '../pipeline/steps/step-input-parsing.js'
import {
  resetSharedMainCallResult,
  stepScenarioDiscovery,
} from '../pipeline/steps/step-scenario-discovery.js'
import { stepSelfCheck } from '../pipeline/steps/step-self-check.js'
import type {
  PipelineState,
  PipelineStep,
  PipelineStepDefinition,
  StepInput,
} from '../pipeline/types.js'

const STEP_DEFINITIONS: PipelineStepDefinition[] = [
  {
    id: 'step-scenario-discovery',
    name: '场景发现',
    maxRetries: 2,
    execute: stepScenarioDiscovery,
  },
  {
    id: 'step-input-parsing',
    name: '输入解析',
    maxRetries: 0,
    execute: stepInputParsing,
  },
  {
    id: 'step-dimension-discovery',
    name: '维度发现',
    maxRetries: 0,
    execute: stepDimensionDiscovery,
  },
  {
    id: 'step-cross-source-extraction',
    name: '跨源提取',
    maxRetries: 0,
    execute: stepCrossSourceExtraction,
  },
  {
    id: 'step-discrepancy-detection',
    name: '差异检测',
    maxRetries: 0,
    execute: stepDiscrepancyDetection,
  },
  {
    id: 'step-self-check',
    name: '自检',
    maxRetries: 1,
    execute: stepSelfCheck,
  },
  {
    id: 'step-final-output',
    name: '最终输出',
    maxRetries: 0,
    execute: stepFinalOutput,
  },
]

export class AnalysisAdapter implements AIAnalysisPort {
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
    },
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

    const executor = new PipelineExecutor(STEP_DEFINITIONS, {
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
    },
    options: {
      scenarioType?: string
      scenarioKnowledge?: ScenarioKnowledge[]
      aiConfig?: AIConfig
      onStepStart?: (step: { id: string; name: string }) => void
      onStepComplete?: (step: { id: string; name: string; output: AIStepOutput }) => void
      onStepError?: (step: { id: string; name: string; error: string }) => void
    },
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

    const executor = new PipelineExecutor(STEP_DEFINITIONS, {
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

    // 手动设置初始输入（resumeFromStep 需要 initialInput 已设置）
    const initialInput = {
      sources,
      scenarioType: options.scenarioType,
      scenarioKnowledge: options.scenarioKnowledge,
      aiConfig: options.aiConfig,
    }
    const exec = executor as unknown as {
      initialInput: Omit<StepInput, 'previousOutputs'> | null
      initialPreviousOutputs: Record<string, unknown>
      state: PipelineState
    }
    exec.initialInput = initialInput
    exec.initialPreviousOutputs = { ...previousOutputs }

    // 标记已完成的步骤
    const state = executor.getState()
    for (let i = 0; i <= checkpoint.lastCompletedStepIndex && i < state.steps.length; i++) {
      state.steps[i].status = 'completed'
    }
    exec.state = state

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
