import { BaseProviderRegistry } from '../../domain/services/providerRegistry.js'
import type { EmbeddingProvider, EmbeddingProviderConfig } from './embeddingProvider.js'
import { createEmbeddingProviderFromEnv, DefaultEmbeddingProvider } from './embeddingProvider.js'

export class EmbeddingProviderRegistry extends BaseProviderRegistry<EmbeddingProvider> {
  constructor() {
    super()
    this.registerDefaultProviders()
  }

  private registerDefaultProviders(): void {
    const defaultProvider = createEmbeddingProviderFromEnv()
    if (defaultProvider) {
      this.register('default', defaultProvider, 100)
    }
  }

  registerFromConfig(id: string, config: EmbeddingProviderConfig, priority?: number): void {
    const provider = new DefaultEmbeddingProvider(id, config)
    this.register(id, provider, priority)
  }
}

export const embeddingProviderRegistry = new EmbeddingProviderRegistry()
