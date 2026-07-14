import type { AnalyzeResult, ChecklistItem, Task, TaskRecord } from '../types'
import { apiClient } from './apiClient'
import { handleApiError } from './errorHandler'

export interface InitialSource {
  type: string
  name: string
  content: string
  meta?: string
}

export interface CreateTaskParams {
  title: string
  scenarioType: string
  sourceIds: string[]
  initialSources?: InitialSource[]
}

export interface TaskDetail extends Task {
  result: AnalyzeResult & { checklist: ChecklistItem[] }
}

export const taskApi = {
  async getTasks(): Promise<TaskRecord[]> {
    try {
      return await apiClient.get<TaskRecord[]>('/api/tasks')
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async getTask(id: string): Promise<TaskDetail> {
    try {
      return await apiClient.get<TaskDetail>(`/api/tasks/${id}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async createTask(params: CreateTaskParams): Promise<TaskRecord> {
    try {
      return await apiClient.post<TaskRecord>('/api/tasks', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async deleteTask(id: string): Promise<void> {
    try {
      return await apiClient.delete<void>(`/api/tasks/${id}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async updateChecklist(taskId: string, checkedItems: string[]): Promise<void> {
    try {
      return await apiClient.put<void>(`/api/tasks/${taskId}/checklist`, { checkedItems })
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async updateTaskTitle(taskId: string, title: string): Promise<TaskRecord> {
    try {
      return await apiClient.put<TaskRecord>(`/api/tasks/${taskId}/title`, { title })
    } catch (error) {
      throw handleApiError(error)
    }
  },
}
