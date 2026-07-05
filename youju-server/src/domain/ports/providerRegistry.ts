export interface ProviderHealth {
  healthy: boolean
  latencyMs?: number
  error?: string
  lastCheckedAt: number
}

export interface ProviderWithHealth {
  healthCheck(): Promise<ProviderHealth>
}

export interface ProviderEntry<T> {
  id: string
  provider: T
  priority: number
  health: ProviderHealth
}

export interface ProviderRegistry<T extends ProviderWithHealth> {
  register(id: string, provider: T, priority?: number): void
  unregister(id: string): boolean
  get(id: string): T | undefined
  list(): ProviderEntry<T>[]
  getHealthy(): ProviderEntry<T>[]
  selectBest(): T | undefined
  checkHealth(id: string): Promise<ProviderHealth | undefined>
  checkAllHealth(): Promise<Map<string, ProviderHealth>>
}
