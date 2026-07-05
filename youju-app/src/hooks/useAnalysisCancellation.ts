import { useRef } from 'react'
import type { IncrementalPrediction } from '../algorithms/incrementalEngine'
import { useAnalysisResultStore } from '../stores/useAnalysisResultStore'
import type { AnalysisTaskStatus } from '../stores/useAnalysisStepStore'
import { useAnalysisStepStore } from '../stores/useAnalysisStepStore'
import type { AnalyzeResult } from '../types'
import { useUndoableAction } from './useUndoableAction'

interface CanceledStateSnapshot {
  result: AnalyzeResult | null
  analysisStep: number
  streaming: boolean
  streamProgress: number
  streamError: string | null
  incrementalPrediction: IncrementalPrediction | null
  cacheHit: boolean
  showIncrementalBanner: boolean
  previousResult: AnalyzeResult | null
  taskStatus: AnalysisTaskStatus
  cancelled: boolean
  lastErrorTimestamp: string | null
}

export function useAnalysisCancellation(analyzing: boolean, resetMutation: () => void) {
  const canceledStateRef = useRef<CanceledStateSnapshot | null>(null)

  const resultStore = useAnalysisResultStore()
  const stepStore = useAnalysisStepStore()

  const {
    result,
    incrementalPrediction,
    cacheHit,
    showIncrementalBanner,
    previousResult,
    taskStatus,
    cancelled,
    setResult,
    setAnalyzing,
    setIncrementalPrediction,
    setCacheHit,
    setShowIncrementalBanner,
    setPreviousResult,
    setTaskStatus,
    setCancelled,
  } = resultStore

  const {
    analysisStep,
    streaming,
    streamProgress,
    streamError,
    lastErrorTimestamp,
    setAnalysisStep,
    setStreaming,
    setStreamProgress,
    setStreamError,
    setLastErrorTimestamp,
    addAnalysisLog,
  } = stepStore

  const saveStateSnapshot = () => {
    canceledStateRef.current = {
      result,
      analysisStep,
      streaming,
      streamProgress,
      streamError,
      incrementalPrediction,
      cacheHit,
      showIncrementalBanner,
      previousResult,
      taskStatus,
      cancelled,
      lastErrorTimestamp,
    }
  }

  const restoreStateSnapshot = () => {
    if (canceledStateRef.current) {
      setResult(canceledStateRef.current.result)
      setAnalysisStep(canceledStateRef.current.analysisStep)
      setStreaming(canceledStateRef.current.streaming)
      setStreamProgress(canceledStateRef.current.streamProgress)
      setStreamError(canceledStateRef.current.streamError)
      setIncrementalPrediction(canceledStateRef.current.incrementalPrediction)
      setCacheHit(canceledStateRef.current.cacheHit)
      setShowIncrementalBanner(canceledStateRef.current.showIncrementalBanner)
      setPreviousResult(canceledStateRef.current.previousResult)
      setTaskStatus(canceledStateRef.current.taskStatus)
      setCancelled(canceledStateRef.current.cancelled)
      setLastErrorTimestamp(canceledStateRef.current.lastErrorTimestamp)
      setAnalyzing(true)
      canceledStateRef.current = null
    }
  }

  const { execute: executeCancelAnalysis } = useUndoableAction<void>({
    action: () => {
      resetMutation()
      setAnalyzing(false)
      setStreaming(false)
      setStreamError(null)
      setCancelled(true)
      setTaskStatus('cancelled')
      addAnalysisLog({ type: 'warn', message: '用户取消分析' })
      canceledStateRef.current = null
    },
    undo: () => {
      restoreStateSnapshot()
    },
    message: '分析已取消，5秒内可撤销',
    undoLabel: '撤销',
    duration: 5,
  })

  const cancelAnalysis = () => {
    if (!analyzing) return

    saveStateSnapshot()
    setAnalyzing(false)
    setStreaming(false)
    executeCancelAnalysis()
  }

  return {
    canceledStateRef,
    cancelAnalysis,
    executeCancelAnalysis,
    saveStateSnapshot,
    restoreStateSnapshot,
  }
}
