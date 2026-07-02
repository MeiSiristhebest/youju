import type {
  AnalyzeResult,
  AsyncTaskStatusResponse,
  Risk,
  ScenarioType,
  SubmitAsyncAnalysisResponse,
} from '../types'
import { apiClient } from './apiClient'
import { handleApiError } from './errorHandler'

export interface AnalyzeParams {
  sourceIds: string[]
  scenarioType: ScenarioType | null
}

export interface IncrementalAnalyzeParams {
  existingResult: AnalyzeResult
  newSourceIds: string[]
  scenarioType: ScenarioType | null
}

export interface DraftResult {
  draft: string
}

export const analysisApi = {
  async analyze(params: AnalyzeParams): Promise<AnalyzeResult> {
    try {
      return await apiClient.post<AnalyzeResult>('/api/analyze', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async analyzeIncremental(params: IncrementalAnalyzeParams): Promise<AnalyzeResult> {
    try {
      return await apiClient.post<AnalyzeResult>('/api/analyze/incremental', params)
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
    feedback: 'accurate' | 'inaccurate'
  }): Promise<void> {
    try {
      return await apiClient.post<void>('/api/feedback/risk', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async submitRiskPreferenceFeedback(params: {
    riskId: string
    riskType: string
    isAccurate: boolean
  }): Promise<void> {
    try {
      return await apiClient.post<void>('/api/preferences/risk-feedback', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async submitChecklistAction(params: {
    riskType: string
    dimension?: string
    checked: boolean
  }): Promise<void> {
    try {
      return await apiClient.post<void>('/api/preferences/checklist-action', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async getSysStats(): Promise<any> {
    try {
      return await apiClient.post<any>('/api/admin/stats')
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async submitAsyncAnalysis(params: AnalyzeParams): Promise<SubmitAsyncAnalysisResponse> {
    try {
      return await apiClient.post<SubmitAsyncAnalysisResponse>('/api/analyze/async', params)
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
