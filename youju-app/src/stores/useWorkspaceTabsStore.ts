import { create } from 'zustand'
import { jsonStorage } from '../lib/storage'
import type { ScenarioType } from '../types'

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
  closeTabsToRight: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  renameTab: (tabId: string, name: string) => void
  updateTabStatus: (tabId: string, status: WorkspaceTab['status']) => void
  updateTabCounts: (tabId: string, sourceCount?: number, riskCount?: number) => void
  closeAllTabs: () => void
  getRecentTabs: () => WorkspaceTab[]
}

const STORAGE_KEY = 'workspace_tabs'
const STORAGE_VERSION = 1

interface PersistedTabsState {
  version: number
  tabs: WorkspaceTab[]
  activeTabId: string | null
  lastUsedOrder: string[]
}

function loadState(): Pick<WorkspaceTabsState, 'tabs' | 'activeTabId' | 'lastUsedOrder'> {
  const data = jsonStorage.getItem<PersistedTabsState>(STORAGE_KEY)
  if (!data || data.version !== STORAGE_VERSION) {
    return { tabs: [], activeTabId: null, lastUsedOrder: [] }
  }
  return {
    tabs: data.tabs || [],
    activeTabId: data.activeTabId || null,
    lastUsedOrder: data.lastUsedOrder || [],
  }
}

function saveState(
  state: Pick<WorkspaceTabsState, 'tabs' | 'activeTabId' | 'lastUsedOrder'>,
): void {
  jsonStorage.setItem<PersistedTabsState>(STORAGE_KEY, { ...state, version: STORAGE_VERSION })
}

const generateTabId = (): string => {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const initialState = loadState()

export const useWorkspaceTabsStore = create<WorkspaceTabsState>()((set, get) => ({
  ...initialState,

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
    set((state) => {
      const newState = {
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        lastUsedOrder: [newTab.id, ...state.lastUsedOrder.filter((id) => id !== newTab.id)],
      }
      saveState(newState)
      return newState
    })
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

      const newState = {
        tabs: newTabs,
        activeTabId: newActiveTabId,
        lastUsedOrder: newLastUsedOrder,
      }
      saveState(newState)
      return newState
    })
  },

  setActiveTab: (tabId) => {
    const now = Date.now()
    set((state) => {
      if (state.activeTabId === tabId) return state

      const tab = state.tabs.find((t) => t.id === tabId)
      if (!tab) return state

      const isFirstInOrder = state.lastUsedOrder[0] === tabId
      const needsOrderUpdate = tab && !isFirstInOrder
      const needsTabsUpdate = tab && tab.lastOpenedAt !== now

      const newState = {
        activeTabId: tabId,
        lastUsedOrder: needsOrderUpdate
          ? [tabId, ...state.lastUsedOrder.filter((id) => id !== tabId)]
          : state.lastUsedOrder,
        tabs: needsTabsUpdate
          ? state.tabs.map((t) => (t.id === tabId ? { ...t, lastOpenedAt: now } : t))
          : state.tabs,
      }
      saveState(newState)
      return newState
    })
  },

  reorderTabs: (fromIndex, toIndex) => {
    set((state) => {
      const newTabs = [...state.tabs]
      const [movedTab] = newTabs.splice(fromIndex, 1)
      newTabs.splice(toIndex, 0, movedTab)
      const newState = { tabs: newTabs }
      saveState({ ...state, ...newState })
      return newState
    })
  },

  renameTab: (tabId, name) => {
    set((state) => {
      const newTabs = state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, scenarioName: name } : tab,
      )
      const newState = { tabs: newTabs }
      saveState({ ...state, ...newState })
      return newState
    })
  },

  updateTabStatus: (tabId, status) => {
    set((state) => {
      const newTabs = state.tabs.map((tab) => (tab.id === tabId ? { ...tab, status } : tab))
      const newState = { tabs: newTabs }
      saveState({ ...state, ...newState })
      return newState
    })
  },

  updateTabCounts: (tabId, sourceCount, riskCount) => {
    set((state) => {
      const newTabs = state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab
        return {
          ...tab,
          sourceCount: sourceCount !== undefined ? sourceCount : tab.sourceCount,
          riskCount: riskCount !== undefined ? riskCount : tab.riskCount,
        }
      })
      const newState = { tabs: newTabs }
      saveState({ ...state, ...newState })
      return newState
    })
  },

  closeTabsToRight: (tabId) => {
    set((state) => {
      const tabIndex = state.tabs.findIndex((t) => t.id === tabId)
      if (tabIndex === -1) return state
      const newTabs = state.tabs.slice(0, tabIndex + 1)
      const closedIds = state.tabs.slice(tabIndex + 1).map((t) => t.id)
      const newLastUsedOrder = state.lastUsedOrder.filter((id) => !closedIds.includes(id))
      const newActiveTabId = closedIds.includes(state.activeTabId!) ? tabId : state.activeTabId
      const newState = {
        tabs: newTabs,
        activeTabId: newActiveTabId,
        lastUsedOrder: newLastUsedOrder,
      }
      saveState(newState)
      return newState
    })
  },

  closeOtherTabs: (tabId) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id === tabId)
      const newLastUsedOrder = [tabId]
      const newActiveTabId = tabId
      const newState = {
        tabs: newTabs,
        activeTabId: newActiveTabId,
        lastUsedOrder: newLastUsedOrder,
      }
      saveState(newState)
      return newState
    })
  },

  closeAllTabs: () => {
    const newState = { tabs: [], activeTabId: null, lastUsedOrder: [] }
    saveState(newState)
    set(newState)
  },

  getRecentTabs: () => {
    const { tabs, lastUsedOrder } = get()
    return lastUsedOrder
      .map((id) => tabs.find((tab) => tab.id === id))
      .filter((tab): tab is WorkspaceTab => tab !== undefined)
  },
}))
