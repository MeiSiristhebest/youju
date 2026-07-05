import type { DbModelConfig } from '../../data/types.js'
import type { UserModelConfig } from '../types.js'

type ModelConfigRepo = {
  listConfigs(userId: number | null, sessionId: string | null): Promise<DbModelConfig[]>
  getConfigById(id: string): Promise<DbModelConfig | undefined>
  getDefaultConfig(
    userId: number | null,
    sessionId: string | null,
  ): Promise<DbModelConfig | undefined>
  createConfig(
    userId: number | null,
    sessionId: string | null,
    data: {
      name: string
      provider: string
      apiKey: string
      baseURL: string
      model: string
      modelMappings: string
      isDefault: boolean
    },
  ): Promise<DbModelConfig>
  updateConfig(
    id: string,
    userId: number | null,
    sessionId: string | null,
    data: {
      name?: string
      provider?: string
      apiKey?: string
      baseURL?: string
      model?: string
      modelMappings?: string
      isDefault?: boolean
    },
  ): Promise<DbModelConfig | undefined>
  deleteConfig(id: string, userId: number | null, sessionId: string | null): Promise<boolean>
  setDefault(id: string, userId: number | null, sessionId: string | null): Promise<boolean>
}

export class ModelConfigService {
  constructor(private readonly repo: ModelConfigRepo) {}

  async listModelConfigs(
    userId: number | null,
    sessionId: string | null,
  ): Promise<UserModelConfig[]> {
    const configs = await this.repo.listConfigs(userId, sessionId)
    return configs.map(toDomain)
  }

  async getModelConfig(
    id: string,
    userId: number | null,
    sessionId: string | null,
  ): Promise<UserModelConfig | null> {
    const config = await this.repo.getConfigById(id)
    if (!config) return null

    const ownerMatch =
      (userId && config.user_id === userId) ||
      (sessionId && config.session_id === sessionId && config.user_id === null)
    if (!ownerMatch) return null

    return toDomain(config)
  }

  async getDefaultModelConfig(
    userId: number | null,
    sessionId: string | null,
  ): Promise<UserModelConfig | null> {
    const config = await this.repo.getDefaultConfig(userId, sessionId)
    if (!config) return null
    return toDomain(config)
  }

  async createModelConfig(
    userId: number | null,
    sessionId: string | null,
    data: {
      name: string
      provider: string
      apiKey: string
      baseURL: string
      model: string
      modelMappings?: Array<{ alias: string; model: string }>
      isDefault?: boolean
    },
  ): Promise<UserModelConfig> {
    const config = await this.repo.createConfig(userId, sessionId, {
      name: data.name,
      provider: data.provider || 'openai-compatible',
      apiKey: data.apiKey,
      baseURL: data.baseURL,
      model: data.model,
      modelMappings: JSON.stringify(data.modelMappings || []),
      isDefault: data.isDefault || false,
    })
    return toDomain(config)
  }

  async updateModelConfig(
    id: string,
    userId: number | null,
    sessionId: string | null,
    data: {
      name?: string
      provider?: string
      apiKey?: string
      baseURL?: string
      model?: string
      modelMappings?: Array<{ alias: string; model: string }>
      isDefault?: boolean
    },
  ): Promise<UserModelConfig | null> {
    const updateData: {
      name?: string
      provider?: string
      apiKey?: string
      baseURL?: string
      model?: string
      modelMappings?: string
      isDefault?: boolean
    } = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.provider !== undefined) updateData.provider = data.provider
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey
    if (data.baseURL !== undefined) updateData.baseURL = data.baseURL
    if (data.model !== undefined) updateData.model = data.model
    if (data.modelMappings !== undefined)
      updateData.modelMappings = JSON.stringify(data.modelMappings)
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault

    const config = await this.repo.updateConfig(id, userId, sessionId, updateData)
    if (!config) return null
    return toDomain(config)
  }

  async deleteModelConfig(
    id: string,
    userId: number | null,
    sessionId: string | null,
  ): Promise<boolean> {
    return this.repo.deleteConfig(id, userId, sessionId)
  }

  async setDefaultModelConfig(
    id: string,
    userId: number | null,
    sessionId: string | null,
  ): Promise<boolean> {
    return this.repo.setDefault(id, userId, sessionId)
  }
}

function toDomain(db: DbModelConfig): UserModelConfig {
  let modelMappings = []
  try {
    modelMappings = JSON.parse(db.model_mappings || '[]')
  } catch {
    // ignore
  }
  return {
    id: String(db.id),
    userId: db.user_id ? String(db.user_id) : null,
    sessionId: db.session_id,
    name: db.name,
    provider: db.provider as UserModelConfig['provider'],
    apiKey: db.api_key,
    baseURL: db.base_url,
    model: db.model,
    modelMappings,
    isDefault: db.is_default === 1,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}
