import { BaseProviderRegistry } from '../../domain/services/providerRegistry.js'
import type { AIConfig } from '../../domain/types.js'
import type { LLMProvider } from './llmProvider.js'
import { createLLMProviderFromEnv, DefaultLLMProvider } from './llmProvider.js'

export class LLMProviderRegistry extends BaseProviderRegistry<LLMProvider> {
  constructor() {
    super()
    this.registerDefaultProviders()
  }

  private registerDefaultProviders(): void {
    const defaultProvider = createLLMProviderFromEnv()
    if (defaultProvider) {
      this.register('default', defaultProvider, 100)
    }
  }

  registerFromConfig(id: string, config: AIConfig, priority?: number): void {
    const provider = new DefaultLLMProvider(id, config)
    this.register(id, provider, priority)
  }
}

export const llmProviderRegistry = new LLMProviderRegistry()
