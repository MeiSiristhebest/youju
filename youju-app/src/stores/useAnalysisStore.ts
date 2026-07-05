import { useSyncExternalStore } from 'react'
import type { IncrementalPrediction } from '../algorithms/incrementalEngine'
import type {
  AnalysisDimension,
  AnalyzeResult,
  ChecklistItem,
  DimensionPriority,
  Risk,
  RiskStatus,
} from '../types'
import { useAnalysisDimensionStore } from './useAnalysisDimensionStore'
import { useAnalysisResultStore } from './useAnalysisResultStore'
import { useAnalysisRiskStore } from './useAnalysisRiskStore'
import type { AnalysisLogEntry, AnalysisTaskStatus } from './useAnalysisStepStore'
import { useAnalysisStepStore } from './useAnalysisStepStore'
import { useAnalysisUIStore } from './useAnalysisUIStore'

export type { AnalysisLogEntry, AnalysisTaskStatus }

export interface AnalysisState {
  result: AnalyzeResult | null
  analyzing: boolean
  analysisStep: number
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
  highlightedRisk: string | null
  highlightedEvidence: { sourceId: string; quote: string } | null
  checklist: ChecklistItem[]
  showDraft: boolean
  draftText: string
  generatingDraft: boolean
  selectedRisk: Risk | null
  showDebug: boolean
  debugTab: 'info' | 'stats'
  riskFeedback: Record<string, 'accurate' | 'inaccurate'>
  streaming: boolean
  streamProgress: number
  streamError: string | null
  incrementalPrediction: IncrementalPrediction | null
  cacheHit: boolean
  lastAnalysisDuration: number
  showIncrementalBanner: boolean
  forceFullAnalysis: boolean
  previousResult: AnalyzeResult | null
  dimensions: AnalysisDimension[]
  showAddDimensionDialog: boolean
  riskStatusFilter: RiskStatus | 'all'
  riskStatuses: Record<string, RiskStatus>
  riskNotes: Record<string, { content: string; updatedAt: string }>
  failedSteps: Set<number>
  skippedSteps: Set<number>
  taskStatus: AnalysisTaskStatus
  analysisLogs: AnalysisLogEntry[]
  lastErrorTimestamp: string | null
  cancelled: boolean
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
  getRiskEditHistory: (riskId: string) => {
    originalDescription: string
    newDescription: string
    instruction: string
    timestamp: string
  }[]
  setAiEditorTargetRiskId: (riskId: string | null) => void
}

