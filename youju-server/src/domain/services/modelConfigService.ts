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

let _repo: ModelConfigRepo | null = null

export function setModelConfigRepository(repo: ModelConfigRepo): void {
  _repo = repo
}

function getRepo(): ModelConfigRepo {
  if (!_repo) {
    throw new Error('ModelConfigRepository not set.')
  }
  return _repo
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

export async function listModelConfigs(
  userId: number | null,
  sessionId: string | null,
): Promise<UserModelConfig[]> {
  const configs = await getRepo().listConfigs(userId, sessionId)
  return configs.map(toDomain)
}

export async function getModelConfig(
  id: string,
  userId: number | null,
  sessionId: string | null,
): Promise<UserModelConfig | null> {
  const config = await getRepo().getConfigById(id)
  if (!config) return null

  const ownerMatch =
    (userId && config.user_id === userId) ||
    (sessionId && config.session_id === sessionId && config.user_id === null)
  if (!ownerMatch) return null

  return toDomain(config)
}

export async function getDefaultModelConfig(
  userId: number | null,
  sessionId: string | null,
): Promise<UserModelConfig | null> {
  const config = await getRepo().getDefaultConfig(userId, sessionId)
  if (!config) return null
  return toDomain(config)
}

export async function createModelConfig(
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
  const config = await getRepo().createConfig(userId, sessionId, {
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

export async function updateModelConfig(
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

  const config = await getRepo().updateConfig(id, userId, sessionId, updateData)
  if (!config) return null
  return toDomain(config)
}

export async function deleteModelConfig(
  id: string,
  userId: number | null,
  sessionId: string | null,
): Promise<boolean> {
  return getRepo().deleteConfig(id, userId, sessionId)
}

export async function setDefaultModelConfig(
  id: string,
  userId: number | null,
  sessionId: string | null,
): Promise<boolean> {
  return getRepo().setDefault(id, userId, sessionId)
}
