import { BaseProviderRegistry } from '../../domain/services/providerRegistry.js'
import type { RerankerProvider, RerankerProviderConfig } from './rerankerProvider.js'
import { createRerankerProviderFromEnv, DefaultRerankerProvider } from './rerankerProvider.js'

export class RerankerProviderRegistry extends BaseProviderRegistry<RerankerProvider> {
  constructor() {
    super()
    this.registerDefaultProviders()
  }

  private registerDefaultProviders(): void {
    const defaultProvider = createRerankerProviderFromEnv()
    if (defaultProvider) {
      this.register('default', defaultProvider, 100)
    }
  }

  registerFromConfig(id: string, config: RerankerProviderConfig, priority?: number): void {
    const provider = new DefaultRerankerProvider(id, config)
    this.register(id, provider, priority)
  }
}

export const rerankerProviderRegistry = new RerankerProviderRegistry()
