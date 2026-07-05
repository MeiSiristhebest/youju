import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScenarioType } from '../types'

// 固定 tab id：对话 tab 不在 tabs 数组中，但可作为 activeTabId
export const CHAT_TAB_ID = 'chat'

export interface WorkspaceTab {
  id: string
  taskId?: string
  scenario: ScenarioType
  scenarioName: string
  status: 'idle' | 'analyzing' | 'completed' | 'failed' | 'cancelled'
  sourceCount: number
  riskCount: number
  createdAt: number
  lastOpenedAt: number
  isBackground?: boolean
}

interface WorkspaceTabsState {
  tabs: WorkspaceTab[]
  activeTabId: string | null
  lastUsedOrder: string[]
  openTab: (scenario: ScenarioType, scenarioName: string) => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  renameTab: (tabId: string, name: string) => void
  updateTabStatus: (tabId: string, status: WorkspaceTab['status']) => void
  updateTabCounts: (tabId: string, sourceCount?: number, riskCount?: number) => void
  closeAllTabs: () => void
  getRecentTabs: () => WorkspaceTab[]
}

const generateTabId = (): string => {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useWorkspaceTabsStore = create<WorkspaceTabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      lastUsedOrder: [],

      openTab: (scenario, scenarioName) => {
        const now = Date.now()
        const newTab: WorkspaceTab = {
          id: generateTabId(),
          scenario,
          scenarioName,
          status: 'idle',
          sourceCount: 0,
          riskCount: 0,
          createdAt: now,
          lastOpenedAt: now,
        }
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
          lastUsedOrder: [newTab.id, ...state.lastUsedOrder.filter((id) => id !== newTab.id)],
        }))
        return newTab.id
      },

      closeTab: (tabId) => {
        set((state) => {
          const newTabs = state.tabs.filter((tab) => tab.id !== tabId)
          const newLastUsedOrder = state.lastUsedOrder.filter((id) => id !== tabId)
          let newActiveTabId = state.activeTabId

          if (state.activeTabId === tabId) {
            newActiveTabId = newLastUsedOrder.length > 0 ? newLastUsedOrder[0] : null
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
            lastUsedOrder: newLastUsedOrder,
          }
        })
      },

      setActiveTab: (tabId) => {
        const now = Date.now()
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId)
          // 固定 tab（如 CHAT_TAB_ID）不在 tabs 数组中，但仍可激活
          if (!tab && tabId !== CHAT_TAB_ID) return state

          return {
            activeTabId: tabId,
            lastUsedOrder: tab
              ? [tabId, ...state.lastUsedOrder.filter((id) => id !== tabId)]
              : state.lastUsedOrder,
            tabs: tab
              ? state.tabs.map((t) => (t.id === tabId ? { ...t, lastOpenedAt: now } : t))
              : state.tabs,
          }
        })
      },

      reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
          const newTabs = [...state.tabs]
          const [movedTab] = newTabs.splice(fromIndex, 1)
          newTabs.splice(toIndex, 0, movedTab)
          return { tabs: newTabs }
        })
      },

      renameTab: (tabId, name) => {
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, scenarioName: name } : tab)),
        }))
      },

      updateTabStatus: (tabId, status) => {
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, status } : tab)),
        }))
      },

      updateTabCounts: (tabId, sourceCount, riskCount) => {
        set((state) => ({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== tabId) return tab
            return {
              ...tab,
              sourceCount: sourceCount !== undefined ? sourceCount : tab.sourceCount,
              riskCount: riskCount !== undefined ? riskCount : tab.riskCount,
            }
          }),
        }))
      },

      closeAllTabs: () => {
        set({
          tabs: [],
          activeTabId: null,
          lastUsedOrder: [],
        })
      },

      getRecentTabs: () => {
        const { tabs, lastUsedOrder } = get()
        return lastUsedOrder
          .map((id) => tabs.find((tab) => tab.id === id))
          .filter((tab): tab is WorkspaceTab => tab !== undefined)
      },
    }),
    {
      name: 'youju-workspace-tabs',
      version: 1,
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        lastUsedOrder: state.lastUsedOrder,
      }),
    },
  ),
)
