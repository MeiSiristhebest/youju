import crypto from 'node:crypto'
import { getEnv } from '../../infrastructure/env.js'
import type { ModeCheckerPort } from '../ports/infrastructurePorts.js'
import type { AnalyzeResult, ScenarioKnowledge, Source } from '../types.js'

interface CacheEntry {
  result: AnalyzeResult
  cachedAt: number
  hitCount: number
}

export class AnalysisCache {
  private cache = new Map<string, CacheEntry>()
  private ttlMs: number
  private maxEntries: number
  private readonly modeChecker: ModeCheckerPort

  constructor(modeChecker: ModeCheckerPort) {
    this.modeChecker = modeChecker
    const env = getEnv()
    this.ttlMs = env.ANALYSIS_CACHE_TTL_MS
    this.maxEntries = env.ANALYSIS_CACHE_MAX_ENTRIES
  }

  computeAnalysisFingerprint(
    sources: Source[],
    scenarioType?: string,
    scenarioKnowledge?: ScenarioKnowledge[],
  ): string {
    const sorted = [...sources].sort((a, b) =>
      `${a.name}|${a.type}`.localeCompare(`${b.name}|${b.type}`),
    )
    const content = sorted.map((s) => `${s.name}::${s.type}::${s.content}`).join('|||')
    const knowledgeSig = (scenarioKnowledge || [])
      .slice()
      .sort((a, b) => `${a.dimension}:${a.riskType}`.localeCompare(`${b.dimension}:${b.riskType}`))
      .map((k) => `${k.dimension}:${k.riskType}:${k.frequency}:${k.avgConfidence}`)
      .join(',')
    const hash = crypto.createHash('sha256')
    hash.update(`${scenarioType || 'custom'}|${content}|${knowledgeSig}`)
    return hash.digest('hex')
  }

  getCachedAnalysis(key: string): AnalyzeResult | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(key)
      return null
    }

    entry.hitCount++
    const cloned: AnalyzeResult = JSON.parse(JSON.stringify(entry.result))
    cloned.meta = {
      ...cloned.meta,
      fromCache: true,
      cachedAt: new Date(entry.cachedAt).toISOString(),
      cacheHitCount: entry.hitCount,
      durationMs: 0,
    }
    return cloned
  }

  setCachedAnalysis(key: string, result: AnalyzeResult): void {
    if (result.meta?.isMock || result.debugInfo?.isMock) return

    if (this.cache.size >= this.maxEntries) {
      let oldestKey: string | null = null
      let oldestScore = Number.POSITIVE_INFINITY
      for (const [k, e] of this.cache.entries()) {
        const score = e.cachedAt + e.hitCount * 60 * 60 * 1000
        if (score < oldestScore) {
          oldestScore = score
          oldestKey = k
        }
      }
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      result: JSON.parse(JSON.stringify(result)),
      cachedAt: Date.now(),
      hitCount: 0,
    })
  }

  invalidateAnalysisCache(key: string): void {
    this.cache.delete(key)
  }

  clearAnalysisCache(): void {
    this.cache.clear()
  }

  getAnalysisCacheStats() {
    const entries = [...this.cache.entries()].map(([key, entry]) => ({
      key: `${key.substring(0, 12)}…`,
      cachedAt: new Date(entry.cachedAt).toISOString(),
      hitCount: entry.hitCount,
      riskCount: entry.result.summary?.total ?? 0,
      scenarioType: entry.result.scenario?.type ?? 'unknown',
    }))
    return {
      totalEntries: this.cache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
      entries,
    }
  }

  shouldUseCache(options?: { persist?: boolean; isDemo?: boolean }): boolean {
    if (options?.persist === false) return false
    if (this.modeChecker.isMockMode(undefined, options?.isDemo)) return false
    return true
  }

  async preheatScenarios(
    scenarios: Array<{
      id: string
      name: string
      sources: Array<{ type: string; name: string; content: string; meta?: string }>
    }>,
    analyzeFn: (sources: Source[], scenarioType?: string) => Promise<AnalyzeResult>,
    onProgress?: (event: {
      scenarioId: string
      status: 'started' | 'done' | 'skipped' | 'failed'
      error?: string
    }) => void,
  ): Promise<PreheatResult> {
    const preheated: string[] = []
    const skipped: string[] = []
    const failed: Array<{ id: string; error: string }> = []

    for (const scenario of scenarios) {
      const sources: Source[] = scenario.sources.map((s, i) => ({
        id: `preheat-${scenario.id}-${i}`,
        type: s.type as Source['type'],
        name: s.name,
        content: s.content,
        meta: s.meta,
      }))

      const key = this.computeAnalysisFingerprint(sources, scenario.id)
      const existing = this.cache.get(key)
      if (existing && Date.now() - existing.cachedAt <= this.ttlMs) {
        skipped.push(scenario.id)
        onProgress?.({ scenarioId: scenario.id, status: 'skipped' })
        continue
      }

      onProgress?.({ scenarioId: scenario.id, status: 'started' })
      try {
        console.log(`[Preheat] 预热场景: ${scenario.name} (${scenario.id})`)
        const result = await analyzeFn(sources, scenario.id)
        this.setCachedAnalysis(key, result)
        preheated.push(scenario.id)
        console.log(`[Preheat] 场景 ${scenario.id} 预热完成，风险数: ${result.summary.total}`)
        onProgress?.({ scenarioId: scenario.id, status: 'done' })
      } catch (e) {
        const err = (e as Error).message
        console.error(`[Preheat] 场景 ${scenario.id} 预热失败:`, err)
        failed.push({ id: scenario.id, error: err })
        onProgress?.({ scenarioId: scenario.id, status: 'failed', error: err })
      }
    }

    return { preheated, skipped, failed }
  }
}

export interface PreheatResult {
  preheated: string[]
  skipped: string[]
  failed: Array<{ id: string; error: string }>
}
