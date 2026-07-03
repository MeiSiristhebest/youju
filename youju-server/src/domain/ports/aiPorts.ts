import type { AIConfig } from '../../ai/llm.js'
import type { AnalyzeResult, Evidence, ScenarioKnowledge, Source } from '../types.js'

export interface AIStepInput {
  sources: Source[]
  scenarioType?: string
  scenarioKnowledge?: ScenarioKnowledge[]
  aiConfig?: AIConfig
  previousOutputs: Record<string, unknown>
}

export interface AIStepOutput {
  data: unknown
  modelVersion: string
  promptVersion: string
  tokenPrompt: number
  tokenCompletion: number
  latencyMs: number
  rawOutput?: string
  error?: string
}

export interface AIPipelineStep {
  id: string
  name: string
  execute: (
    input: AIStepInput,
    onProgress?: (update: Record<string, unknown>) => void,
  ) => Promise<AIStepOutput>
}

export interface AIAnalysisPort {
  analyze(
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
  }>

  resumeFromCheckpoint?(
    sources: Source[],
    checkpoint: {
      stepOutputs: Record<string, unknown>
      lastCompletedStepId: string
      lastCompletedStepIndex: number
    },
    options: {
      scenarioType?: string
      scenarioKnowledge?: ScenarioKnowledge[]
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
  }>
}

export interface AIDraftPort {
  generateDraft(
    risk: {
      title: string
      description: string
      evidence: Evidence[]
    },
    context?: string,
    stylePref?: {
      formality?: number
      friendliness?: number
      conciseness?: number
      preferredTone?: string
    },
  ): Promise<string>
}
