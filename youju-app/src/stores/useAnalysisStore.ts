import type { IncrementalPrediction } from '../algorithms/incrementalEngine'
import type {
  AnalysisDimension,
  AnalyzeResult,
  ChecklistItem,
  DimensionPriority,
  Risk,
  RiskStatus,
} from '../types'
import { type AnalysisLogEntry, useAnalysisLogStore } from './useAnalysisLogStore'
import { useAnalysisResultStore } from './useAnalysisResultStore'
import { type AnalysisTaskStatus, useAnalysisTaskStore } from './useAnalysisTaskStore'
import { useAnalysisUIStore } from './useAnalysisUIStore'
import { useDimensionStore } from './useDimensionStore'
import { useDraftStore } from './useDraftStore'
import { useRiskStore } from './useRiskStore'

export type { AnalysisLogEntry } from './useAnalysisLogStore'
export type { AnalysisTaskStatus } from './useAnalysisTaskStore'

export interface AnalysisState {
  result: AnalyzeResult | null
  previousResult: AnalyzeResult | null
  checklist: ChecklistItem[]
  incrementalPrediction: IncrementalPrediction | null
  cacheHit: boolean
  lastAnalysisDuration: number
  analysisCache: ReturnType<typeof useAnalysisResultStore.getState>['analysisCache']
  showIncrementalBanner: boolean
  forceFullAnalysis: boolean
  analyzing: boolean
  taskStatus: AnalysisTaskStatus
  cancelled: boolean

  analysisStep: number
  streaming: boolean
  streamProgress: number
  streamError: string | null
  failedSteps: Set<number>
  skippedSteps: Set<number>
  analysisLogs: AnalysisLogEntry[]
  lastErrorTimestamp: string | null

  activeTab:
    | 'overview'
    | 'risks'
    | 'checklist'
    | 'aligned'
    | 'entities'
    | 'relations'
    | 'trace'
    | 'dimensions'
    | 'chat'
  showDraft: boolean
  draftText: string
  generatingDraft: boolean
  showDebug: boolean
  debugTab: 'info' | 'stats'

  highlightedRisk: string | null
  highlightedEvidence: { sourceId: string; quote: string } | null
  selectedRisk: Risk | null
  riskFeedback: Record<string, 'accurate' | 'inaccurate'>
  riskStatusFilter: RiskStatus | 'all'
  riskStatuses: Record<string, RiskStatus>
  riskNotes: Record<string, { content: string; updatedAt: string }>
  riskEditHistory: Record<
    string,
    {
      originalDescription: string
      newDescription: string
      instruction: string
      timestamp: string
    }[]
  >
  aiEditorTargetRiskId: string | null

  dimensions: AnalysisDimension[]
  showAddDimensionDialog: boolean

