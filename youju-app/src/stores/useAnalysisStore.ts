import { create } from 'zustand'
import type { IncrementalPrediction } from '../algorithms/incrementalEngine'
import type {
  AnalysisDimension,
  AnalyzeResult,
  ChecklistItem,
  DimensionPriority,
  Risk,
  RiskStatus,
} from '../types'

const RISK_WORKFLOW_STORAGE_KEY = 'youju_risk_workflow'

interface RiskWorkflowState {
  statuses: Record<string, RiskStatus>
  notes: Record<string, { content: string; updatedAt: string }>
}

function loadRiskWorkflow(): RiskWorkflowState {
  try {
    const saved = localStorage.getItem(RISK_WORKFLOW_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load risk workflow state:', e)
  }
  return { statuses: {}, notes: {} }
}

function saveRiskWorkflow(state: RiskWorkflowState) {
  try {
    localStorage.setItem(RISK_WORKFLOW_STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save risk workflow state:', e)
  }
}

interface AnalysisCacheEntry {
  key: string
  result: AnalyzeResult
  timestamp: number
  sourceIds: string[]
}

interface AnalysisState {
  result: AnalyzeResult | null
  analyzing: boolean
  analysisStep: number
  activeTab: 'risks' | 'checklist' | 'aligned' | 'entities' | 'relations' | 'trace' | 'dimensions'
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
  analysisCache: AnalysisCacheEntry[]
  showIncrementalBanner: boolean
  forceFullAnalysis: boolean
  previousResult: AnalyzeResult | null
  dimensions: AnalysisDimension[]
  showAddDimensionDialog: boolean
  riskStatusFilter: RiskStatus | 'all'
  riskStatuses: Record<string, RiskStatus>
  riskNotes: Record<string, { content: string; updatedAt: string }>

  setResult: (result: AnalyzeResult | null) => void
  setAnalyzing: (analyzing: boolean) => void
  setAnalysisStep: (step: number) => void
  setActiveTab: (
    tab: 'risks' | 'checklist' | 'aligned' | 'entities' | 'relations' | 'trace' | 'dimensions',
  ) => void
  setHighlightedRisk: (id: string | null) => void
  setHighlightedEvidence: (ev: { sourceId: string; quote: string } | null) => void
  setChecklist: (checklist: ChecklistItem[]) => void
  toggleCheckItem: (id: string) => void
  setShowDraft: (show: boolean) => void
  setDraftText: (text: string) => void
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
}

export const useAnalysisStore = create<AnalysisState>((set, get) => {
  const initialWorkflow = loadRiskWorkflow()

  return {
    result: null,
    analyzing: false,
    analysisStep: 0,
    activeTab: 'risks',
    highlightedRisk: null,
    highlightedEvidence: null,
    checklist: [],
    showDraft: false,
    draftText: '',
    generatingDraft: false,
    selectedRisk: null,
    showDebug: false,
    debugTab: 'info',
    riskFeedback: {},
    streaming: false,
    streamProgress: 0,
    streamError: null,
    incrementalPrediction: null,
    cacheHit: false,
    lastAnalysisDuration: 0,
    analysisCache: [],
    showIncrementalBanner: true,
    forceFullAnalysis: false,
    previousResult: null,
    dimensions: [],
    showAddDimensionDialog: false,
    riskStatusFilter: 'all',
    riskStatuses: initialWorkflow.statuses,
    riskNotes: initialWorkflow.notes,

    setResult: (result) => set({ result }),
    setAnalyzing: (analyzing) => set({ analyzing }),
    setAnalysisStep: (analysisStep) => set({ analysisStep }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setHighlightedRisk: (highlightedRisk) => set({ highlightedRisk }),
    setHighlightedEvidence: (highlightedEvidence) => set({ highlightedEvidence }),
    setChecklist: (checklist) => set({ checklist }),
    toggleCheckItem: (id) => {
      const { checklist } = get()
      const newChecklist = checklist.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
      set({ checklist: newChecklist })
    },
    setShowDraft: (showDraft) => set({ showDraft }),
    setDraftText: (draftText) => set({ draftText }),
    setGeneratingDraft: (generatingDraft) => set({ generatingDraft }),
    setSelectedRisk: (selectedRisk) => set({ selectedRisk }),
    setShowDebug: (showDebug) => set({ showDebug }),
    setDebugTab: (debugTab) => set({ debugTab }),
    setRiskFeedback: (riskId, feedback) =>
      set((state) => ({
        riskFeedback: { ...state.riskFeedback, [riskId]: feedback },
      })),
    setStreaming: (streaming) => set({ streaming }),
    setStreamProgress: (streamProgress) => set({ streamProgress }),
    setStreamError: (streamError) => set({ streamError }),
    setIncrementalPrediction: (incrementalPrediction) => set({ incrementalPrediction }),
    setCacheHit: (cacheHit) => set({ cacheHit }),
    setLastAnalysisDuration: (lastAnalysisDuration) => set({ lastAnalysisDuration }),
    setShowIncrementalBanner: (showIncrementalBanner) => set({ showIncrementalBanner }),
    setForceFullAnalysis: (forceFullAnalysis) => set({ forceFullAnalysis }),
    setPreviousResult: (previousResult) => set({ previousResult }),
    getCache: (key) => {
      const { analysisCache } = get()
      const entry = analysisCache.find((c) => c.key === key)
      if (!entry) return undefined
      const now = Date.now()
      if (now - entry.timestamp > 30 * 60 * 1000) {
        set((state) => ({
          analysisCache: state.analysisCache.filter((c) => c.key !== key),
        }))
        return undefined
      }
      return entry.result
    },
    setCache: (key, result) => {
      const { analysisCache } = get()
      const sourceIds = (result.meta?.sourceIds as string[]) || []
      const newCache = analysisCache.filter((c) => c.key !== key)
      newCache.unshift({
        key,
        result,
        timestamp: Date.now(),
        sourceIds,
      })
      if (newCache.length > 10) {
        newCache.pop()
      }
      set({ analysisCache: newCache })
    },
    clearCache: () => set({ analysisCache: [] }),
    resetAnalysis: () =>
      set({
        result: null,
        analyzing: false,
        analysisStep: 0,
        checklist: [],
        selectedRisk: null,
        streaming: false,
        streamProgress: 0,
        streamError: null,
        incrementalPrediction: null,
        cacheHit: false,
        lastAnalysisDuration: 0,
        showIncrementalBanner: true,
        previousResult: null,
        dimensions: [],
      }),

    setDimensions: (dimensions) => set({ dimensions }),

    toggleDimensionEnabled: (dimensionId) => {
      const { dimensions } = get()
      const newDimensions = dimensions.map((d) =>
        d.id === dimensionId ? { ...d, enabled: !d.enabled } : d,
      )
      set({ dimensions: newDimensions })
    },

    updateDimensionWeight: (dimensionId, weight) => {
      const { dimensions } = get()
      const newDimensions = dimensions.map((d) =>
        d.id === dimensionId ? { ...d, weight: Math.max(1, Math.min(5, weight)) } : d,
      )
      set({ dimensions: newDimensions })
    },

    moveDimension: (dimensionId, direction) => {
      const { dimensions } = get()
      const sorted = [...dimensions].sort((a, b) => a.order - b.order)
      const index = sorted.findIndex((d) => d.id === dimensionId)
      if (index === -1) return
      if (direction === 'up' && index === 0) return
      if (direction === 'down' && index === sorted.length - 1) return

      const newIndex = direction === 'up' ? index - 1 : index + 1
      const temp = sorted[index]
      sorted[index] = sorted[newIndex]
      sorted[newIndex] = temp

      const newDimensions = sorted.map((d, i) => ({ ...d, order: i }))
      set({ dimensions: newDimensions })
    },

    addCustomDimension: (name, description, priority) => {
      const { dimensions } = get()
      const weightMap: Record<DimensionPriority, number> = { high: 5, medium: 3, low: 1 }
      const maxOrder = dimensions.length > 0 ? Math.max(...dimensions.map((d) => d.order)) : -1
      const newDimension: AnalysisDimension = {
        id: `custom_${Date.now()}`,
        name,
        description,
        weight: weightMap[priority],
        enabled: true,
        riskCount: 0,
        isCustom: true,
        order: maxOrder + 1,
      }
      set({ dimensions: [...dimensions, newDimension] })
    },

    removeCustomDimension: (dimensionId) => {
      const { dimensions } = get()
      const newDimensions = dimensions.filter((d) => d.id !== dimensionId)
      set({ dimensions: newDimensions })
    },

    resetDimensionWeights: () => {
      const { dimensions } = get()
      const nonCustomCount = dimensions.filter((d) => !d.isCustom).length
      const baseWeight = nonCustomCount > 0 ? Math.max(3, Math.round(5 - nonCustomCount * 0.5)) : 3
      const newDimensions = dimensions.map((d) => ({
        ...d,
        weight: d.isCustom ? (d.weight > 3 ? 3 : d.weight) : Math.max(2, baseWeight),
      }))
      set({ dimensions: newDimensions })
    },

    setShowAddDimensionDialog: (show) => set({ showAddDimensionDialog: show }),

    setRiskStatusFilter: (filter) => set({ riskStatusFilter: filter }),

    setRiskStatus: (riskId, status) => {
      const { riskStatuses } = get()
      const newStatuses = { ...riskStatuses, [riskId]: status }
      set({ riskStatuses: newStatuses })
      saveRiskWorkflow({ statuses: newStatuses, notes: get().riskNotes })
    },

    setRiskNotes: (riskId, notes) => {
      const { riskNotes } = get()
      const newNotes = {
        ...riskNotes,
        [riskId]: { content: notes, updatedAt: new Date().toISOString() },
      }
      set({ riskNotes: newNotes })
      saveRiskWorkflow({ statuses: get().riskStatuses, notes: newNotes })
    },

    getRiskStatus: (riskId, defaultStatus = 'pending') => {
      const { riskStatuses, result } = get()
      if (riskStatuses[riskId]) {
        return riskStatuses[riskId]
      }
      const risk = result?.risks.find((r) => r.id === riskId)
      if (risk?.status) {
        return risk.status
      }
      return defaultStatus
    },

    getRiskNotes: (riskId) => {
      const { riskNotes, result } = get()
      if (riskNotes[riskId]) {
        return riskNotes[riskId]
      }
      const risk = result?.risks.find((r) => r.id === riskId)
      if (risk?.notes && risk?.notesUpdatedAt) {
        return { content: risk.notes, updatedAt: risk.notesUpdatedAt }
      }
      return null
    },
  }
})
