import { create } from 'zustand'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface ApiLogEntry {
  id: string
  timestamp: number
  method: HttpMethod
  path: string
  statusCode: number
  durationMs: number
  requestBody?: unknown
  responseBody?: unknown
  error?: string
}

type StatusFilter = 'all' | '2xx' | '4xx' | '5xx'

interface ApiLogsState {
  logs: ApiLogEntry[]
  isOpen: boolean
  statusFilter: StatusFilter
  searchQuery: string
  selectedLogId: string | null
  maxLogs: number

  addLog: (entry: Omit<ApiLogEntry, 'id' | 'timestamp'> & { timestamp?: number }) => void
  clearLogs: () => void
  setIsOpen: (open: boolean) => void
  toggleOpen: () => void
  setStatusFilter: (filter: StatusFilter) => void
  setSearchQuery: (query: string) => void
  setSelectedLogId: (id: string | null) => void
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

export const useApiLogsStore = create<ApiLogsState>((set, get) => ({
  logs: [],
  isOpen: false,
  statusFilter: 'all',
  searchQuery: '',
  selectedLogId: null,
  maxLogs: 50,

  addLog: (entry) => {
    const { maxLogs } = get()
    const newEntry: ApiLogEntry = {
      id: generateId(),
      timestamp: entry.timestamp ?? Date.now(),
      method: entry.method,
      path: entry.path,
      statusCode: entry.statusCode,
      durationMs: entry.durationMs,
      requestBody: entry.requestBody,
      responseBody: entry.responseBody,
      error: entry.error,
    }

    set((state) => {
      const newLogs = [newEntry, ...state.logs]
      if (newLogs.length > maxLogs) {
        newLogs.length = maxLogs
      }
      return { logs: newLogs }
    })
  },

  clearLogs: () => set({ logs: [], selectedLogId: null }),

  setIsOpen: (open) => set({ isOpen: open }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedLogId: (id) => set({ selectedLogId: id }),
}))
