import type { AnalyzeResult, Risk } from '../types'
import type { HistorySnapshot, RiskDiffItem, RiskDiffResult } from '../types/history'

const STORAGE_KEY = 'youju_history_snapshots'
const MAX_SNAPSHOTS = 20

export const historyStorage = {
  getSnapshots(): HistorySnapshot[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  },

  saveSnapshot(
    snapshot: Omit<HistorySnapshot, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  ): HistorySnapshot {
    const snapshots = this.getSnapshots()
    const newSnapshot: HistorySnapshot = {
      ...snapshot,
      id: snapshot.id || `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: snapshot.createdAt || new Date().toISOString(),
    }
    snapshots.unshift(newSnapshot)
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.length = MAX_SNAPSHOTS
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
    return newSnapshot
  },

  deleteSnapshot(id: string): void {
    const snapshots = this.getSnapshots().filter((s) => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
  },

  getSnapshot(id: string): HistorySnapshot | null {
    const snapshots = this.getSnapshots()
    return snapshots.find((s) => s.id === id) || null
  },

  clearSnapshots(): void {
    localStorage.removeItem(STORAGE_KEY)
  },
}

export function createSnapshotFromResult(params: {
  result: AnalyzeResult
  title: string
  scenarioType: string
  durationMs: number
  sourceCount: number
  sourceIds: string[]
}): Omit<HistorySnapshot, 'id' | 'createdAt'> {
  return {
    title: params.title,
    scenarioType: params.scenarioType,
    durationMs: params.durationMs,
    sourceCount: params.sourceCount,
    sourceIds: params.sourceIds,
    result: params.result,
  }
}

export function compareRisks(resultA: AnalyzeResult, resultB: AnalyzeResult): RiskDiffResult {
  const risksA = resultA.risks || []
  const risksB = resultB.risks || []

  const riskMapA = new Map(risksA.map((r) => [r.id, r]))
  const riskMapB = new Map(risksB.map((r) => [r.id, r]))

  const allIds = new Set([...riskMapA.keys(), ...riskMapB.keys()])

  const added: RiskDiffItem[] = []
  const removed: RiskDiffItem[] = []
  const modified: RiskDiffItem[] = []
  const unchanged: RiskDiffItem[] = []

  for (const id of allIds) {
    const riskA = riskMapA.get(id)
    const riskB = riskMapB.get(id)

    if (!riskA && riskB) {
      added.push({
        id,
        changeType: 'added',
        riskB,
      })
    } else if (riskA && !riskB) {
      removed.push({
        id,
        changeType: 'removed',
        riskA,
      })
    } else if (riskA && riskB) {
      const levelChanged = riskA.level !== riskB.level
      const confidenceChanged = (riskA.confidence ?? 0) !== (riskB.confidence ?? 0)
      const descriptionChanged = riskA.description !== riskB.description

      if (levelChanged || confidenceChanged || descriptionChanged) {
        modified.push({
          id,
          changeType: 'modified',
          riskA,
          riskB,
          levelChanged,
          oldLevel: riskA.level,
          newLevel: riskB.level,
          confidenceChanged,
          oldConfidence: riskA.confidence,
          newConfidence: riskB.confidence,
          descriptionChanged,
        })
      } else {
        unchanged.push({
          id,
          changeType: 'unchanged',
          riskA,
          riskB,
        })
      }
    }
  }

  return {
    added,
    removed,
    modified,
    unchanged,
    stats: {
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
      unchangedCount: unchanged.length,
      totalA: risksA.length,
      totalB: risksB.length,
    },
  }
}

export function getLevelOrder(level: string): number {
  switch (level) {
    case 'critical':
      return 3
    case 'warning':
      return 2
    case 'info':
      return 1
    default:
      return 0
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m${remainingSeconds}s`
}
