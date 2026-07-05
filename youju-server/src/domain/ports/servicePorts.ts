import type { AnalyzeResult, IncrementalChange, ScenarioKnowledge, Source } from '../types.js'

export interface IncrementalAnalysisOptions {
  userId?: number | null
  sessionId?: string | null
  analysisLogId?: string | null
}

export interface DiffAnalysisResult {
  change: IncrementalChange
  affectedSteps: string[]
  recomputedSteps: string[]
  reusedSteps: string[]
  result: AnalyzeResult
  durationMs: number
  isFullRecompute: boolean
}

export interface IncrementalAnalysisPort {
  performDiffBasedIncrementalAnalysis(
    existingResult: AnalyzeResult,
    existingSources: Source[],
    newSources: Source[],
    scenarioType: string,
    scenarioKnowledge: ScenarioKnowledge[],
    options?: IncrementalAnalysisOptions,
  ): Promise<DiffAnalysisResult>
}

export interface AnalysisCheckpointPort {
  resumeAnalysisFromCheckpoint(
    analysisLogId: string,
    sources: Source[],
    options?: {
      userId?: number | null
      sessionId?: string | null
      taskId?: string | null
    },
  ): Promise<AnalyzeResult>

  retryAnalysisStep(
    analysisLogId: string,
    stepIndex: number,
    sources: Source[],
    options?: {
      userId?: number | null
      sessionId?: string | null
    },
  ): Promise<{ success: boolean; stepStatus: string; checkpoint: unknown }>

  skipAnalysisStep(
    analysisLogId: string,
    stepIndex: number,
    options?: {
      userId?: number | null
      sessionId?: string | null
    },
  ): Promise<{ success: boolean; checkpoint: unknown }>

  getAnalysisCheckpoint(analysisLogId: string): Promise<unknown | null>
}
