import { useMutation } from '@tanstack/react-query'
import { storage, storageKeys } from '../lib/storage'
import { analysisApi } from '../services/analysisApi'
import { apiClient } from '../services/apiClient'
import { isDemoScenario } from '../services/demoAnalysisStream'
import { useAnalysisStore, useSourceStore } from '../stores'
import { useModelConfigStore } from '../stores/useModelConfigStore'
import type { AnalyzeResult, ChecklistItem, Source } from '../types'
import { useAnalysisCancellation } from './useAnalysisCancellation'
import { ANALYSIS_STEPS, runDemoAnalysis, streamAnalyze } from './useAnalysisStream'
import { useIncrementalAnalysis } from './useIncrementalAnalysis'

export const useAnalysisCore = (sources: Source[]) => {
  const { currentScenario } = useSourceStore()
  const useDemoMode = isDemoScenario(currentScenario)

  const {
    result,
    analyzing,
    forceFullAnalysis,
    setAnalyzing,
    setAnalysisStep,
    setIncrementalPrediction,
    setCacheHit,
    setShowIncrementalBanner,
    setForceFullAnalysis,
    setPreviousResult,
    setChecklist,
    setTaskStatus,
    setCancelled,
    resetAnalysis,
    resetStepControl,
    addAnalysisLog,
    clearAnalysisLogs,
    setResult,
    setDimensions,
    setActiveTab,
    setLastAnalysisDuration,
    setStreamError,
    setStreaming,
    getCache,
    setCache,
  } = useAnalysisStore()

  const {
    predictIncrementalChanges: predictIncChanges,
    generateCacheKey,
    checkIsIncremental,
    mergeIncrementalResults,
  } = useIncrementalAnalysis(sources, currentScenario)

  const analyzeMutation = useMutation({
    mutationFn: async (params?: {
      onSuccess?: (result: AnalyzeResult) => void
      forceFull?: boolean
    }): Promise<AnalyzeResult> => {
      if (sources.length === 0) throw new Error('No sources')

      const startTime = Date.now()
      const forceFull = params?.forceFull || forceFullAnalysis

      setAnalyzing(true)
      setAnalysisStep(0)
      setIncrementalPrediction(null)
      setCacheHit(false)
      setShowIncrementalBanner(true)
      setStreamError(null)
      resetStepControl()
      setTaskStatus('analyzing')
      setCancelled(false)
      clearAnalysisLogs()
      addAnalysisLog({ type: 'info', message: '开始分析任务' })

      const previousResultSnapshot = result
      if (result) {
        setPreviousResult(result)
      }

      const cacheKey = generateCacheKey()
      const cachedResult = getCache(cacheKey)

      if (cachedResult && !forceFull) {
        setCacheHit(true)
        setResult(cachedResult)
        setDimensions(cachedResult.dimensions || [])
        setChecklist(cachedResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
        setActiveTab('overview')
        setAnalyzing(false)
        setLastAnalysisDuration(Date.now() - startTime)
        setTaskStatus('completed')
        addAnalysisLog({ type: 'info', message: '分析完成（缓存命中）' })
        params?.onSuccess?.(cachedResult)
        return cachedResult
      }

      const { isIncremental, oldSources } = checkIsIncremental(previousResultSnapshot, forceFull)

      if (isIncremental && previousResultSnapshot) {
        const prediction = predictIncChanges(previousResultSnapshot)
        useAnalysisStore.getState().setIncrementalPrediction(prediction)
      }

      const abortController = new AbortController()

      const streamCallbacks = {
        onStepStart: (_stepId: string, _stepName: string, stepIndex: number) => {
          setAnalysisStep(stepIndex + 1)
        },
        onStepComplete: (_stepId: string, _stepName: string, stepIndex: number) => {
          setAnalysisStep(stepIndex + 1)
        },
        onStepError: (stepId: string, stepName: string, stepIndex: number, error: string) => {
          addAnalysisLog({
            type: 'error',
            message: `${stepName} 失败: ${error}`,
            details: { stepId, stepIndex },
          })
        },
        onProgress: (progress: number, _message?: string) => {
          useAnalysisStore.getState().setStreamProgress(progress)
        },
      }

      try {
        const finalResult = useDemoMode
          ? await runDemoAnalysis(sources, currentScenario!, streamCallbacks, {
              abortController,
              isIncremental,
              previousResult: previousResultSnapshot,
              setStreaming,
            })
          : await streamAnalyze({
              sourceIds: sources.map((s) => s.id),
              scenarioType: currentScenario,
              ...streamCallbacks,
              abortController,
              isIncremental,
              existingResult: result,
              setStreaming,
              setStreamError,
              setResult,
            })

        if (isIncremental && previousResultSnapshot) {
          const mergedResult = mergeIncrementalResults(
            previousResultSnapshot,
            finalResult,
            oldSources,
            startTime,
          )

          setCache(cacheKey, mergedResult)
          setResult(mergedResult)
          setDimensions(mergedResult.dimensions || [])
          setChecklist(mergedResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
          setActiveTab('overview')
          setLastAnalysisDuration(Date.now() - startTime)
          setForceFullAnalysis(false)
          setTaskStatus('completed')
          addAnalysisLog({ type: 'info', message: '增量分析完成' })
          params?.onSuccess?.(mergedResult)
          return mergedResult
        }

        setCache(cacheKey, finalResult)
        setResult(finalResult)
        setDimensions(finalResult.dimensions || [])
        setChecklist(finalResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
        setAnalysisStep(ANALYSIS_STEPS.length)
        setActiveTab('overview')
        setLastAnalysisDuration(Date.now() - startTime)
        setForceFullAnalysis(false)
        setTaskStatus('completed')
        addAnalysisLog({ type: 'info', message: '分析完成' })
        params?.onSuccess?.(finalResult)
        return finalResult
      } catch (error) {
        const err = error as Error
        if (err.message === '分析已取消') {
          setTaskStatus('cancelled')
          addAnalysisLog({ type: 'warn', message: '分析已取消' })
        } else {
          setTaskStatus('failed')
          addAnalysisLog({
            type: 'error',
            message: err.message || '分析失败',
            details: { stack: err.stack },
          })
        }
        throw error
      } finally {
        setAnalyzing(false)
        abortController.abort()
      }
    },
  })

  const { cancelAnalysis } = useAnalysisCancellation(analyzing, () => {
    analyzeMutation.reset()
  })

  const resumeAnalysisMutation = useMutation({
    mutationFn: async (analysisLogId: string): Promise<AnalyzeResult> => {
      if (sources.length === 0) throw new Error('No sources')

      setAnalyzing(true)
      setAnalysisStep(0)

      const sourceIds = sources.map((s) => s.id)
      const aiConfig = useModelConfigStore.getState().getAIConfig()
      const isDemo = sourceIds.every((id) => id.startsWith('demo_'))
      const resumedResult = await apiClient.post<AnalyzeResult>('/api/analyze/resume', {
        analysisLogId,
        sourceIds,
        aiConfig,
        isDemo,
      })

      setResult(resumedResult)
      setDimensions(resumedResult.dimensions || [])
      setChecklist(
        resumedResult.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
      )
      setActiveTab('overview')
      return resumedResult
    },
    onSettled: () => {
      setAnalyzing(false)
    },
  })

  const getLastFailedAnalysisLog = (): string | null => {
    return storage.getItem(storageKeys.lastFailedAnalysisLog)
  }

  const clearFailedAnalysisLog = () => {
    storage.removeItem(storageKeys.lastFailedAnalysisLog)
  }

  const predictIncrementalChanges = () => predictIncChanges(result)

  return {
    result,
    analyzing,
    isAnalyzing: analyzeMutation.isPending,
    analyze: analyzeMutation.mutate,
    analyzeFull: (params?: { onSuccess?: (result: AnalyzeResult) => void }) =>
      analyzeMutation.mutate({ ...params, forceFull: true }),
    cancelAnalysis,
    resetAnalysis,
    resumeAnalysis: resumeAnalysisMutation.mutate,
    isResuming: resumeAnalysisMutation.isPending,
    getLastFailedAnalysisLog,
    clearFailedAnalysisLog,
    predictIncrementalChanges,
    setShowIncrementalBanner,
    setForceFullAnalysis,
    ANALYSIS_STEPS,
    useDemoMode,
  }
}
