import { create } from 'zustand'
import type { IncrementalPrediction } from '../algorithms/incrementalEngine'
import type { AnalyzeResult, ChecklistItem } from '../types'

export type AnalysisTaskStatus = 'idle' | 'analyzing' | 'completed' | 'failed' | 'cancelled'

interface AnalysisTaskState {
  analyzing: boolean
  taskStatus: AnalysisTaskStatus
  cancelled: boolean

  analysisStep: number
  streaming: boolean
  streamProgress: number
  streamError: string | null
  failedSteps: Set<number>
  skippedSteps: Set<number>

  incrementalPrediction: IncrementalPrediction | null
  cacheHit: boolean
  lastAnalysisDuration: number
  showIncrementalBanner: boolean
  forceFullAnalysis: boolean

  setAnalyzing: (analyzing: boolean) => void
  setTaskStatus: (status: AnalysisTaskStatus) => void
  setCancelled: (cancelled: boolean) => void

  setAnalysisStep: (step: number) => void
  setStreaming: (streaming: boolean) => void
  setStreamProgress: (progress: number) => void
  setStreamError: (error: string | null) => void
  markStepFailed: (stepIndex: number) => void
  markStepSkipped: (stepIndex: number) => void
  clearFailedSteps: () => void
  retryStep: (stepIndex: number) => void
  resetStepControl: () => void

  setIncrementalPrediction: (prediction: IncrementalPrediction | null) => void
  setCacheHit: (hit: boolean) => void
  setLastAnalysisDuration: (duration: number) => void
  setShowIncrementalBanner: (show: boolean) => void
  setForceFullAnalysis: (force: boolean) => void

  resetTaskState: () => void
}

export const useAnalysisTaskStore = create<AnalysisTaskState>()((set, get) => ({
  analyzing: false,
  taskStatus: 'idle',
  cancelled: false,

  analysisStep: 0,
  streaming: false,
  streamProgress: 0,
  streamError: null,
  failedSteps: new Set(),
  skippedSteps: new Set(),

  incrementalPrediction: null,
  cacheHit: false,
  lastAnalysisDuration: 0,
  showIncrementalBanner: true,
  forceFullAnalysis: false,

  setAnalyzing: (analyzing) => set({ analyzing }),
  setTaskStatus: (taskStatus) => set({ taskStatus }),
  setCancelled: (cancelled) => set({ cancelled }),

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
    }),

  setIncrementalPrediction: (incrementalPrediction) => set({ incrementalPrediction }),
  setCacheHit: (cacheHit) => set({ cacheHit }),
  setLastAnalysisDuration: (lastAnalysisDuration) => set({ lastAnalysisDuration }),
  setShowIncrementalBanner: (showIncrementalBanner) => set({ showIncrementalBanner }),
  setForceFullAnalysis: (forceFullAnalysis) => set({ forceFullAnalysis }),

  resetTaskState: () =>
    set({
      analyzing: false,
      taskStatus: 'idle',
      cancelled: false,
      analysisStep: 0,
      streaming: false,
      streamProgress: 0,
      streamError: null,
      failedSteps: new Set(),
      skippedSteps: new Set(),
      incrementalPrediction: null,
      cacheHit: false,
      lastAnalysisDuration: 0,
      showIncrementalBanner: true,
      forceFullAnalysis: false,
    }),
}))
