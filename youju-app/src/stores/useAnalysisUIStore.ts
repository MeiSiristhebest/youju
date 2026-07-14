import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AnalysisUIState {
  activeTab:
    | 'overview'
    | 'risks'
    | 'checklist'
    | 'aligned'
    | 'entities'
    | 'relations'
    | 'trace'
    | 'dimensions'
    | 'chat'
  showDebug: boolean
  debugTab: 'info' | 'stats'

  setActiveTab: (
    tab:
      | 'overview'
      | 'risks'
      | 'checklist'
      | 'aligned'
      | 'entities'
      | 'relations'
      | 'trace'
      | 'dimensions'
      | 'chat',
  ) => void
  setShowDebug: (show: boolean) => void
  setDebugTab: (tab: 'info' | 'stats') => void
}

export const useAnalysisUIStore = create<AnalysisUIState>()(
  persist(
    (set) => ({
      activeTab: 'overview',
      showDebug: false,
      debugTab: 'info',

      setActiveTab: (activeTab) => set({ activeTab }),
      setShowDebug: (showDebug) => set({ showDebug }),
      setDebugTab: (debugTab) => set({ debugTab }),
    }),
    {
      name: 'youju-analysis-ui-store',
      version: 1,
      partialize: (state) => ({
        activeTab: state.activeTab,
        showDebug: state.showDebug,
      }),
    },
  ),
)
