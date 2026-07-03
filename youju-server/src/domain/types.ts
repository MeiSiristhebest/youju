export type SourceType = 'chat' | 'doc' | 'web' | 'contract' | 'screenshot' | 'other'
export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'zhipu'
  | 'moonshot'
  | 'qwen'
  | 'custom'

export interface ModelMapping {
  alias: string
  model: string
}

export interface UserModelConfig {
  id: string
  userId: string | null
  sessionId: string | null
  name: string
  provider: ModelProvider
  apiKey: string
  baseURL: string
  model: string
  modelMappings: ModelMapping[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Source {
  id: string
  type: SourceType
  name: string
  content: string
  meta?: string
}

export interface Evidence {
  sourceName: string
  sourceType: string
  quote: string
  confidence: number
}

export type RiskType = 'conflict' | 'promise' | 'missing' | 'info'
export type RiskLevel = 'critical' | 'warning' | 'info'

export interface Risk {
  id: string
  dimension: string
  type: RiskType
  level: RiskLevel
  title: string
  description: string
  sources: string[]
  evidence: Evidence[]
  confidence?: number
}

export interface ChecklistItem {
  id: string
  text: string
  hasDraft: boolean
  checked?: boolean
}

export interface ExtractedEntity {
  dimension: string
  value: string
  evidence: Evidence
}

export interface RiskAssociation {
  sourceName: string
  sourceType: string
  riskIds: string[]
  riskCount: number
  isConflict: boolean
}

export interface RiskRelations {
  associations: RiskAssociation[]
  relatedRiskIds: { [riskId: string]: string[] }
  conflictPairs: { risk1Id: string; risk2Id: string; reason: string }[]
}

export interface ReasoningStep {
  step: string | number
  title?: string
  description?: string
  details?: string
  result: string
  timestamp?: string
}

export interface AnalyzeResult {
  summary: {
    critical: number
    warning: number
    info: number
    total: number
  }
  scenario?: {
    type: string
    description: string
    keyDimensions: string[]
  }
  risks: Risk[]
  checklist: ChecklistItem[]
  alignedVersion: string
  extractedEntities: {
    dates: ExtractedEntity[]
    amounts: ExtractedEntity[]
    terms: ExtractedEntity[]
    promises: ExtractedEntity[]
  }
  riskRelations?: RiskRelations
  reasoningTrace?: ReasoningStep[]
  uncertainties?: string[]
  meta?: {
    durationMs?: number
    isMock?: boolean
    sourceCount?: number
    sourceIds?: string[]
    isIncremental?: boolean
    newRiskCount?: number
    /** 命中分析缓存时为 true */
    fromCache?: boolean
    /** 缓存写入时间（ISO 字符串） */
    cachedAt?: string
    /** 累计命中次数 */
    cacheHitCount?: number
  }
  preferences?: {
    riskWeights?: RiskWeightPreferences
    draftStyle?: DraftStylePreferences
  }
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
}

export interface AIRawOutput {
  task_type: string
  summary: string
  scenario?: {
    type: string
    description: string
    key_dimensions: string[]
  }
  extracted_entities: {
    dimension: string
    value: string
    evidence: {
      sourceName: string
      sourceType: string
      quote: string
      confidence: number
    }
  }[]
  risks: {
    dimension: string
    type: RiskType
    level: RiskLevel
    title: string
    description: string
    evidence: {
      sourceName: string
      sourceType: string
      quote: string
      confidence: number
    }[]
  }[]
  checklist: { text: string }[]
  aligned_version: string
  reasoning_trace: ReasoningStep[]
  uncertainties: string[]
}

export interface User {
  id: number
  openid: string
  nickname: string
  avatar: string
  createdAt: string
}

export interface Task {
  id: string
  userId: number | null
  sessionId: string | null
  title: string
  scenarioType?: string
  sourceIds: string[]
  result: unknown
  status?: string
  riskCount?: number
  createdAt: string
  updatedAt?: string
  sources?: Source[]
}

export interface Share {
  id: string
  taskId: string
  token: string
  title?: string
  snapshot?: unknown
  expiresAt: string | null
  viewCount: number
  createdAt: string
}

export interface AnalysisLog {
  id: string
  logGroupId: string
  version?: number
  taskId: string | null
  userId: number | null
  sessionId: string | null
  scenarioType: string
  sourceCount: number
  riskCount: number
  durationMs: number
  model?: string | null
  isMock: boolean
  status: 'success' | 'failed' | 'running'
  errorMessage?: string | null
  reasoningTrace?: unknown | null
  rawOutput?: string | null
  tokenPrompt: number
  tokenCompletion: number
  createdAt: string
}

export interface ScenarioKnowledge {
  dimension: string
  riskType: string
  frequency: number
  avgConfidence: number
}

export interface RiskWeightPreferences {
  dimensionWeights: Record<string, number>
  typeWeights: Record<string, number>
  totalChecks: number
  lastUpdated: string
}

export interface DraftStylePreferences {
  formality: number
  friendliness: number
  conciseness: number
  directness: number
  totalCopies: number
  totalEdits: number
  lastUpdated: string
  preferredTone?: string
}

export interface FeedbackStats {
  totalFeedbacks: number
  accurate: number
  inaccurate: number
  byRiskType: Record<string, { accurate: number; inaccurate: number }>
}

export interface ScenarioPreset {
  id: string
  name: string
  icon: string
  description: string
  sources: Array<{
    type: string
    name: string
    content: string
    meta?: string
  }>
}

export interface AnalysisStep extends Record<string, unknown> {
  id: string
  analysisLogId: string
  stepId: string
  name: string
  stepName?: string
  stepIndex?: number
  model?: string
  inputSnapshot?: unknown
  outputSnapshot?: unknown
  status: string
  retryCount: number
  maxRetries: number
  input: unknown
  output: unknown
  modelVersion: string | null
  promptVersion: string | null
  tokenPrompt: number | null
  tokenCompletion: number | null
  latencyMs: number | null
  error: string | null
  startedAt: string | null
  completedAt: string | null
}

export interface StepEvent extends Record<string, unknown> {
  id: string
  stepId: string
  analysisLogId?: string
  stepName?: string
  stepIndex?: number
  stepOrder?: number
  status?: string
  eventType: string
  data: unknown
  createdAt: string
}

export interface TaskResult {
  id: string
  taskId: string
  version: number
  result: unknown
  analysisLogId: string | null
  createdAt: string
}

export interface CostStats {
  totalTokenPrompt: number
  totalTokenCompletion: number
  totalCost: number
  totalRequests: number
  byModel: Record<
    string,
    { tokenPrompt: number; tokenCompletion: number; cost: number; count: number }
  >
  byDate: Record<string, { tokenPrompt: number; tokenCompletion: number; cost: number }>
}

export interface StepPerformanceStats {
  stepId: string
  stepName: string
  avgLatencyMs: number
  successRate: number
  totalRuns: number
  avgTokens: number
}

export interface AnalysisStats {
  totalAnalyses: number
  successCount: number
  failureCount: number
  avgDurationMs: number
  byScenario: Record<string, number>
  byDate: Record<string, number>
}

export type {
  AIAnalysisPort,
  AIDraftPort,
  AIPipelineStep,
  AIStepInput,
  AIStepOutput,
} from './ports/aiPorts.js'
