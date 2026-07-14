import type { AIConfig } from '../../domain/types.js'
import { listModels, testModelConnection } from '../llm.js'

interface ModelInfo {
  id: string
  name?: string
}

interface ModelConnectionTestResult {
  success: boolean
  model: string
  latencyMs: number
  error?: string
}

export class ModelProviderAdapter {
  async listModels(config: AIConfig): Promise<ModelInfo[]> {
    return listModels(config)
  }

  async testConnection(config: AIConfig): Promise<ModelConnectionTestResult> {
    return testModelConnection(config)
  }
}

export const modelProviderAdapter = new ModelProviderAdapter()
