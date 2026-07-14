import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModelMapping, ModelProvider } from '../services/modelConfigApi'

export type ModelConfigType = 'llm' | 'embedding'

export interface ModelConfig {
  id: string
  name: string
  provider: ModelProvider
  apiKey: string
  baseURL: string
  model: string
  modelMappings: ModelMapping[]
  configType: ModelConfigType
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface AIConfig {
  provider?: ModelProvider
  apiKey: string
  baseURL: string
  model: string
}

interface ModelConfigState {
  configs: ModelConfig[]
  addConfig: (config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>) => ModelConfig
  updateConfig: (
    id: string,
    updates: Partial<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => void
  deleteConfig: (id: string) => void
  setDefault: (id: string) => void
  getDefaultConfig: (type?: ModelConfigType) => ModelConfig | null
  getAIConfig: (type?: ModelConfigType) => AIConfig | null
  getConfigsByType: (type: ModelConfigType) => ModelConfig[]
}

export const useModelConfigStore = create<ModelConfigState>()(
  persist(
    (set, get) => ({
      configs: [],
      addConfig: (config) => {
        const now = new Date().toISOString()
        const newConfig: ModelConfig = {
          ...config,
          id: `mc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => {
          const sameTypeConfigs = state.configs.filter((c) => c.configType === newConfig.configType)
          const shouldBeDefault = newConfig.isDefault || sameTypeConfigs.length === 0
          if (shouldBeDefault) {
            newConfig.isDefault = true
          }
          const configs = newConfig.isDefault
            ? state.configs.map((c) =>
                c.configType === newConfig.configType ? { ...c, isDefault: false } : c,
              )
            : state.configs
          return { configs: [...configs, newConfig] }
        })
        return newConfig
      },
      updateConfig: (id, updates) => {
        set((state) => {
          let configs = state.configs.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
          )
          if (updates.isDefault) {
            const targetConfig = configs.find((c) => c.id === id)
            if (targetConfig) {
              configs = configs.map((c) =>
                c.configType === targetConfig.configType && c.id !== id
                  ? { ...c, isDefault: false }
                  : c,
              )
            }
          }
          return { configs }
        })
      },
      deleteConfig: (id) => {
        set((state) => {
          const targetConfig = state.configs.find((c) => c.id === id)
          const configs = state.configs.filter((c) => c.id !== id)
          if (targetConfig?.isDefault) {
            const sameTypeConfigs = configs.filter((c) => c.configType === targetConfig.configType)
            if (sameTypeConfigs.length > 0) {
              sameTypeConfigs[0].isDefault = true
            }
          }
          return { configs }
        })
      },
      setDefault: (id) => {
        set((state) => {
          const targetConfig = state.configs.find((c) => c.id === id)
          if (!targetConfig) return state
          return {
            configs: state.configs.map((c) => ({
              ...c,
              isDefault:
                c.id === id ? true : c.configType === targetConfig.configType ? false : c.isDefault,
            })),
          }
        })
      },
      getDefaultConfig: (type: ModelConfigType = 'llm') => {
        const configs = get().configs.filter((c) => c.configType === type)
        return configs.find((c) => c.isDefault) || configs[0] || null
      },
      getAIConfig: (type: ModelConfigType = 'llm') => {
        const config = get().getDefaultConfig(type)
        if (!config) return null
        return {
          provider: config.provider,
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          model: config.model,
        }
      },
      getConfigsByType: (type: ModelConfigType) => {
        return get().configs.filter((c) => c.configType === type)
      },
    }),
    {
      name: 'youju-model-configs',
    },
  ),
)
