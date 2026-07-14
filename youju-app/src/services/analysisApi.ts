import type { AIConfig } from '../stores/useModelConfigStore'
import type {
  AnalyzeResult,
  AsyncTaskStatusResponse,
  Risk,
  RiskType,
  ScenarioType,
  SubmitAsyncAnalysisResponse,
} from '../types'
import { apiClient } from './apiClient'
import { handleApiError } from './errorHandler'

export interface AnalyzeParams {
  sourceIds: string[]
  scenarioType: ScenarioType | null
  taskId?: string
  aiConfig: AIConfig
}

export interface IncrementalAnalyzeParams {
  existingResult: AnalyzeResult
  newSourceIds: string[]
  scenarioType: ScenarioType | null
  taskId?: string
  aiConfig: AIConfig
}

export interface DraftResult {
  draft: string
}

export const analysisApi = {
  async analyze(params: AnalyzeParams): Promise<AnalyzeResult> {
    try {
      const { taskId, aiConfig, ...rest } = params
      const body = taskId ? { ...rest, aiConfig, task_id: taskId } : { ...rest, aiConfig }
      return await apiClient.post<AnalyzeResult>('/api/analyze', body)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async analyzeIncremental(params: IncrementalAnalyzeParams): Promise<AnalyzeResult> {
    try {
      const { taskId, aiConfig, ...rest } = params
      const body = taskId ? { ...rest, aiConfig, task_id: taskId } : { ...rest, aiConfig }
      return await apiClient.post<AnalyzeResult>('/api/analyze/incremental', body)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async generateDraft(params: { risk: Risk; context: string }): Promise<DraftResult> {
    try {
      return await apiClient.post<DraftResult>('/api/draft', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async submitRiskFeedback(params: {
    riskId: string
    riskType: RiskType
    isAccurate: boolean
  }): Promise<void> {
    try {
      return await apiClient.post<void>('/api/preferences/risk-feedback', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async submitChecklistAction(params: {
    riskType: RiskType
    dimension?: string
    checked: boolean
  }): Promise<void> {
    try {
      return await apiClient.post<void>('/api/preferences/checklist-action', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async submitAsyncAnalysis(params: AnalyzeParams): Promise<SubmitAsyncAnalysisResponse> {
    try {
      const { taskId, aiConfig, ...rest } = params
      const body = taskId ? { ...rest, aiConfig, task_id: taskId } : { ...rest, aiConfig }
      return await apiClient.post<SubmitAsyncAnalysisResponse>('/api/analyze/async', body)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async pollAnalysisStatus(taskId: string): Promise<AsyncTaskStatusResponse> {
    try {
      return await apiClient.get<AsyncTaskStatusResponse>(`/api/analyze/status/${taskId}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },
}
