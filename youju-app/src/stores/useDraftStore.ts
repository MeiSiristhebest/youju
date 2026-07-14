import { create } from 'zustand'

interface DraftState {
  showDraft: boolean
  draftText: string
  generatingDraft: boolean

  setShowDraft: (show: boolean) => void
  setDraftText: (text: string | ((prev: string) => string)) => void
  setGeneratingDraft: (generating: boolean) => void
  resetDraftState: () => void
}

export const useDraftStore = create<DraftState>()((set, get) => ({
  showDraft: false,
  draftText: '',
  generatingDraft: false,

  setShowDraft: (showDraft) => set({ showDraft }),
  setDraftText: (draftText) =>
    set((state) => ({
      draftText: typeof draftText === 'function' ? draftText(state.draftText) : draftText,
    })),
  setGeneratingDraft: (generatingDraft) => set({ generatingDraft }),
  resetDraftState: () =>
    set({
      showDraft: false,
      draftText: '',
      generatingDraft: false,
    }),
}))
