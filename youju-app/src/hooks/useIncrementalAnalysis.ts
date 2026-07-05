import { type IncrementalPrediction, incrementalEngine } from '../algorithms/incrementalEngine'
import type { AnalyzeResult, Source } from '../types'

export function useIncrementalAnalysis(sources: Source[], currentScenario: string | null) {
  const predictIncrementalChanges = (
    result: AnalyzeResult | null,
  ): IncrementalPrediction | null => {
    if (!result?.meta?.sourceIds) return null

    const oldSourceIds = result.meta.sourceIds as string[]
    const oldSources = sources.filter((s) => oldSourceIds.includes(s.id))
    const prediction = incrementalEngine.predictChanges(oldSources, sources, result)
    return prediction
  }

  const generateCacheKey = () => {
    return incrementalEngine.generateCacheKey(sources, currentScenario)
  }

  const getCachedResult = (cacheKey: string): AnalyzeResult | undefined => {
    return incrementalEngine.getCachedResult(cacheKey)
  }

  const cacheResults = (cacheKey: string, result: AnalyzeResult) => {
    incrementalEngine.cacheResults(cacheKey, result)
  }

  const checkIsIncremental = (
    previousResult: AnalyzeResult | null,
    forceFull: boolean,
  ): { isIncremental: boolean; oldSources: Source[] } => {
    if (forceFull || !previousResult) return { isIncremental: false, oldSources: [] }

    const oldSourceIds = previousResult.meta?.sourceIds as string[] | undefined
    if (!oldSourceIds) return { isIncremental: false, oldSources: [] }

    const sourceIds = sources.map((s) => s.id)
    const newIds = sourceIds.filter((id) => !oldSourceIds.includes(id))
    const isIncremental = newIds.length > 0 && newIds.length < sourceIds.length

    const oldSources = sources.filter((s) => oldSourceIds.includes(s.id))
    return { isIncremental, oldSources }
  }

  const mergeIncrementalResults = (
    previousResult: AnalyzeResult,
    newResult: AnalyzeResult,
    oldSources: Source[],
    startTime: number,
  ): AnalyzeResult => {
    const mergedResult = incrementalEngine.mergeResults(previousResult, newResult)
    const changes = incrementalEngine.compareRisks(previousResult, newResult)
    const prediction = incrementalEngine.predictChanges(oldSources, sources, previousResult)
    const accuracy = incrementalEngine.calculatePredictionAccuracy(prediction, changes)

    return {
      ...mergedResult,
      incrementalMeta: {
        ...mergedResult.incrementalMeta,
        durationMs: Date.now() - startTime,
        previousSourceCount: previousResult.meta?.sourceCount || 0,
        newSourceCount: sources.length,
        prediction: {
          estimatedNewRiskCount: prediction.estimatedNewRiskCount,
          estimatedUpdatedRiskCount: prediction.estimatedUpdatedRiskCount,
          estimatedAffectedDimensions: prediction.estimatedAffectedDimensions,
          accuracy,
        },
      },
    }
  }

  return {
    predictIncrementalChanges,
    generateCacheKey,
    getCachedResult,
    cacheResults,
    checkIsIncremental,
    mergeIncrementalResults,
  }
}
