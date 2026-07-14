import { useAnalysisStore } from '../stores'
import type { DimensionPriority } from '../types'

export const useAnalysisDimensions = () => {
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
  } = useAnalysisStore()

  return {
    dimensions,
    showAddDimensionDialog,
    setDimensions,
    toggleDimensionEnabled,
    updateDimensionWeight,
    moveDimension,
    addCustomDimension: (name: string, description: string, priority: DimensionPriority) =>
      addCustomDimension(name, description, priority),
    removeCustomDimension,
    resetDimensionWeights,
    setShowAddDimensionDialog,
  }
}
