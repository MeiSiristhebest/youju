import { useMutation } from '@tanstack/react-query'
import { isDemoScenario, runDemoDraftStream } from '../services/demoAnalysisStream'
import { useAnalysisStore, useSourceStore } from '../stores'
import type { Risk } from '../types'

export const useAnalysisUI = () => {
  const { currentScenario } = useSourceStore()
  const useDemoMode = isDemoScenario(currentScenario)

  const {
    activeTab,
    showDraft,
    draftText,
    generatingDraft,
    showDebug,
    debugTab,
    analysisStep,
    streaming,
    streamProgress,
    streamError,
    incrementalPrediction,
    cacheHit,
    lastAnalysisDuration,
    showIncrementalBanner,
    previousResult,
    checklist,
    taskStatus,
    analysisLogs,
    lastErrorTimestamp,
    cancelled,
    setActiveTab,
    setShowDraft,
    setDraftText,
    setGeneratingDraft,
    setShowDebug,
    setDebugTab,
    setChecklist,
    toggleCheckItem,
  } = useAnalysisStore()

  const generateDraftMutation = useMutation({
    mutationFn: async (risk: Risk) => {
      if (useDemoMode) {
        const sourceNames = (risk.evidence?.map((e) => e.sourceName) ||
          risk.sources ||
          []) as string[]
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

      const analysisApi = await import('../services/analysisApi')
      const result = await analysisApi.analysisApi.generateDraft({ risk, context: '' })
      return result
    },
    onMutate: (risk) => {
      setGeneratingDraft(true)
      setShowDraft(true)
      setDraftText('')
      useAnalysisStore.getState().setSelectedRisk(risk)
    },
    onSuccess: (data) => {
      setDraftText(data.draft)
    },
    onSettled: () => {
      setGeneratingDraft(false)
    },
  })

  return {
    activeTab,
    showDraft,
    draftText,
    generatingDraft,
    showDebug,
    debugTab,
    analysisStep,
    streaming,
    streamProgress,
    streamError,
    incrementalPrediction,
    cacheHit,
    lastAnalysisDuration,
    showIncrementalBanner,
    previousResult,
    checklist,
    taskStatus,
    analysisLogs,
    lastErrorTimestamp,
    cancelled,
    setActiveTab,
    setShowDraft,
    setDraftText,
    setGeneratingDraft,
    setShowDebug,
    setDebugTab,
    setChecklist,
    toggleCheckItem,
    generateDraft: generateDraftMutation.mutate,
    isGeneratingDraft: generateDraftMutation.isPending,
  }
}
