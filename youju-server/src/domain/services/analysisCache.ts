import crypto from 'node:crypto'
import type { AnalyzeResult, ScenarioKnowledge, Source } from '../types.js'

/**
 * 分析结果缓存（热门场景预计算 + 内容指纹命中）
 *
 * 设计原则：
 * - 基于内容指纹（sources 内容 + scenarioType + scenarioKnowledge）做 SHA-256 哈希
 * - 内存 LRU + TTL，避免重复 AI 调用
 * - 仅缓存真实 AI 结果（mock 模式跳过）
 * - 命中时返回深拷贝并标记 meta.fromCache，避免外部修改污染缓存
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24 小时
const DEFAULT_MAX_ENTRIES = 50

interface CacheEntry {
  result: AnalyzeResult
  cachedAt: number
  hitCount: number
}

const cache = new Map<string, CacheEntry>()
const ttlMs = Number(process.env.ANALYSIS_CACHE_TTL_MS) || DEFAULT_TTL_MS
const maxEntries = Number(process.env.ANALYSIS_CACHE_MAX_ENTRIES) || DEFAULT_MAX_ENTRIES

/**
 * 计算分析输入的内容指纹
 * 同样的 sources 内容 + 场景类型 + 场景知识签名 → 同一个 key
 */
export function computeAnalysisFingerprint(
  sources: Source[],
  scenarioType?: string,
  scenarioKnowledge?: ScenarioKnowledge[],
): string {
  // 按 name+type 排序后再拼接，避免顺序差异导致 miss
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

/**
 * 查询缓存
 * 命中时返回深拷贝（避免外部修改污染缓存），并附加 fromCache 标记
 */
export function getCachedAnalysis(key: string): AnalyzeResult | null {
  const entry = cache.get(key)
  if (!entry) return null

  // TTL 过期清理
  if (Date.now() - entry.cachedAt > ttlMs) {
    cache.delete(key)
    return null
  }

  entry.hitCount++
  // 深拷贝，避免外部修改污染缓存
  const cloned: AnalyzeResult = JSON.parse(JSON.stringify(entry.result))
  cloned.meta = {
    ...cloned.meta,
    fromCache: true,
    cachedAt: new Date(entry.cachedAt).toISOString(),
    cacheHitCount: entry.hitCount,
    durationMs: 0, // 命中缓存，耗时为 0
  }
  return cloned
}

/**
 * 写入缓存
 * 仅在 result.meta.isMock !== true 时缓存（mock 结果不稳定，不缓存）
 */
export function setCachedAnalysis(key: string, result: AnalyzeResult): void {
  // mock 结果不缓存
  if (result.meta?.isMock || result.debugInfo?.isMock) return

  // LRU 淘汰：超过容量时移除最旧且命中次数最少的条目
  if (cache.size >= maxEntries) {
    let oldestKey: string | null = null
    let oldestScore = Number.POSITIVE_INFINITY
    for (const [k, e] of cache.entries()) {
      // 综合考虑时间和命中次数：越旧且命中越少，越优先淘汰
      const score = e.cachedAt + e.hitCount * 60 * 60 * 1000
      if (score < oldestScore) {
        oldestScore = score
        oldestKey = k
      }
    }
    if (oldestKey) cache.delete(oldestKey)
  }

  cache.set(key, {
    result: JSON.parse(JSON.stringify(result)), // 深拷贝存储
    cachedAt: Date.now(),
    hitCount: 0,
  })
}

export function invalidateAnalysisCache(key: string): void {
  cache.delete(key)
}

export function clearAnalysisCache(): void {
  cache.clear()
}

export function getAnalysisCacheStats() {
  const entries = [...cache.entries()].map(([key, entry]) => ({
    key: `${key.substring(0, 12)}…`,
    cachedAt: new Date(entry.cachedAt).toISOString(),
    hitCount: entry.hitCount,
    riskCount: entry.result.summary?.total ?? 0,
    scenarioType: entry.result.scenario?.type ?? 'unknown',
  }))
  return {
    totalEntries: cache.size,
    maxEntries,
    ttlMs,
    entries,
  }
}

/**
 * 判断是否应该使用缓存（供 analyzeSources 调用前判断）
 * - persist=false（增量分析的局部调用）→ 不缓存
 * - mock 模式 → 不缓存
 */
export function shouldUseCache(options?: { persist?: boolean }): boolean {
  if (options?.persist === false) return false
  if (!process.env.AI_API_KEY) return false
  return true
}

export interface PreheatResult {
  preheated: string[]
  skipped: string[]
  failed: Array<{ id: string; error: string }>
}

/**
 * 预热场景：对预设场景批量执行分析并写入缓存
 *
 * @param scenarios 预设场景列表
 * @param analyzeFn 实际分析函数（应使用 persist=false 避免污染日志）
 * @param onProgress 进度回调
 */
export async function preheatScenarios(
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

    const key = computeAnalysisFingerprint(sources, scenario.id)
    const existing = cache.get(key)
    if (existing && Date.now() - existing.cachedAt <= ttlMs) {
      skipped.push(scenario.id)
      onProgress?.({ scenarioId: scenario.id, status: 'skipped' })
      continue
    }

    onProgress?.({ scenarioId: scenario.id, status: 'started' })
    try {
      console.log(`[Preheat] 预热场景: ${scenario.name} (${scenario.id})`)
      const result = await analyzeFn(sources, scenario.id)
      setCachedAnalysis(key, result)
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