  setResult: (result: AnalyzeResult | null) => void
  setAnalyzing: (analyzing: boolean) => void
  setAnalysisStep: (step: number) => void
  setActiveTab: (
    tab:
      | 'overview'
      | 'risks'
      | 'checklist'
      | 'aligned'
      | 'entities'
      | 'relations'
      | 'trace'
      | 'dimensions'
      | 'chat',
  ) => void
  setHighlightedRisk: (id: string | null) => void
  setHighlightedEvidence: (ev: { sourceId: string; quote: string } | null) => void
  setChecklist: (checklist: ChecklistItem[]) => void
  toggleCheckItem: (id: string) => void
  setShowDraft: (show: boolean) => void
  setDraftText: (text: string | ((prev: string) => string)) => void
  setGeneratingDraft: (generating: boolean) => void
  setSelectedRisk: (risk: Risk | null) => void
  setShowDebug: (show: boolean) => void
  setDebugTab: (tab: 'info' | 'stats') => void
  setRiskFeedback: (riskId: string, feedback: 'accurate' | 'inaccurate') => void
  setStreaming: (streaming: boolean) => void
  setStreamProgress: (progress: number) => void
  setStreamError: (error: string | null) => void
  setIncrementalPrediction: (prediction: IncrementalPrediction | null) => void
  setCacheHit: (hit: boolean) => void
  setLastAnalysisDuration: (duration: number) => void
  setShowIncrementalBanner: (show: boolean) => void
  setForceFullAnalysis: (force: boolean) => void
  setPreviousResult: (result: AnalyzeResult | null) => void
  getCache: (key: string) => AnalyzeResult | undefined
  setCache: (key: string, result: AnalyzeResult) => void
  clearCache: () => void
  resetAnalysis: () => void
  setDimensions: (dimensions: AnalysisDimension[]) => void
  toggleDimensionEnabled: (dimensionId: string) => void
  updateDimensionWeight: (dimensionId: string, weight: number) => void
  moveDimension: (dimensionId: string, direction: 'up' | 'down') => void
  addCustomDimension: (name: string, description: string, priority: DimensionPriority) => void
  removeCustomDimension: (dimensionId: string) => void
  resetDimensionWeights: () => void
  setShowAddDimensionDialog: (show: boolean) => void
  setRiskStatusFilter: (filter: RiskStatus | 'all') => void
  setRiskStatus: (riskId: string, status: RiskStatus) => void
  setRiskNotes: (riskId: string, notes: string) => void
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus
  getRiskNotes: (riskId: string) => { content: string; updatedAt: string } | null
  markStepFailed: (stepIndex: number) => void
  markStepSkipped: (stepIndex: number) => void
  clearFailedSteps: () => void
  retryStep: (stepIndex: number) => void
  resetStepControl: () => void
  setTaskStatus: (status: AnalysisTaskStatus) => void
  addAnalysisLog: (entry: Omit<AnalysisLogEntry, 'id' | 'timestamp'>) => void
  clearAnalysisLogs: () => void
  setLastErrorTimestamp: (timestamp: string | null) => void
  setCancelled: (cancelled: boolean) => void
  updateRiskDescription: (riskId: string, newDescription: string, instruction: string) => void
  updateRiskTitle: (riskId: string, newTitle: string) => void
  getRiskEditHistory: (riskId: string) => {
    originalDescription: string
    newDescription: string
    instruction: string
    timestamp: string
  }[]
  setAiEditorTargetRiskId: (riskId: string | null) => void
}

