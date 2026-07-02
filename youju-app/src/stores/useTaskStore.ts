import { create } from 'zustand'
import type { TaskRecord } from '../types'

interface TaskState {
  taskHistory: TaskRecord[]
  showHistory: boolean
  savingTask: boolean
  taskSaved: boolean

  setTaskHistory: (tasks: TaskRecord[]) => void
  addTask: (task: TaskRecord) => void
  removeTask: (id: string) => void
  setShowHistory: (show: boolean) => void
  setSavingTask: (saving: boolean) => void
  setTaskSaved: (saved: boolean) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  taskHistory: [],
  showHistory: false,
  savingTask: false,
  taskSaved: false,

  setTaskHistory: (taskHistory) => set({ taskHistory }),
  addTask: (task) => set((state) => ({ taskHistory: [task, ...state.taskHistory] })),
  removeTask: (id) =>
    set((state) => ({ taskHistory: state.taskHistory.filter((t) => t.id !== id) })),
  setShowHistory: (showHistory) => set({ showHistory }),
  setSavingTask: (savingTask) => set({ savingTask }),
  setTaskSaved: (taskSaved) => set({ taskSaved }),
}))
