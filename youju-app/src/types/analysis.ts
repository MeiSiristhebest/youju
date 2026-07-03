import type { RiskLevel } from './common'

export interface Evidence {
  sourceName: string
  sourceType: string
  sourceId: string
  quote: string
  highlightedText?: string
  confidence?: number
}

export type RiskStatus = 'pending' | 'processing' | 'resolved' | 'ignored'

export interface Risk {
  id: string
  level: RiskLevel
  type: string
  title: string
  description: string
  dimension?: string
  sources: string[]
  evidence?: Evidence[]
  confidence?: number
  isNew?: boolean
  levelChange?: {
    from: RiskLevel
    to: RiskLevel
    upgraded: boolean
  }
  status?: RiskStatus
  notes?: string
  notesUpdatedAt?: string
}

export interface ChecklistItem {
  id: string
  text: string
  hasDraft: boolean
  checked: boolean
  riskType?: string
  dimension?: string
}

export interface ReasoningStep {
  step?: string | number
  name?: string
  result?: string
  title?: string
  description?: string
  details?: string
  content?: string
  status?: 'completed' | 'current' | 'pending'
  durationMs?: number
  tokenUsage?: number
}

export interface ExtractedEntities {
  dates: { value: string; source: string }[]
  amounts: { value: string; source: string }[]
  terms: { value: string; source: string }[]
  promises: { value: string; source: string }[]
}

export interface RiskAssociation {
  sourceName: string
  sourceType: string
  riskIds: string[]
  riskCount: number
  isConflict: boolean
}

export interface ConflictPair {
  risk1Id: string
  risk2Id: string
  reason: string
}

export interface Conflict {
  riskId: string
  dimension: string
  conflictingSources: string[]
  values: { source: string; value: string }[]
  severity: number
}

export interface ValidationResult {
  riskId: string
  isValid: boolean
  evidenceCount: number
  missingSources: string[]
  conflicts: Conflict[]
  confidence: number
}

export interface RiskRelations {
  associations: RiskAssociation[]
  relatedRiskIds: { [riskId: string]: string[] }
  conflictPairs: ConflictPair[]
  validationResults?: ValidationResult[]
}

export interface AnalysisDimension {
  id: string
  name: string
  description?: string
  weight: number
  enabled: boolean
  riskCount: number
  isCustom: boolean
  order: number
}

export type DimensionPriority = 'high' | 'medium' | 'low'

export interface AnalyzeResult {
  summary: { critical: number; warning: number; info: number; total: number }
  risks: Risk[]
  checklist: ChecklistItem[]
  alignedVersion: string
  dimensions?: AnalysisDimension[]
  extractedEntities?: ExtractedEntities
  riskRelations?: RiskRelations
  reasoningTrace?: ReasoningStep[]
  uncertainties?: string[]
  scenario?: {
    type: string
    description: string
    keyDimensions: string[]
  }
  meta?: {
    durationMs: number
    isMock: boolean
    sourceCount: number
    sourceIds?: string[]
    isIncremental?: boolean
    newRiskCount?: number
    analysisLogId?: string
  }
  incrementalMeta?: IncrementalMeta
  debugInfo?: {
    model: string
    tokenPrompt: number
    tokenCompletion: number
    tokenTotal: number
    rawOutput: string
    systemPromptPreview: string
    userPromptPreview: string
    isMock?: boolean
  }
  preferences?: {
    riskWeights?: {
      dimensionWeights: Record<string, number>
      typeWeights: Record<string, number>
      totalChecks: number
      lastUpdated: string
    }
    draftStyle?: {
      formality: number
      friendliness: number
      conciseness: number
      directness: number
      totalCopies: number
      totalEdits: number
      lastUpdated: string
      preferredTone?: string
    }
  }
}

export interface IncrementalPrediction {
  isIncremental?: boolean
  estimatedNewRiskCount: number
  estimatedUpdatedRiskCount: number
  estimatedAffectedDimensions: number
  estimatedTimeSavingPercent?: number
  accuracy?: number
}

export interface IncrementalMeta {
  affectedSteps?: string[]
  recomputedSteps?: string[]
  reusedSteps?: string[]
  change?: {
    added: string[]
    removed: string[]
    modified: string[]
  }
  isIncremental?: boolean
  isFullRecompute?: boolean
  newRiskCount?: number
  updatedRiskCount?: number
  previousResultId?: string
  previousSourceCount?: number
  newSourceCount?: number
  durationMs?: number
  prediction?: IncrementalPrediction
}

export interface SharedReport {
  title: string
  scenarioType: string
  createdAt: string
  viewCount: number
  expiresAt: string | null
  result: AnalyzeResult
}

export interface SSEInitEvent {
  analysisLogId: string
  totalSteps: number
}

export interface SSEStepStartEvent {
  stepId: string
  stepName: string
  stepIndex: number
}

export interface SSEStepProgressEvent {
  stepId: string
  progress: number
  message: string
}

export interface SSEStepCompleteEvent {
  stepId: string
  stepName: string
  stepIndex: number
  partialResult?: unknown
}

export interface SSECompleteEvent {
  result: AnalyzeResult
}

export interface SSEErrorEvent {
  code: string | number
  message: string
  analysisLogId?: string
}

export type SSEPingEvent = {}

export type SSEvent =
  | { event: 'init'; data: SSEInitEvent }
  | { event: 'step_start'; data: SSEStepStartEvent }
  | { event: 'step_progress'; data: SSEStepProgressEvent }
  | { event: 'step_complete'; data: SSEStepCompleteEvent }
  | { event: 'complete'; data: SSECompleteEvent }
  | { event: 'error'; data: SSEErrorEvent }
  | { event: 'ping'; data: SSEPingEvent }

export type AsyncTaskStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface AsyncTaskStepInfo {
  stepId: string
  stepName: string
  stepIndex: number
  partialResult?: unknown
}

export interface AsyncTaskCurrentStep {
  stepId: string
  stepName: string
  stepIndex: number
}

export interface AsyncTaskStatusResponse {
  taskId: string
  status: AsyncTaskStatus
  currentStep: AsyncTaskCurrentStep | null
  completedSteps: AsyncTaskStepInfo[]
  partialResult?: unknown
  result?: AnalyzeResult
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface SubmitAsyncAnalysisResponse {
  taskId: string
  status: AsyncTaskStatus
}
