import type {
  ProviderEntry,
  ProviderHealth,
  ProviderRegistry,
  ProviderWithHealth,
} from '../ports/providerRegistry.js'

const DEFAULT_PRIORITY = 100
const HEALTH_CACHE_TTL_MS = 30_000

export abstract class BaseProviderRegistry<T extends ProviderWithHealth>
  implements ProviderRegistry<T>
{
  protected readonly providers = new Map<string, ProviderEntry<T>>()

  register(id: string, provider: T, priority: number = DEFAULT_PRIORITY): void {
    this.providers.set(id, {
      id,
      provider,
      priority,
      health: {
        healthy: false,
        lastCheckedAt: 0,
      },
    })
  }

  unregister(id: string): boolean {
    return this.providers.delete(id)
  }

  get(id: string): T | undefined {
    return this.providers.get(id)?.provider
  }

  list(): ProviderEntry<T>[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority)
  }

  getHealthy(): ProviderEntry<T>[] {
    return this.list().filter((entry) => entry.health.healthy)
  }

  selectBest(): T | undefined {
    const healthy = this.getHealthy()
    if (healthy.length === 0) {
      return undefined
    }
    return healthy[0].provider
  }

  async checkHealth(id: string): Promise<ProviderHealth | undefined> {
    const entry = this.providers.get(id)
    if (!entry) {
      return undefined
    }

    const now = Date.now()
    if (now - entry.health.lastCheckedAt < HEALTH_CACHE_TTL_MS) {
      return entry.health
    }

    try {
      const startTime = Date.now()
      const health = await entry.provider.healthCheck()
      entry.health = {
        ...health,
        lastCheckedAt: Date.now(),
        latencyMs: Date.now() - startTime,
      }
    } catch (e) {
      entry.health = {
        healthy: false,
        error: (e as Error).message,
        lastCheckedAt: Date.now(),
      }
    }

    return entry.health
  }

  async checkAllHealth(): Promise<Map<string, ProviderHealth>> {
    const ids = Array.from(this.providers.keys())
    const results = await Promise.all(ids.map((id) => this.checkHealth(id)))
    const map = new Map<string, ProviderHealth>()
    for (let i = 0; i < ids.length; i++) {
      const health = results[i]
      if (health) {
        map.set(ids[i], health)
      }
    }
    return map
  }
}
