import { analysisAdapter } from '../../ai/adapters/analysisAdapter.js'
import { draftAdapter } from '../../ai/adapters/draftAdapter.js'
import { embeddingAdapter } from '../../ai/adapters/embeddingAdapter.js'
import { modelProviderAdapter } from '../../ai/adapters/modelProviderAdapter.js'
import { retrievalAdapter } from '../../ai/adapters/retrievalAdapter.js'
import type { ModeCheckerPort } from '../../domain/ports/infrastructurePorts.js'
import { embeddingProviderRegistry } from '../ai/embeddingProviderRegistry.js'
import { llmProviderRegistry } from '../ai/llmProviderRegistry.js'
import { rerankerProviderRegistry } from '../ai/rerankerProviderRegistry.js'
import { isMockMode } from '../env.js'
import type { ServiceLocator } from './container.js'
import { Tokens } from './tokens.js'

export interface AdapterDependencies {
  modeChecker: ModeCheckerPort
}

export function configureAdapters(container: ServiceLocator): AdapterDependencies {
  container.registerSingleton(Tokens.AIAnalysisPort, () => analysisAdapter)
  container.registerSingleton(Tokens.AIDraftPort, () => draftAdapter)
  container.registerSingleton(Tokens.EmbeddingPort, () => embeddingAdapter)
  container.registerSingleton(Tokens.RerankerPort, () => retrievalAdapter)
  container.registerSingleton(Tokens.ModelProviderAdapter, () => modelProviderAdapter)

  container.registerSingleton(Tokens.LLMProviderRegistry, () => llmProviderRegistry)
  container.registerSingleton(Tokens.EmbeddingProviderRegistry, () => embeddingProviderRegistry)
  container.registerSingleton(Tokens.RerankerProviderRegistry, () => rerankerProviderRegistry)

  const modeChecker: ModeCheckerPort = {
    isMockMode: (overrideKey?: string, isDemo?: boolean) => isMockMode(overrideKey, isDemo),
  }
  container.registerSingleton(Tokens.ModeChecker, () => modeChecker)

  return { modeChecker }
}
