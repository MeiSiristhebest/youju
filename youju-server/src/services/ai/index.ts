// ============================================================
// 有据 AI 服务 - 入口
// ============================================================

export { analyzeSources, generateDraft } from './pipeline/analyzer'
export { mergeAnalyzeResults } from './utils/merge'

export type {
  Source,
  SourceType,
  Evidence,
  Risk,
  RiskType,
  RiskLevel,
  ExtractedEntity,
  RiskRelations,
  RiskAssociation,
  AnalyzeResult,
  ReasoningStep,
} from './types'
