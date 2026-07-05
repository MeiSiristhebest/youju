import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IncrementalPrediction } from '../algorithms/incrementalEngine'
import type { AnalyzeResult, ChecklistItem } from '../types'
import type { AnalysisTaskStatus } from './useAnalysisStepStore'

interface AnalysisCacheEntry {
  key: string
  result: AnalyzeResult
  timestamp: number
  sourceIds: string[]
}

interface AnalysisResultState {
  result: AnalyzeResult | null
  previousResult: AnalyzeResult | null
  checklist: ChecklistItem[]
  incrementalPrediction: IncrementalPrediction | null
  cacheHit: boolean
  lastAnalysisDuration: number
  analysisCache: AnalysisCacheEntry[]
  showIncrementalBanner: boolean
  forceFullAnalysis: boolean
  analyzing: boolean
  taskStatus: AnalysisTaskStatus
  cancelled: boolean

  setResult: (result: AnalyzeResult | null) => void
  setPreviousResult: (result: AnalyzeResult | null) => void
  setChecklist: (checklist: ChecklistItem[]) => void
  toggleCheckItem: (id: string) => void
  setIncrementalPrediction: (prediction: IncrementalPrediction | null) => void
  setCacheHit: (hit: boolean) => void
  setLastAnalysisDuration: (duration: number) => void
  setShowIncrementalBanner: (show: boolean) => void
  setForceFullAnalysis: (force: boolean) => void
  setAnalyzing: (analyzing: boolean) => void
  setTaskStatus: (status: AnalysisTaskStatus) => void
  setCancelled: (cancelled: boolean) => void

  getCache: (key: string) => AnalyzeResult | undefined
  setCache: (key: string, result: AnalyzeResult) => void
  clearCache: () => void

  resetAnalysis: () => void
}

export const useAnalysisResultStore = create<AnalysisResultState>()(
  persist(
    (set, get) => ({
      result: null,
      previousResult: null,
      checklist: [],
      incrementalPrediction: null,
      cacheHit: false,
      lastAnalysisDuration: 0,
      analysisCache: [],
      showIncrementalBanner: true,
      forceFullAnalysis: false,
      analyzing: false,
      taskStatus: 'idle',
      cancelled: false,

      setResult: (result) => set({ result }),
      setPreviousResult: (previousResult) => set({ previousResult }),
      setChecklist: (checklist) => set({ checklist }),
      toggleCheckItem: (id) => {
        const { checklist } = get()
        const newChecklist = checklist.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
        set({ checklist: newChecklist })
      },
      setIncrementalPrediction: (incrementalPrediction) => set({ incrementalPrediction }),
      setCacheHit: (cacheHit) => set({ cacheHit }),
      setLastAnalysisDuration: (lastAnalysisDuration) => set({ lastAnalysisDuration }),
      setShowIncrementalBanner: (showIncrementalBanner) => set({ showIncrementalBanner }),
      setForceFullAnalysis: (forceFullAnalysis) => set({ forceFullAnalysis }),
      setAnalyzing: (analyzing) => set({ analyzing }),
      setTaskStatus: (taskStatus) => set({ taskStatus }),
      setCancelled: (cancelled) => set({ cancelled }),

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
          previousResult: null,
          checklist: [],
          incrementalPrediction: null,
          cacheHit: false,
          lastAnalysisDuration: 0,
          showIncrementalBanner: true,
          forceFullAnalysis: false,
          analyzing: false,
          taskStatus: 'idle',
          cancelled: false,
        }),
    }),
    {
      name: 'youju-analysis-result-store',
      version: 1,
      partialize: () => ({}),
    },
  ),
)
