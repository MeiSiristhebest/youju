import { create } from 'zustand'
import type { ScenarioType, Source, SourceType } from '../types'

interface SourceState {
  sources: Source[]
  selectedSourceId: string | null
  showAddSource: boolean
  addSourceTab: 'text' | 'file' | 'url' | 'screenshot'
  newSourceType: SourceType
  newSourceName: string
  newSourceContent: string
  newSourceUrl: string
  uploading: boolean
  deletingId: string | null
  fileDragOver: boolean
  ocrProgress: string
  screenshotPreview: string | null
  currentScenario: ScenarioType | null
  isDemo: boolean

  setSources: (sources: Source[]) => void
  addSource: (source: Source) => void
  removeSource: (id: string) => void
  setSelectedSourceId: (id: string | null) => void
  setShowAddSource: (show: boolean) => void
  setAddSourceTab: (tab: 'text' | 'file' | 'url' | 'screenshot') => void
  setNewSourceType: (type: SourceType) => void
  setNewSourceName: (name: string) => void
  setNewSourceContent: (content: string) => void
  setNewSourceUrl: (url: string) => void
  setUploading: (uploading: boolean) => void
  setDeletingId: (id: string | null) => void
  setFileDragOver: (over: boolean) => void
  setOcrProgress: (progress: string) => void
  setScreenshotPreview: (preview: string | null) => void
  setCurrentScenario: (scenario: ScenarioType | null) => void
  setIsDemo: (isDemo: boolean) => void
  resetNewSourceForm: () => void
}

export const useSourceStore = create<SourceState>((set) => ({
  sources: [],
  selectedSourceId: null,
  showAddSource: false,
  addSourceTab: 'text',
  newSourceType: 'chat',
  newSourceName: '',
  newSourceContent: '',
  newSourceUrl: '',
  uploading: false,
  deletingId: null,
  fileDragOver: false,
  ocrProgress: '',
  screenshotPreview: null,
  currentScenario: null,
  isDemo: false,

  setSources: (sources) => set({ sources }),
  addSource: (source) => set((state) => ({ sources: [...state.sources, source] })),
  removeSource: (id) => set((state) => ({ sources: state.sources.filter((s) => s.id !== id) })),
  setSelectedSourceId: (id) => set({ selectedSourceId: id }),
  setShowAddSource: (show) => set({ showAddSource: show }),
  setAddSourceTab: (tab) => set({ addSourceTab: tab }),
  setNewSourceType: (type) => set({ newSourceType: type }),
  setNewSourceName: (name) => set({ newSourceName: name }),
  setNewSourceContent: (content) => set({ newSourceContent: content }),
  setNewSourceUrl: (url) => set({ newSourceUrl: url }),
  setUploading: (uploading) => set({ uploading }),
  setDeletingId: (id) => set({ deletingId: id }),
  setFileDragOver: (over) => set({ fileDragOver: over }),
  setOcrProgress: (progress) => set({ ocrProgress: progress }),
  setScreenshotPreview: (preview) => set({ screenshotPreview: preview }),
  setCurrentScenario: (scenario) => set({ currentScenario: scenario }),
  setIsDemo: (isDemo) => set({ isDemo }),
  resetNewSourceForm: () =>
    set({
      newSourceName: '',
      newSourceContent: '',
      newSourceUrl: '',
    }),
}))
