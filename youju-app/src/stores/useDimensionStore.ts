import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnalysisDimension, DimensionPriority } from '../types'

interface DimensionState {
  dimensions: AnalysisDimension[]
  showAddDimensionDialog: boolean

  setDimensions: (dimensions: AnalysisDimension[]) => void
  toggleDimensionEnabled: (dimensionId: string) => void
  updateDimensionWeight: (dimensionId: string, weight: number) => void
  moveDimension: (dimensionId: string, direction: 'up' | 'down') => void
  addCustomDimension: (name: string, description: string, priority: DimensionPriority) => void
  removeCustomDimension: (dimensionId: string) => void
  resetDimensionWeights: () => void
  setShowAddDimensionDialog: (show: boolean) => void
  resetDimensionState: () => void
}

export const useDimensionStore = create<DimensionState>()(
  persist(
    (set, get) => ({
      dimensions: [],
      showAddDimensionDialog: false,

      setDimensions: (dimensions) => set({ dimensions }),

      toggleDimensionEnabled: (dimensionId) => {
        const { dimensions } = get()
        const newDimensions = dimensions.map((d) =>
          d.id === dimensionId ? { ...d, enabled: !d.enabled } : d,
        )
        set({ dimensions: newDimensions })
      },

      updateDimensionWeight: (dimensionId, weight) => {
        const { dimensions } = get()
        const newDimensions = dimensions.map((d) =>
          d.id === dimensionId ? { ...d, weight: Math.max(1, Math.min(5, weight)) } : d,
        )
        set({ dimensions: newDimensions })
      },

      moveDimension: (dimensionId, direction) => {
        const { dimensions } = get()
        const sorted = [...dimensions].sort((a, b) => a.order - b.order)
        const index = sorted.findIndex((d) => d.id === dimensionId)
        if (index === -1) return
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === sorted.length - 1) return

        const newIndex = direction === 'up' ? index - 1 : index + 1
        const temp = sorted[index]
        sorted[index] = sorted[newIndex]
        sorted[newIndex] = temp

        const newDimensions = sorted.map((d, i) => ({ ...d, order: i }))
        set({ dimensions: newDimensions })
      },

      addCustomDimension: (name, description, priority) => {
        const { dimensions } = get()
        const weightMap: Record<DimensionPriority, number> = { high: 5, medium: 3, low: 1 }
        const maxOrder = dimensions.length > 0 ? Math.max(...dimensions.map((d) => d.order)) : -1
        const newDimension: AnalysisDimension = {
          id: `custom_${Date.now()}`,
          name,
          description,
          weight: weightMap[priority],
          enabled: true,
          riskCount: 0,
          isCustom: true,
          order: maxOrder + 1,
        }
        set({ dimensions: [...dimensions, newDimension] })
      },

      removeCustomDimension: (dimensionId) => {
        const { dimensions } = get()
        const newDimensions = dimensions.filter((d) => d.id !== dimensionId)
        set({ dimensions: newDimensions })
      },

      resetDimensionWeights: () => {
        const { dimensions } = get()
        const nonCustomCount = dimensions.filter((d) => !d.isCustom).length
        const baseWeight =
          nonCustomCount > 0 ? Math.max(3, Math.round(5 - nonCustomCount * 0.5)) : 3
        const newDimensions = dimensions.map((d) => ({
          ...d,
          weight: d.isCustom ? (d.weight > 3 ? 3 : d.weight) : Math.max(2, baseWeight),
        }))
        set({ dimensions: newDimensions })
      },

      setShowAddDimensionDialog: (showAddDimensionDialog) => set({ showAddDimensionDialog }),

      resetDimensionState: () =>
        set({
          dimensions: [],
          showAddDimensionDialog: false,
        }),
    }),
    {
      name: 'youju-dimension-store',
      version: 1,
      partialize: (state) => ({
        dimensions: state.dimensions,
      }),
    },
  ),
)
