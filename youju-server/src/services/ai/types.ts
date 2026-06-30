// ============================================================
// 有据 AI 服务 - 类型定义
// ============================================================

export type SourceType = 'chat' | 'doc' | 'web' | 'contract' | 'screenshot' | 'other'

export interface Source {
  id: string
  type: SourceType
  name: string
  content: string
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
  }
  preferences?: {
    riskWeights?: Record<string, number>
    draftStyle?: any
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
