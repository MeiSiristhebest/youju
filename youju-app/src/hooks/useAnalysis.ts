import type { Source } from '../types'
import { useAnalysisCore } from './useAnalysisCore'
import { useAnalysisDimensions } from './useAnalysisDimensions'
import { useAnalysisRisk } from './useAnalysisRisk'
import { useAnalysisUI } from './useAnalysisUI'

export const useAnalysis = (sources: Source[]) => {
  const core = useAnalysisCore(sources)
  const dimensions = useAnalysisDimensions()
  const risk = useAnalysisRisk()
  const ui = useAnalysisUI()

  return {
    ...core,
    ...dimensions,
    ...risk,
    ...ui,
  }
}
