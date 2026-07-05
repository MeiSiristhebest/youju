import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ParsedSummary, ScenarioType, Source, SourceStatus, SourceType } from '../types'

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
  scenarioDescription: string
  analyzingIntent: boolean
  intentAnalysis: IntentAnalysisResult | null
  editingSourceId: string | null

  setSources: (sources: Source[]) => void
  addSource: (source: Source) => void
  removeSource: (id: string) => void
  updateSource: (id: string, updates: Partial<Source>) => void
  updateSourceStatus: (id: string, status: SourceStatus, progress?: number) => void
  updateSourceSummary: (id: string, summary: ParsedSummary) => void
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
  setScenarioDescription: (desc: string) => void
  setAnalyzingIntent: (analyzing: boolean) => void
  setIntentAnalysis: (result: IntentAnalysisResult | null) => void
  setEditingSourceId: (id: string | null) => void
  resetNewSourceForm: () => void
}

export interface IntentAnalysisResult {
  scenarioType: string
  scenarioId: string
  summary: string
  confidence: number
  keyDimensions: string[]
  suggestedSources: string[]
  riskAreas: string[]
  reasoningSteps: string[]
  keywords: string[]
}

export const useSourceStore = create<SourceState>()(
  persist(
    (set) => ({
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
      scenarioDescription: '',
      analyzingIntent: false,
      intentAnalysis: null,
      editingSourceId: null,

      setSources: (sources) => set({ sources }),
      addSource: (source) =>
        set((state) => ({
          sources: [...state.sources, { createdAt: Date.now(), ...source }],
        })),
      removeSource: (id) => set((state) => ({ sources: state.sources.filter((s) => s.id !== id) })),
      updateSource: (id, updates) =>
        set((state) => ({
          sources: state.sources.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      updateSourceStatus: (id, status, progress) =>
        set((state) => ({
          sources: state.sources.map((s) =>
            s.id === id ? { ...s, status, progress: progress ?? s.progress } : s,
          ),
        })),
      updateSourceSummary: (id, summary) =>
        set((state) => ({
          sources: state.sources.map((s) => (s.id === id ? { ...s, parsedSummary: summary } : s)),
        })),
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
      setScenarioDescription: (desc) => set({ scenarioDescription: desc }),
      setAnalyzingIntent: (analyzing) => set({ analyzingIntent: analyzing }),
      setIntentAnalysis: (result) => set({ intentAnalysis: result }),
      setEditingSourceId: (id) => set({ editingSourceId: id }),
      resetNewSourceForm: () =>
        set({
          newSourceName: '',
          newSourceContent: '',
          newSourceUrl: '',
        }),
    }),
    {
      name: 'youju-source-store',
      version: 1,
      partialize: (state) => ({
        sources: state.sources,
        selectedSourceId: state.selectedSourceId,
        currentScenario: state.currentScenario,
        scenarioDescription: state.scenarioDescription,
        isDemo: state.isDemo,
      }),
    },
  ),
)