function buildMergedState(
  result: ReturnType<typeof useAnalysisResultStore.getState>,
  task: ReturnType<typeof useAnalysisTaskStore.getState>,
  log: ReturnType<typeof useAnalysisLogStore.getState>,
  ui: ReturnType<typeof useAnalysisUIStore.getState>,
  risk: ReturnType<typeof useRiskStore.getState>,
  dimension: ReturnType<typeof useDimensionStore.getState>,
  draft: ReturnType<typeof useDraftStore.getState>,
): AnalysisState {
  return {
    result: result.result,
    previousResult: result.previousResult,
    checklist: result.checklist,
    incrementalPrediction: task.incrementalPrediction,
    cacheHit: task.cacheHit,
    lastAnalysisDuration: task.lastAnalysisDuration,
    analysisCache: result.analysisCache,
    showIncrementalBanner: task.showIncrementalBanner,
    forceFullAnalysis: task.forceFullAnalysis,
    analyzing: task.analyzing,
    taskStatus: task.taskStatus,
    cancelled: task.cancelled,

    analysisStep: task.analysisStep,
    streaming: task.streaming,
    streamProgress: task.streamProgress,
    streamError: task.streamError,
    failedSteps: task.failedSteps,
    skippedSteps: task.skippedSteps,
    analysisLogs: log.analysisLogs,
    lastErrorTimestamp: log.lastErrorTimestamp,

    activeTab: ui.activeTab,
    showDraft: draft.showDraft,
    draftText: draft.draftText,
    generatingDraft: draft.generatingDraft,
    showDebug: ui.showDebug,
    debugTab: ui.debugTab,

    highlightedRisk: risk.highlightedRisk,
    highlightedEvidence: risk.highlightedEvidence,
    selectedRisk: risk.selectedRisk,
    riskFeedback: risk.riskFeedback,
    riskStatusFilter: risk.riskStatusFilter,
    riskStatuses: risk.riskStatuses,
    riskNotes: risk.riskNotes,
    riskEditHistory: risk.riskEditHistory,
    aiEditorTargetRiskId: risk.aiEditorTargetRiskId,

    dimensions: dimension.dimensions,
    showAddDimensionDialog: dimension.showAddDimensionDialog,

    setResult: result.setResult,
    setAnalyzing: task.setAnalyzing,
    setAnalysisStep: task.setAnalysisStep,
    setActiveTab: ui.setActiveTab,
    setHighlightedRisk: risk.setHighlightedRisk,
    setHighlightedEvidence: risk.setHighlightedEvidence,
    setChecklist: result.setChecklist,
    toggleCheckItem: result.toggleCheckItem,
    setShowDraft: draft.setShowDraft,
    setDraftText: draft.setDraftText,
    setGeneratingDraft: draft.setGeneratingDraft,
    setSelectedRisk: risk.setSelectedRisk,
    setShowDebug: ui.setShowDebug,
    setDebugTab: ui.setDebugTab,
    setRiskFeedback: risk.setRiskFeedback,
    setStreaming: task.setStreaming,
    setStreamProgress: task.setStreamProgress,
    setStreamError: task.setStreamError,
    setIncrementalPrediction: task.setIncrementalPrediction,
    setCacheHit: task.setCacheHit,
    setLastAnalysisDuration: task.setLastAnalysisDuration,
    setShowIncrementalBanner: task.setShowIncrementalBanner,
    setForceFullAnalysis: task.setForceFullAnalysis,
    setPreviousResult: result.setPreviousResult,
    getCache: result.getCache,
    setCache: result.setCache,
    clearCache: result.clearCache,
    resetAnalysis: () => {
      result.resetResultState()
      task.resetTaskState()
      log.resetLogState()
      risk.resetRiskState()
      dimension.resetDimensionState()
      draft.resetDraftState()
    },
    setDimensions: dimension.setDimensions,
    toggleDimensionEnabled: dimension.toggleDimensionEnabled,
    updateDimensionWeight: dimension.updateDimensionWeight,
    moveDimension: dimension.moveDimension,
    addCustomDimension: dimension.addCustomDimension,
    removeCustomDimension: dimension.removeCustomDimension,
    resetDimensionWeights: dimension.resetDimensionWeights,
    setShowAddDimensionDialog: dimension.setShowAddDimensionDialog,
    setRiskStatusFilter: risk.setRiskStatusFilter,
    setRiskStatus: risk.setRiskStatus,
    setRiskNotes: risk.setRiskNotes,
    getRiskStatus: risk.getRiskStatus,
    getRiskNotes: risk.getRiskNotes,
    markStepFailed: task.markStepFailed,
    markStepSkipped: task.markStepSkipped,
    clearFailedSteps: task.clearFailedSteps,
    retryStep: task.retryStep,
    resetStepControl: task.resetStepControl,
    setTaskStatus: task.setTaskStatus,
    addAnalysisLog: log.addAnalysisLog,
    clearAnalysisLogs: log.clearAnalysisLogs,
    setLastErrorTimestamp: log.setLastErrorTimestamp,
    setCancelled: task.setCancelled,
    updateRiskDescription: risk.updateRiskDescription,
    updateRiskTitle: risk.updateRiskTitle,
    getRiskEditHistory: risk.getRiskEditHistory,
    setAiEditorTargetRiskId: risk.setAiEditorTargetRiskId,
  }
}

type AnalysisStoreHook = {
  (): AnalysisState
  <T>(selector: (state: AnalysisState) => T): T
}

