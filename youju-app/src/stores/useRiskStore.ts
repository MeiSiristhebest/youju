import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Risk, RiskStatus } from '../types'
import { useAnalysisLogStore } from './useAnalysisLogStore'
import { useAnalysisResultStore } from './useAnalysisResultStore'

interface RiskEditHistoryEntry {
  originalDescription: string
  newDescription: string
  instruction: string
  timestamp: string
}

interface RiskState {
  highlightedRisk: string | null
  highlightedEvidence: { sourceId: string; quote: string } | null
  selectedRisk: Risk | null
  riskFeedback: Record<string, 'accurate' | 'inaccurate'>
  riskStatusFilter: RiskStatus | 'all'
  riskStatuses: Record<string, RiskStatus>
  riskNotes: Record<string, { content: string; updatedAt: string }>
  riskEditHistory: Record<string, RiskEditHistoryEntry[]>
  aiEditorTargetRiskId: string | null

  setHighlightedRisk: (id: string | null) => void
  setHighlightedEvidence: (ev: { sourceId: string; quote: string } | null) => void
  setSelectedRisk: (risk: Risk | null) => void
  setRiskFeedback: (riskId: string, feedback: 'accurate' | 'inaccurate') => void
  setRiskStatusFilter: (filter: RiskStatus | 'all') => void
  setRiskStatus: (riskId: string, status: RiskStatus) => void
  setRiskNotes: (riskId: string, notes: string) => void
  getRiskStatus: (riskId: string, defaultStatus?: RiskStatus) => RiskStatus
  getRiskNotes: (riskId: string) => { content: string; updatedAt: string } | null
  updateRiskDescription: (riskId: string, newDescription: string, instruction: string) => void
  updateRiskTitle: (riskId: string, newTitle: string) => void
  getRiskEditHistory: (riskId: string) => RiskEditHistoryEntry[]
  setAiEditorTargetRiskId: (riskId: string | null) => void
  resetRiskState: () => void
}

export const useRiskStore = create<RiskState>()(
  persist(
    (set, get) => ({
      highlightedRisk: null,
      highlightedEvidence: null,
      selectedRisk: null,
      riskFeedback: {},
      riskStatusFilter: 'all',
      riskStatuses: {},
      riskNotes: {},
      riskEditHistory: {},
      aiEditorTargetRiskId: null,

      setHighlightedRisk: (highlightedRisk) => set({ highlightedRisk }),
      setHighlightedEvidence: (highlightedEvidence) => set({ highlightedEvidence }),
      setSelectedRisk: (selectedRisk) => set({ selectedRisk }),
      setRiskFeedback: (riskId, feedback) =>
        set((state) => ({
          riskFeedback: { ...state.riskFeedback, [riskId]: feedback },
        })),
      setRiskStatusFilter: (riskStatusFilter) => set({ riskStatusFilter }),
      setRiskStatus: (riskId, status) => {
        const { riskStatuses } = get()
        const newStatuses = { ...riskStatuses, [riskId]: status }
        set({ riskStatuses: newStatuses })
      },
      setRiskNotes: (riskId, notes) => {
        const { riskNotes } = get()
        const newNotes = {
          ...riskNotes,
          [riskId]: { content: notes, updatedAt: new Date().toISOString() },
        }
        set({ riskNotes: newNotes })
      },
      getRiskStatus: (riskId, defaultStatus = 'pending') => {
        const { riskStatuses } = get()
        const result = useAnalysisResultStore.getState().result
        if (riskStatuses[riskId]) {
          return riskStatuses[riskId]
        }
        const risk = result?.risks.find((r) => r.id === riskId)
        if (risk?.status) {
          return risk.status
        }
        return defaultStatus
      },
      getRiskNotes: (riskId) => {
        const { riskNotes } = get()
        const result = useAnalysisResultStore.getState().result
        if (riskNotes[riskId]) {
          return riskNotes[riskId]
        }
        const risk = result?.risks.find((r) => r.id === riskId)
        if (risk?.notes && risk?.notesUpdatedAt) {
          return { content: risk.notes, updatedAt: risk.notesUpdatedAt }
        }
        return null
      },
      updateRiskDescription: (riskId, newDescription, instruction) => {
        const { selectedRisk, riskEditHistory } = get()
        const result = useAnalysisResultStore.getState().result
        if (!result) return

        const risk = result.risks.find((r) => r.id === riskId)
        if (!risk) return

        const originalDescription = risk.description

        const historyEntry: RiskEditHistoryEntry = {
          originalDescription,
          newDescription,
          instruction,
          timestamp: new Date().toISOString(),
        }

        const newHistory = {
          ...riskEditHistory,
          [riskId]: [...(riskEditHistory[riskId] || []), historyEntry].slice(-20),
        }

        const updatedRisks = result.risks.map((r) =>
          r.id === riskId ? { ...r, description: newDescription } : r,
        )

        useAnalysisResultStore.getState().setResult({ ...result, risks: updatedRisks })

        set({
          selectedRisk:
            selectedRisk?.id === riskId
              ? { ...selectedRisk, description: newDescription }
              : selectedRisk,
          riskEditHistory: newHistory,
        })

        useAnalysisLogStore.getState().addAnalysisLog({
          type: 'info',
          message: `风险描述已更新: ${risk.title}`,
          details: { riskId, instruction },
        })
      },
      updateRiskTitle: (riskId, newTitle) => {
        const { selectedRisk } = get()
        const result = useAnalysisResultStore.getState().result
        if (!result) return

        const risk = result.risks.find((r) => r.id === riskId)
        if (!risk) return

        const updatedRisks = result.risks.map((r) =>
          r.id === riskId ? { ...r, title: newTitle } : r,
        )

        useAnalysisResultStore.getState().setResult({ ...result, risks: updatedRisks })

        set({
          selectedRisk:
            selectedRisk?.id === riskId ? { ...selectedRisk, title: newTitle } : selectedRisk,
        })

        useAnalysisLogStore.getState().addAnalysisLog({
          type: 'info',
          message: `风险标题已更新: ${newTitle}`,
          details: { riskId },
        })
      },
      getRiskEditHistory: (riskId) => {
        const { riskEditHistory } = get()
        return riskEditHistory[riskId] || []
      },
      setAiEditorTargetRiskId: (aiEditorTargetRiskId) => set({ aiEditorTargetRiskId }),
      resetRiskState: () =>
        set({
          highlightedRisk: null,
          highlightedEvidence: null,
          selectedRisk: null,
          riskFeedback: {},
        }),
    }),
    {
      name: 'youju-risk-store',
      version: 1,
      partialize: (state) => ({
        riskStatuses: state.riskStatuses,
        riskNotes: state.riskNotes,
        riskEditHistory: state.riskEditHistory,
      }),
    },
  ),
)
