import type { AnalyzeResult, Risk } from './analysis'

export interface HistorySnapshot {
  id: string
  title: string
  scenarioType: string
  createdAt: string
  durationMs: number
  sourceCount: number
  sourceIds: string[]
  result: AnalyzeResult
}

export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface RiskDiffItem {
  id: string
  changeType: DiffChangeType
  riskA?: Risk
  riskB?: Risk
  levelChanged?: boolean
  oldLevel?: string
  newLevel?: string
  confidenceChanged?: boolean
  oldConfidence?: number
  newConfidence?: number
  descriptionChanged?: boolean
}

export interface RiskDiffResult {
  added: RiskDiffItem[]
  removed: RiskDiffItem[]
  modified: RiskDiffItem[]
  unchanged: RiskDiffItem[]
  stats: {
    addedCount: number
    removedCount: number
    modifiedCount: number
    unchangedCount: number
    totalA: number
    totalB: number
  }
}
