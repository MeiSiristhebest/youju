import { create } from 'zustand'

export interface AnalysisLogEntry {
  id: string
  type: 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  details?: Record<string, unknown>
}

interface AnalysisLogState {
  analysisLogs: AnalysisLogEntry[]
  lastErrorTimestamp: string | null

  addAnalysisLog: (entry: Omit<AnalysisLogEntry, 'id' | 'timestamp'>) => void
  clearAnalysisLogs: () => void
  setLastErrorTimestamp: (timestamp: string | null) => void

  resetLogState: () => void
}

export const useAnalysisLogStore = create<AnalysisLogState>()((set) => ({
  analysisLogs: [],
  lastErrorTimestamp: null,

  addAnalysisLog: (entry) => {
    const logEntry: AnalysisLogEntry = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      ...entry,
    }
    set((state) => ({
      analysisLogs: [...state.analysisLogs, logEntry].slice(-50),
    }))
    if (entry.type === 'error') {
      set({ lastErrorTimestamp: logEntry.timestamp })
    }
  },

  clearAnalysisLogs: () => set({ analysisLogs: [], lastErrorTimestamp: null }),
  setLastErrorTimestamp: (lastErrorTimestamp) => set({ lastErrorTimestamp }),

  resetLogState: () =>
    set({
      analysisLogs: [],
      lastErrorTimestamp: null,
    }),
}))
