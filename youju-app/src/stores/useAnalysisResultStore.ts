import { create } from 'zustand'
import type { AnalyzeResult, ChecklistItem } from '../types'

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
  analysisCache: AnalysisCacheEntry[]

  setResult: (result: AnalyzeResult | null) => void
  setPreviousResult: (result: AnalyzeResult | null) => void
  setChecklist: (checklist: ChecklistItem[]) => void
  toggleCheckItem: (id: string) => void
  getCache: (key: string) => AnalyzeResult | undefined
  setCache: (key: string, result: AnalyzeResult) => void
  clearCache: () => void

  resetResultState: () => void
}

export const useAnalysisResultStore = create<AnalysisResultState>()((set, get) => ({
  result: null,
  previousResult: null,
  checklist: [],
  analysisCache: [],

  setResult: (result) => set({ result }),
  setPreviousResult: (previousResult) => set({ previousResult }),
  setChecklist: (checklist) => set({ checklist }),

  toggleCheckItem: (id) => {
    const { checklist } = get()
    const newChecklist = checklist.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    set({ checklist: newChecklist })
  },

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

  resetResultState: () =>
    set({
      result: null,
      previousResult: null,
      checklist: [],
    }),
}))