export const useAnalysisStore: AnalysisStoreHook & {
  getState: () => AnalysisState
  setState: (
    partial: Partial<AnalysisState> | ((state: AnalysisState) => Partial<AnalysisState>),
  ) => void
  subscribe: (listener: () => void) => () => void
} = Object.assign(
  ((selector?: (state: AnalysisState) => unknown) => {
    const result = useAnalysisResultStore()
    const task = useAnalysisTaskStore()
    const log = useAnalysisLogStore()
    const ui = useAnalysisUIStore()
    const risk = useRiskStore()
    const dimension = useDimensionStore()
    const draft = useDraftStore()

    const merged = buildMergedState(result, task, log, ui, risk, dimension, draft)
    return selector ? selector(merged) : merged
  }) as AnalysisStoreHook,
  {
    getState: () =>
      buildMergedState(
        useAnalysisResultStore.getState(),
        useAnalysisTaskStore.getState(),
        useAnalysisLogStore.getState(),
        useAnalysisUIStore.getState(),
        useRiskStore.getState(),
        useDimensionStore.getState(),
        useDraftStore.getState(),
      ),
    setState: (
      partial: Partial<AnalysisState> | ((state: AnalysisState) => Partial<AnalysisState>),
    ) => {
      const result = useAnalysisResultStore.getState()
      const task = useAnalysisTaskStore.getState()
      const log = useAnalysisLogStore.getState()
      const ui = useAnalysisUIStore.getState()
      const risk = useRiskStore.getState()
      const dimension = useDimensionStore.getState()
      const draft = useDraftStore.getState()

      const raw =
        typeof partial === 'function'
          ? partial(buildMergedState(result, task, log, ui, risk, dimension, draft))
          : partial
      const update = raw as AnalysisState

      if ('result' in update) result.setResult(update.result)
      if ('previousResult' in update) result.setPreviousResult(update.previousResult)
      if ('checklist' in update) result.setChecklist(update.checklist)
      if ('incrementalPrediction' in update)
        task.setIncrementalPrediction(update.incrementalPrediction)
      if ('cacheHit' in update) task.setCacheHit(update.cacheHit)
      if ('lastAnalysisDuration' in update)
        task.setLastAnalysisDuration(update.lastAnalysisDuration)
      if ('showIncrementalBanner' in update)
        task.setShowIncrementalBanner(update.showIncrementalBanner)
      if ('forceFullAnalysis' in update) task.setForceFullAnalysis(update.forceFullAnalysis)
      if ('analyzing' in update) task.setAnalyzing(update.analyzing)
      if ('taskStatus' in update) task.setTaskStatus(update.taskStatus)
      if ('cancelled' in update) task.setCancelled(update.cancelled)
      if ('analysisStep' in update) task.setAnalysisStep(update.analysisStep)
      if ('streaming' in update) task.setStreaming(update.streaming)
      if ('streamProgress' in update) task.setStreamProgress(update.streamProgress)
      if ('streamError' in update) task.setStreamError(update.streamError)
      if ('activeTab' in update) ui.setActiveTab(update.activeTab)
      if ('showDebug' in update) ui.setShowDebug(update.showDebug)
      if ('debugTab' in update) ui.setDebugTab(update.debugTab)
      if ('showDraft' in update) draft.setShowDraft(update.showDraft)
      if ('draftText' in update) draft.setDraftText(update.draftText)
      if ('generatingDraft' in update) draft.setGeneratingDraft(update.generatingDraft)
      if ('highlightedRisk' in update) risk.setHighlightedRisk(update.highlightedRisk)
      if ('highlightedEvidence' in update) risk.setHighlightedEvidence(update.highlightedEvidence)
      if ('selectedRisk' in update) risk.setSelectedRisk(update.selectedRisk)
      if ('riskFeedback' in update) {
        for (const [key, value] of Object.entries(update.riskFeedback)) {
          risk.setRiskFeedback(key, value)
        }
      }
      if ('riskStatusFilter' in update) risk.setRiskStatusFilter(update.riskStatusFilter)
      if ('riskStatuses' in update) {
        for (const [key, value] of Object.entries(update.riskStatuses)) {
          risk.setRiskStatus(key, value)
        }
      }
      if ('riskNotes' in update) {
        for (const [key, value] of Object.entries(update.riskNotes)) {
          risk.setRiskNotes(key, value.content)
        }
      }
      if ('aiEditorTargetRiskId' in update)
        risk.setAiEditorTargetRiskId(update.aiEditorTargetRiskId)
      if ('dimensions' in update) dimension.setDimensions(update.dimensions)
      if ('showAddDimensionDialog' in update)
        dimension.setShowAddDimensionDialog(update.showAddDimensionDialog)
    },
    subscribe: (listener: () => void) => {
      const unsubscribers = [
        useAnalysisResultStore.subscribe(listener),
        useAnalysisTaskStore.subscribe(listener),
        useAnalysisLogStore.subscribe(listener),
        useAnalysisUIStore.subscribe(listener),
        useRiskStore.subscribe(listener),
        useDimensionStore.subscribe(listener),
        useDraftStore.subscribe(listener),
      ]
      return () => unsubscribers.forEach((unsub) => unsub())
    },
  },
)
