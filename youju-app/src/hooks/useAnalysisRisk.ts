import { useMutation } from '@tanstack/react-query'
import { analysisApi } from '../services/analysisApi'
import { useAnalysisStore } from '../stores'
import type { Risk, RiskType } from '../types'
import {
  pendingRisks,
  riskStatusCounts,
  sortedRisks,
  totalUnresolved,
} from '../utils/riskSelectors'

export const useAnalysisRisk = () => {
  const {
    result,
    dimensions,
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
  } = useAnalysisStore()

  const submitFeedbackMutation = useMutation({
    mutationFn: (params: { riskId: string; riskType: RiskType; isAccurate: boolean }) =>
      analysisApi.submitRiskFeedback(params),
    onMutate: ({ riskId, isAccurate }) => {
      setRiskFeedback(riskId, isAccurate ? 'accurate' : 'inaccurate')
    },
  })

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
    highlightedRisk,
    highlightedEvidence,
    selectedRisk,
    riskFeedback,
    riskStatusFilter,
    riskStatuses,
    riskNotes,
    sortedRisks: sortedRisksList,
    riskStatusCounts: riskStatusCountsMap,
    pendingRisks: pendingRisksList,
    totalUnresolved: totalUnresolvedCount,
    setHighlightedRisk,
    setHighlightedEvidence,
    setSelectedRisk,
    setRiskStatusFilter,
    setRiskStatus,
    setRiskNotes,
    getRiskStatus,
    getRiskNotes,
    submitFeedback: submitFeedbackMutation.mutate,
  }
}
