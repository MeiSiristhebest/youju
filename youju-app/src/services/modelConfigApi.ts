import { apiClient } from './apiClient'

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'zhipu'
  | 'moonshot'
  | 'qwen'
  | 'custom'

export interface ModelMapping {
  alias: string
  model: string
}

export interface UserModelConfig {
  id: string
  userId: string | null
  sessionId: string | null
  name: string
  provider: ModelProvider
  baseURL: string
  model: string
  modelMappings: ModelMapping[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateModelConfigRequest {
  name: string
  provider: ModelProvider
  apiKey: string
  baseURL: string
  model: string
  modelMappings?: ModelMapping[]
  isDefault?: boolean
}

export interface UpdateModelConfigRequest {
  name?: string
  provider?: ModelProvider
  apiKey?: string
  baseURL?: string
  model?: string
  modelMappings?: ModelMapping[]
  isDefault?: boolean
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

export async function listModelConfigs(): Promise<UserModelConfig[]> {
  const res = await apiClient.get<{ code: number; data: UserModelConfig[] }>('/api/model-configs')
  return res.data
}

export async function getDefaultModelConfig(): Promise<UserModelConfig | null> {
  const res = await apiClient.get<{ code: number; data: UserModelConfig | null }>(
    '/api/model-configs/default',
  )
  return res.data
}

export async function createModelConfig(data: CreateModelConfigRequest): Promise<UserModelConfig> {
  const res = await apiClient.post<{ code: number; data: UserModelConfig }>(
    '/api/model-configs',
    data,
  )
  return res.data
}

export async function updateModelConfig(
  id: string,
  data: UpdateModelConfigRequest,
): Promise<UserModelConfig> {
  const res = await apiClient.put<{ code: number; data: UserModelConfig }>(
    `/api/model-configs/${id}`,
    data,
  )
  return res.data
}

export async function deleteModelConfig(id: string): Promise<boolean> {
  const res = await apiClient.delete<{ code: number; data: { success: boolean } }>(
    `/api/model-configs/${id}`,
  )
  return res.data.success
}

export async function setDefaultModelConfig(id: string): Promise<boolean> {
  const res = await apiClient.post<{ code: number; data: { success: boolean } }>(
    `/api/model-configs/${id}/set-default`,
  )
  return res.data.success
}

export async function testModelConnection(
  data: TestModelConnectionRequest,
): Promise<TestModelConnectionResult> {
  const res = await apiClient.post<{ code: number; data: TestModelConnectionResult }>(
    '/api/model-configs/test',
    data,
  )
  return res.data
}