function getAnalysisState(): AnalysisState {
  const resultState = useAnalysisResultStore.getState()
  const dimensionState = useAnalysisDimensionStore.getState()
  const riskState = useAnalysisRiskStore.getState()
  const stepState = useAnalysisStepStore.getState()
  const uiState = useAnalysisUIStore.getState()

  return {
    result: resultState.result,
    analyzing: resultState.analyzing,
    analysisStep: stepState.analysisStep,
    activeTab: uiState.activeTab,
    highlightedRisk: riskState.highlightedRisk,
    highlightedEvidence: riskState.highlightedEvidence,
    checklist: resultState.checklist,
    showDraft: uiState.showDraft,
    draftText: uiState.draftText,
    generatingDraft: uiState.generatingDraft,
    selectedRisk: riskState.selectedRisk,
    showDebug: uiState.showDebug,
    debugTab: uiState.debugTab,
    riskFeedback: riskState.riskFeedback,
    streaming: stepState.streaming,
    streamProgress: stepState.streamProgress,
    streamError: stepState.streamError,
    incrementalPrediction: resultState.incrementalPrediction,
    cacheHit: resultState.cacheHit,
    lastAnalysisDuration: resultState.lastAnalysisDuration,
    showIncrementalBanner: resultState.showIncrementalBanner,
    forceFullAnalysis: resultState.forceFullAnalysis,
    previousResult: resultState.previousResult,
    dimensions: dimensionState.dimensions,
    showAddDimensionDialog: dimensionState.showAddDimensionDialog,
    riskStatusFilter: riskState.riskStatusFilter,
    riskStatuses: riskState.riskStatuses,
    riskNotes: riskState.riskNotes,
    failedSteps: stepState.failedSteps,
    skippedSteps: stepState.skippedSteps,
    taskStatus: resultState.taskStatus,
    analysisLogs: stepState.analysisLogs,
    lastErrorTimestamp: stepState.lastErrorTimestamp,
    cancelled: resultState.cancelled,
    riskEditHistory: riskState.riskEditHistory,
    aiEditorTargetRiskId: riskState.aiEditorTargetRiskId,

    setResult: resultState.setResult,
    setAnalyzing: resultState.setAnalyzing,
    setAnalysisStep: stepState.setAnalysisStep,
    setActiveTab: uiState.setActiveTab,
    setHighlightedRisk: riskState.setHighlightedRisk,
    setHighlightedEvidence: riskState.setHighlightedEvidence,
    setChecklist: resultState.setChecklist,
    toggleCheckItem: resultState.toggleCheckItem,
    setShowDraft: uiState.setShowDraft,
    setDraftText: uiState.setDraftText,
    setGeneratingDraft: uiState.setGeneratingDraft,
    setSelectedRisk: riskState.setSelectedRisk,
    setShowDebug: uiState.setShowDebug,
    setDebugTab: uiState.setDebugTab,
    setRiskFeedback: riskState.setRiskFeedback,
    setStreaming: stepState.setStreaming,
    setStreamProgress: stepState.setStreamProgress,
    setStreamError: stepState.setStreamError,
    setIncrementalPrediction: resultState.setIncrementalPrediction,
    setCacheHit: resultState.setCacheHit,
    setLastAnalysisDuration: resultState.setLastAnalysisDuration,
    setShowIncrementalBanner: resultState.setShowIncrementalBanner,
    setForceFullAnalysis: resultState.setForceFullAnalysis,
    setPreviousResult: resultState.setPreviousResult,
    getCache: resultState.getCache,
    setCache: resultState.setCache,
    clearCache: resultState.clearCache,
    resetAnalysis: () => {
      resultState.resetAnalysis()
      stepState.resetStepControl()
    },
    setDimensions: dimensionState.setDimensions,
    toggleDimensionEnabled: dimensionState.toggleDimensionEnabled,
    updateDimensionWeight: dimensionState.updateDimensionWeight,
    moveDimension: dimensionState.moveDimension,
    addCustomDimension: dimensionState.addCustomDimension,
    removeCustomDimension: dimensionState.removeCustomDimension,
    resetDimensionWeights: dimensionState.resetDimensionWeights,
    setShowAddDimensionDialog: dimensionState.setShowAddDimensionDialog,
    setRiskStatusFilter: riskState.setRiskStatusFilter,
    setRiskStatus: riskState.setRiskStatus,
    setRiskNotes: riskState.setRiskNotes,
    getRiskStatus: riskState.getRiskStatus,
    getRiskNotes: riskState.getRiskNotes,
    markStepFailed: stepState.markStepFailed,
    markStepSkipped: stepState.markStepSkipped,
    clearFailedSteps: stepState.clearFailedSteps,
    retryStep: stepState.retryStep,
    resetStepControl: stepState.resetStepControl,
    setTaskStatus: resultState.setTaskStatus,
    addAnalysisLog: stepState.addAnalysisLog,
    clearAnalysisLogs: stepState.clearAnalysisLogs,
    setLastErrorTimestamp: stepState.setLastErrorTimestamp,
    setCancelled: resultState.setCancelled,
    updateRiskDescription: riskState.updateRiskDescription,
    getRiskEditHistory: riskState.getRiskEditHistory,
    setAiEditorTargetRiskId: riskState.setAiEditorTargetRiskId,
  }
}

function subscribe(listener: () => void): () => void {
  const unsubResult = useAnalysisResultStore.subscribe(listener)
  const unsubDimension = useAnalysisDimensionStore.subscribe(listener)
  const unsubRisk = useAnalysisRiskStore.subscribe(listener)
  const unsubStep = useAnalysisStepStore.subscribe(listener)
  const unsubUI = useAnalysisUIStore.subscribe(listener)
  return () => {
    unsubResult()
    unsubDimension()
    unsubRisk()
    unsubStep()
    unsubUI()
  }
}

function useAnalysisStore(): AnalysisState
function useAnalysisStore<T>(selector: (state: AnalysisState) => T): T
function useAnalysisStore<T>(selector?: (state: AnalysisState) => T): T | AnalysisState {
  const state = useSyncExternalStore(
    subscribe,
    () => (selector ? selector(getAnalysisState()) : getAnalysisState()),
    () => (selector ? selector(getAnalysisState()) : getAnalysisState()),
  )
  return state
}

useAnalysisStore.getState = getAnalysisState
useAnalysisStore.setState = () => {
  console.warn('useAnalysisStore.setState is not supported in facade mode')
}
useAnalysisStore.subscribe = subscribe

export { useAnalysisStore }
