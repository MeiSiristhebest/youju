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
  showDraft: boolean
  draftText: string
  generatingDraft: boolean
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
  setShowDraft: (show: boolean) => void
  setDraftText: (text: string | ((prev: string) => string)) => void
  setGeneratingDraft: (generating: boolean) => void
  setShowDebug: (show: boolean) => void
  setDebugTab: (tab: 'info' | 'stats') => void
}

export const useAnalysisUIStore = create<AnalysisUIState>()(
  persist(
    (set) => ({
      activeTab: 'overview',
      showDraft: false,
      draftText: '',
      generatingDraft: false,
      showDebug: false,
      debugTab: 'info',

      setActiveTab: (activeTab) => set({ activeTab }),
      setShowDraft: (showDraft) => set({ showDraft }),
      setDraftText: (draftText) =>
        set((state) => ({
          draftText: typeof draftText === 'function' ? draftText(state.draftText) : draftText,
        })),
      setGeneratingDraft: (generatingDraft) => set({ generatingDraft }),
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
