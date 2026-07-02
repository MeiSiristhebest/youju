import { create } from 'zustand'
import type { IncrementalPrediction } from '../algorithms/incrementalEngine'
import type { AnalyzeResult, ChecklistItem, Risk } from '../types'

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
  activeTab: 'risks' | 'checklist' | 'aligned' | 'entities' | 'relations' | 'trace'
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

  setResult: (result: AnalyzeResult | null) => void
  setAnalyzing: (analyzing: boolean) => void
  setAnalysisStep: (step: number) => void
  setActiveTab: (
    tab: 'risks' | 'checklist' | 'aligned' | 'entities' | 'relations' | 'trace',
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
  getCache: (key: string) => AnalyzeResult | undefined
  setCache: (key: string, result: AnalyzeResult) => void
  clearCache: () => void
  resetAnalysis: () => void
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
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
    }),
}))
