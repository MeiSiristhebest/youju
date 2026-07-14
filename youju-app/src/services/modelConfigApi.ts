import { apiClient } from './apiClient'
import { handleApiError } from './errorHandler'

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'zhipu'
  | 'moonshot'
  | 'qwen'
  | 'volcengine'
  | 'qianfan'
  | 'yi'
  | 'spark'
  | 'openrouter'
  | 'agnes'
  | 'custom'

export interface ModelMapping {
  alias: string
  model: string
}

export interface ProviderPreset {
  provider: ModelProvider
  label: string
  name: string
  baseURL: string
  defaultModel: string
}

export interface ModelOption {
  value: string
  label: string
  provider?: ModelProvider
}

export async function fetchProviderPresets(): Promise<ProviderPreset[]> {
  try {
    return await apiClient.get<ProviderPreset[]>('/api/models/presets')
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function fetchAnalysisModelOptions(): Promise<ModelOption[]> {
  try {
    return await apiClient.get<ModelOption[]>('/api/models/options')
  } catch (error) {
    throw handleApiError(error)
  }
}

export interface TestModelConnectionRequest {
  provider: ModelProvider
  apiKey: string
  baseURL: string
  model: string
}

export interface TestModelConnectionResult {
  success: boolean
  model: string
  latencyMs: number
  error?: string
}

export interface FetchModelListRequest {
  provider: ModelProvider
  apiKey: string
  baseURL: string
}

export interface ModelItem {
  id: string
  name?: string
}

export async function testModelConnection(
  data: TestModelConnectionRequest,
): Promise<TestModelConnectionResult> {
  try {
    return await apiClient.post<TestModelConnectionResult>('/api/model-configs/test', data)
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function fetchModelList(data: FetchModelListRequest): Promise<ModelItem[]> {
  try {
    return await apiClient.post<ModelItem[]>('/api/model-configs/list-models', data)
  } catch (error) {
    throw handleApiError(error)
  }
}
