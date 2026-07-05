import { useMutation, useQueryClient } from '@tanstack/react-query'
import { analysisApi } from '../services/analysisApi'
import { apiClient } from '../services/apiClient'
import { isDemoScenario, runDemoDraftStream } from '../services/demoAnalysisStream'
import { useSourceStore } from '../stores'
import { useAnalysisDimensionStore } from '../stores/useAnalysisDimensionStore'
import { useAnalysisResultStore } from '../stores/useAnalysisResultStore'
import { useAnalysisRiskStore } from '../stores/useAnalysisRiskStore'
import { useAnalysisStepStore } from '../stores/useAnalysisStepStore'
import { useAnalysisUIStore } from '../stores/useAnalysisUIStore'
import type { AnalyzeResult, ChecklistItem, Risk, Source } from '../types'
import {
  pendingRisks,
  riskStatusCounts,
  sortedRisks,
  totalUnresolved,
} from '../utils/riskSelectors'
import { useAnalysisCancellation } from './useAnalysisCancellation'
import { ANALYSIS_STEPS, runDemoAnalysis, streamAnalyze } from './useAnalysisStream'
import { useIncrementalAnalysis } from './useIncrementalAnalysis'

export const useAnalysis = (sources: Source[]) => {
  const { currentScenario } = useSourceStore()
  const _queryClient = useQueryClient()
  const useDemoMode = isDemoScenario(currentScenario)

  const resultStore = useAnalysisResultStore()
  const dimensionStore = useAnalysisDimensionStore()
  const riskStore = useAnalysisRiskStore()
  const stepStore = useAnalysisStepStore()
  const uiStore = useAnalysisUIStore()

  const {
    result,
    previousResult,
    checklist,
    incrementalPrediction,
    cacheHit,
    lastAnalysisDuration,
    showIncrementalBanner,
    forceFullAnalysis,
    analyzing,
    taskStatus,
    cancelled,
    setResult,
    setAnalyzing,
    setIncrementalPrediction,
    setCacheHit,
    setLastAnalysisDuration,
    setShowIncrementalBanner,
    setForceFullAnalysis,
    setPreviousResult,
    setChecklist,
    toggleCheckItem,
    setTaskStatus,
    setCancelled,
    resetAnalysis,
  } = resultStore

  const {
    dimensions,
    showAddDimensionDialog,
    setDimensions,
    toggleDimensionEnabled,
    updateDimensionWeight,
    moveDimension,
    addCustomDimension,
    removeCustomDimension,
    resetDimensionWeights,
    setShowAddDimensionDialog,
  } = dimensionStore

  const {
    highlightedRisk,
    highlightedEvidence,
    selectedRisk,
    riskFeedback,
    riskStatusFilter,
    riskStatuses,
    riskNotes,
    setHighlightedRisk,
    setHighlightedEvidence,
    setSelectedRisk,
    setRiskFeedback,
    setRiskStatusFilter,
    setRiskStatus,
    setRiskNotes,
    getRiskStatus,
    getRiskNotes,
  } = riskStore

  const {
    analysisStep,
    streaming,
    streamProgress,
    streamError,
    analysisLogs,
    lastErrorTimestamp,
    setAnalysisStep,
    setStreaming,
    setStreamProgress,
    setStreamError,
    resetStepControl,
    addAnalysisLog,
    clearAnalysisLogs,
    setLastErrorTimestamp,
  } = stepStore

  const {
    activeTab,
    showDraft,
    draftText,
    generatingDraft,
    showDebug,
    debugTab,
    setActiveTab,
    setShowDraft,
    setDraftText,
    setGeneratingDraft,
    setShowDebug,
    setDebugTab,
  } = uiStore

  const {
    predictIncrementalChanges: predictIncChanges,
    generateCacheKey,
    checkIsIncremental,
    mergeIncrementalResults,
  } = useIncrementalAnalysis(sources, currentScenario)

  const predictIncrementalChanges = () => predictIncChanges(result)

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
      const cachedResult = resultStore.getCache(cacheKey)

      if (cachedResult && !forceFull) {
        setCacheHit(true)
        setResult(cachedResult)
        setDimensions(cachedResult.dimensions || [])
        setChecklist(cachedResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
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
        setIncrementalPrediction(prediction)
      }

      const abortController = new AbortController()

      const streamCallbacks = {
        onStepStart: (_stepId: string, _stepName: string, stepIndex: number) => {
          setAnalysisStep(stepIndex + 1)
        },
        onStepComplete: (_stepId: string, _stepName: string, stepIndex: number) => {
          setAnalysisStep(stepIndex + 1)
        },
        onProgress: (progress: number, _message?: string) => {
          setStreamProgress(progress)
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

          resultStore.setCache(cacheKey, mergedResult)
          setResult(mergedResult)
          setDimensions(mergedResult.dimensions || [])
          setChecklist(mergedResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
          setLastAnalysisDuration(Date.now() - startTime)
          setForceFullAnalysis(false)
          setTaskStatus('completed')
          addAnalysisLog({ type: 'info', message: '增量分析完成' })
          params?.onSuccess?.(mergedResult)
          return mergedResult
        }

        resultStore.setCache(cacheKey, finalResult)
        setResult(finalResult)
        setDimensions(finalResult.dimensions || [])
        setChecklist(finalResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
        setAnalysisStep(ANALYSIS_STEPS.length)
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

  const generateDraftMutation = useMutation({
    mutationFn: async (risk: Risk) => {
      const sourceNames = (risk.evidence?.map((e) => e.sourceName) ||
        risk.sources ||
        []) as string[]

      if (useDemoMode) {
        const abortController = new AbortController()
        const finalText = await runDemoDraftStream(
          { id: risk.id, title: risk.title, description: risk.description },
          sourceNames,
          (text) => {
            setDraftText((prev) => prev + text)
          },
          { abortSignal: abortController.signal },
        )
        return { draft: finalText }
      }

      const finalText = await analysisApi.generateDraftStream({
        riskId: risk.id,
        riskTitle: risk.title,
        riskDescription: risk.description,
        sourceNames,
        onDelta: (text) => {
          setDraftText((prev) => prev + text)
        },
      })

      return { draft: finalText }
    },
    onMutate: (risk) => {
      setGeneratingDraft(true)
      setShowDraft(true)
      setDraftText('')
      setSelectedRisk(risk)
    },
    onSuccess: (data) => {
      setDraftText(data.draft)
    },
    onSettled: () => {
      setGeneratingDraft(false)
    },
  })

  const submitFeedbackMutation = useMutation({
    mutationFn: (params: { riskId: string; feedback: 'accurate' | 'inaccurate' }) =>
      analysisApi.submitRiskFeedback(params),
    onMutate: ({ riskId, feedback }) => {
      setRiskFeedback(riskId, feedback)
    },
  })

  const resumeAnalysisMutation = useMutation({
    mutationFn: async (analysisLogId: string): Promise<AnalyzeResult> => {
      if (sources.length === 0) throw new Error('No sources')

      setAnalyzing(true)
      setAnalysisStep(0)

      const sourceIds = sources.map((s) => s.id)
      const resumedResult = await apiClient.post<AnalyzeResult>('/api/analyze/resume', {
        analysisLogId,
        sourceIds,
      })

      setResult(resumedResult)
      setDimensions(resumedResult.dimensions || [])
      setChecklist(
        resumedResult.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
      )
      return resumedResult
    },
    onSettled: () => {
      setAnalyzing(false)
    },
  })

  const getLastFailedAnalysisLog = (): string | null => {
    return localStorage.getItem('youju_last_failed_analysis_log')
  }

  const clearFailedAnalysisLog = () => {
    localStorage.removeItem('youju_last_failed_analysis_log')
  }

  const sortedRisksList = sortedRisks(
    result?.risks,
    dimensions,
    riskStatuses,
    riskStatusFilter,
    getRiskStatus,
  )
  const riskStatusCountsMap = riskStatusCounts(result?.risks, getRiskStatus)
  const pendingRisksList = pendingRisks(result?.risks, dimensions, getRiskStatus)
  const totalUnresolvedCount = totalUnresolved(result?.risks, getRiskStatus)

  return {
    result,
    analyzing,
    analysisStep,
    activeTab,
    highlightedRisk,
    highlightedEvidence,
    checklist,
    selectedRisk,
    showDraft,
    draftText,
    generatingDraft,
    showDebug,
    debugTab,
    riskFeedback,
    streaming,
    streamProgress,
    streamError,
    incrementalPrediction,
    cacheHit,
    lastAnalysisDuration,
    showIncrementalBanner,
    forceFullAnalysis,
    previousResult,
    dimensions,
    sortedRisks: sortedRisksList,
    showAddDimensionDialog,
    riskStatusFilter,
    riskStatusCounts: riskStatusCountsMap,
    pendingRisks: pendingRisksList,
    totalUnresolved: totalUnresolvedCount,
    ANALYSIS_STEPS,
    useDemoMode,
    taskStatus,
    analysisLogs,
    lastErrorTimestamp,
    cancelled,
    analyze: analyzeMutation.mutate,
    analyzeFull: (params?: { onSuccess?: (result: AnalyzeResult) => void }) =>
      analyzeMutation.mutate({ ...params, forceFull: true }),
    isAnalyzing: analyzeMutation.isPending,
    cancelAnalysis,
    generateDraft: generateDraftMutation.mutate,
    isGeneratingDraft: generateDraftMutation.isPending,
    submitFeedback: submitFeedbackMutation.mutate,
    resetAnalysis,
    setActiveTab,
    setHighlightedRisk,
    setHighlightedEvidence,
    setChecklist,
    toggleCheckItem,
    setSelectedRisk,
    setShowDraft,
    setShowDebug,
    setDebugTab,
    setShowIncrementalBanner,
    setForceFullAnalysis,
    resumeAnalysis: resumeAnalysisMutation.mutate,
    isResuming: resumeAnalysisMutation.isPending,
    getLastFailedAnalysisLog,
    clearFailedAnalysisLog,
    predictIncrementalChanges,
    toggleDimensionEnabled,
    updateDimensionWeight,
    moveDimension,
    addCustomDimension,
    removeCustomDimension,
    resetDimensionWeights,
    setShowAddDimensionDialog,
    setRiskStatusFilter,
    setRiskStatus,
    setRiskNotes,
    getRiskStatus,
    getRiskNotes,
  }
}
