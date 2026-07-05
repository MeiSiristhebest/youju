import type { ValidatingAICaller } from '../../domain/ports/aiCallPort.js'
import type { ScenarioKnowledge, SharedMainCallResult, Source } from '../../domain/types.js'
import type { AIConfig } from '../llm.js'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying'

export type PipelineStatus =
  | 'idle'
  | 'running'
  | 'step_active'
  | 'retrying'
  | 'paused'
  | 'completed'
  | 'failed'

export interface StepInput {
  sources: Source[]
  scenarioType?: string
  scenarioKnowledge?: ScenarioKnowledge[]
  aiConfig?: AIConfig
  previousOutputs: Record<string, unknown>
  mainCallResult?: SharedMainCallResult | null
  aiCaller?: ValidatingAICaller
}

export interface StepOutput {
  data: unknown
  modelVersion: string
  promptVersion: string
  tokenPrompt: number
  tokenCompletion: number
  latencyMs: number
  rawOutput?: string
  error?: string
}

export interface PipelineStep {
  id: string
  name: string
  promptVersion: string
  modelVersion: string
  status: StepStatus
  retryCount: number
  maxRetries: number
  input: StepInput | null
  output: StepOutput | null
  startedAt: string | null
  completedAt: string | null
  error: string | null
}

export interface PipelineState {
  id: string
  status: PipelineStatus
  steps: PipelineStep[]
  currentStepIndex: number
  startedAt: string | null
  completedAt: string | null
  error: string | null
}

export type StepExecutor = (
  input: StepInput,
  onProgress?: (update: Partial<PipelineStep>) => void,
) => Promise<StepOutput>

export interface PipelineStepDefinition {
  id: string
  name: string
  maxRetries: number
  dependsOn?: string[]
  execute: StepExecutor
}

export interface PipelineCallbacks {
  onStepStart?: (step: PipelineStep) => void
  onStepComplete?: (step: PipelineStep) => void
  onStepError?: (step: PipelineStep, error: Error) => void
  onStepSkip?: (step: PipelineStep) => void
  onStepRetry?: (step: PipelineStep) => void
  onProgress?: (state: PipelineState) => void
  onPause?: (state: PipelineState) => void
  onResume?: (state: PipelineState) => void
  onComplete?: (state: PipelineState) => void
  onError?: (state: PipelineState, error: Error) => void
}

export interface PipelineCheckpoint {
  state: PipelineState
  initialInput: Omit<StepInput, 'previousOutputs'> | null
  initialPreviousOutputs: Record<string, unknown>
  createdAt: string
  /** 主调用结果，用于恢复时还原 sharedMainCallResult（伪流水线下游步骤依赖） */
  mainCallResult?: SharedMainCallResult
}
