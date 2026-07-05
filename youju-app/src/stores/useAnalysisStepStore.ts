import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AnalysisTaskStatus = 'idle' | 'analyzing' | 'completed' | 'failed' | 'cancelled'

export interface AnalysisLogEntry {
  id: string
  type: 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  details?: Record<string, unknown>
}

interface AnalysisStepState {
  analysisStep: number
  streaming: boolean
  streamProgress: number
  streamError: string | null
  failedSteps: Set<number>
  skippedSteps: Set<number>
  analysisLogs: AnalysisLogEntry[]
  lastErrorTimestamp: string | null

  setAnalysisStep: (step: number) => void
  setStreaming: (streaming: boolean) => void
  setStreamProgress: (progress: number) => void
  setStreamError: (error: string | null) => void

  markStepFailed: (stepIndex: number) => void
  markStepSkipped: (stepIndex: number) => void
  clearFailedSteps: () => void
  retryStep: (stepIndex: number) => void
  resetStepControl: () => void
  addAnalysisLog: (entry: Omit<AnalysisLogEntry, 'id' | 'timestamp'>) => void
  clearAnalysisLogs: () => void
  setLastErrorTimestamp: (timestamp: string | null) => void
}

export const useAnalysisStepStore = create<AnalysisStepState>()(
  persist(
    (set, _get) => ({
      analysisStep: 0,
      streaming: false,
      streamProgress: 0,
      streamError: null,
      failedSteps: new Set(),
      skippedSteps: new Set(),
      analysisLogs: [],
      lastErrorTimestamp: null,

      setAnalysisStep: (analysisStep) => set({ analysisStep }),
      setStreaming: (streaming) => set({ streaming }),
      setStreamProgress: (streamProgress) => set({ streamProgress }),
      setStreamError: (streamError) => set({ streamError }),

      markStepFailed: (stepIndex) => {
        set((state) => {
          const next = new Set(state.failedSteps)
          next.add(stepIndex)
          return {
            failedSteps: next,
            streamError: `步骤 ${stepIndex + 1} 执行失败，可重试或跳过`,
          }
        })
      },

      markStepSkipped: (stepIndex) => {
        set((state) => {
          const next = new Set(state.skippedSteps)
          next.add(stepIndex)
          const failedNext = new Set(state.failedSteps)
          failedNext.delete(stepIndex)
          return { skippedSteps: next, failedSteps: failedNext }
        })
      },

      clearFailedSteps: () => set({ failedSteps: new Set(), streamError: null }),

      retryStep: (stepIndex) => {
        set((state) => {
          const next = new Set(state.failedSteps)
          next.delete(stepIndex)
          return {
            failedSteps: next,
            analysisStep: stepIndex,
            streamProgress: (stepIndex / 7) * 100,
            streamError: null,
          }
        })
      },

      resetStepControl: () =>
        set({
          analysisStep: 0,
          streaming: false,
          streamProgress: 0,
          streamError: null,
          failedSteps: new Set(),
          skippedSteps: new Set(),
          analysisLogs: [],
          lastErrorTimestamp: null,
        }),

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
    }),
    {
      name: 'youju-analysis-step-store',
      version: 1,
      partialize: () => ({}),
    },
  ),
)
