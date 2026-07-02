import type { AnalyzeResult, ChecklistItem, TaskRecord } from '../types'
import { apiClient } from './apiClient'
import { handleApiError } from './errorHandler'

export interface CreateTaskParams {
  title: string
  scenarioType: string
  sourceIds: string[]
}

export interface TaskDetail {
  id: string
  title: string
  scenarioType: string
  sourceCount: number
  createdAt: string
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
}
