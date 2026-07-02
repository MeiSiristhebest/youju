import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAnalysisCache,
  computeAnalysisFingerprint,
  getAnalysisCacheStats,
  getCachedAnalysis,
  setCachedAnalysis,
  shouldUseCache,
} from '../src/domain/services/analysisCache.js'
import type { AnalyzeResult, Source } from '../src/domain/types.js'

function makeSource(id: string, name: string, content: string): Source {
  return { id, type: 'chat', name, content }
}

function makeResult(risks: number = 3): AnalyzeResult {
  return {
    summary: { critical: 1, warning: 1, info: 1, total: risks },
    risks: [],
    checklist: [],
    alignedVersion: 'v1',
    extractedEntities: { dates: [], amounts: [], terms: [], promises: [] },
    meta: { durationMs: 1000, sourceCount: 2 },
  }
}

describe('分析结果缓存', () => {
  beforeEach(() => {
    clearAnalysisCache()
  })

  describe('computeAnalysisFingerprint', () => {
    it('相同内容生成相同指纹', () => {
      const sources = [makeSource('1', '聊天', '内容A'), makeSource('2', '合同', '内容B')]
      const key1 = computeAnalysisFingerprint(sources, 'job')
      const key2 = computeAnalysisFingerprint(sources, 'job')
      expect(key1).toBe(key2)
    })

    it('不同内容生成不同指纹', () => {
      const sources1 = [makeSource('1', '聊天', '内容A')]
      const sources2 = [makeSource('1', '聊天', '内容B')]
      const key1 = computeAnalysisFingerprint(sources1, 'job')
      const key2 = computeAnalysisFingerprint(sources2, 'job')
      expect(key1).not.toBe(key2)
    })

    it('不同 scenarioType 生成不同指纹', () => {
      const sources = [makeSource('1', '聊天', '内容A')]
      const key1 = computeAnalysisFingerprint(sources, 'job')
      const key2 = computeAnalysisFingerprint(sources, 'rent')
      expect(key1).not.toBe(key2)
    })

    it('sources 顺序不影响指纹（排序后计算）', () => {
      const sources1 = [makeSource('1', 'A', '内容A'), makeSource('2', 'B', '内容B')]
      const sources2 = [makeSource('2', 'B', '内容B'), makeSource('1', 'A', '内容A')]
      const key1 = computeAnalysisFingerprint(sources1, 'job')
      const key2 = computeAnalysisFingerprint(sources2, 'job')
      expect(key1).toBe(key2)
    })

    it('不同 scenarioKnowledge 生成不同指纹', () => {
      const sources = [makeSource('1', '聊天', '内容A')]
      const knowledge1 = [
        { dimension: '薪资', riskType: 'conflict', frequency: 10, avgConfidence: 0.8 },
      ]
      const knowledge2 = [
        { dimension: '时间', riskType: 'missing', frequency: 5, avgConfidence: 0.6 },
      ]
      const key1 = computeAnalysisFingerprint(sources, 'job', knowledge1)
      const key2 = computeAnalysisFingerprint(sources, 'job', knowledge2)
      expect(key1).not.toBe(key2)
    })

    it('scenarioKnowledge 顺序不影响指纹', () => {
      const sources = [makeSource('1', '聊天', '内容A')]
      const knowledge1 = [
        { dimension: '薪资', riskType: 'conflict', frequency: 10, avgConfidence: 0.8 },
        { dimension: '时间', riskType: 'missing', frequency: 5, avgConfidence: 0.6 },
      ]
      const knowledge2 = [
        { dimension: '时间', riskType: 'missing', frequency: 5, avgConfidence: 0.6 },
        { dimension: '薪资', riskType: 'conflict', frequency: 10, avgConfidence: 0.8 },
      ]
      const key1 = computeAnalysisFingerprint(sources, 'job', knowledge1)
      const key2 = computeAnalysisFingerprint(sources, 'job', knowledge2)
      expect(key1).toBe(key2)
    })
  })

  describe('缓存读写', () => {
    it('写入后可以读取', () => {
      const key = 'test-key-1'
      const result = makeResult(5)
      setCachedAnalysis(key, result)
      const cached = getCachedAnalysis(key)
      expect(cached).not.toBeNull()
      expect(cached!.summary.total).toBe(5)
    })

    it('未写入的 key 返回 null', () => {
      expect(getCachedAnalysis('nonexistent-key')).toBeNull()
    })

    it('读取返回深拷贝（修改不影响缓存）', () => {
      const key = 'test-key-2'
      const result = makeResult(3)
      setCachedAnalysis(key, result)
      const cached = getCachedAnalysis(key)!
      cached.summary.total = 999
      const cachedAgain = getCachedAnalysis(key)
      expect(cachedAgain!.summary.total).toBe(3)
    })

    it('命中缓存时附加 fromCache 标记', () => {
      const key = 'test-key-3'
      setCachedAnalysis(key, makeResult(2))
      const cached = getCachedAnalysis(key)!
      expect(cached.meta!.fromCache).toBe(true)
      expect(cached.meta!.cachedAt).toBeDefined()
      expect(cached.meta!.cacheHitCount).toBe(1)
      expect(cached.meta!.durationMs).toBe(0)
    })

    it('多次命中递增 hitCount', () => {
      const key = 'test-key-4'
      setCachedAnalysis(key, makeResult(1))
      getCachedAnalysis(key)
      const cached = getCachedAnalysis(key)
      expect(cached!.meta!.cacheHitCount).toBe(2)
    })

    it('mock 结果不写入缓存', () => {
      const key = 'test-key-mock'
      const mockResult = makeResult(1)
      mockResult.meta!.isMock = true
      setCachedAnalysis(key, mockResult)
      expect(getCachedAnalysis(key)).toBeNull()
    })
  })

  describe('shouldUseCache', () => {
    // shouldUseCache 依赖 AI_API_KEY 判断是否为 mock 模式，测试中需 stub
    beforeEach(() => {
      vi.stubEnv('AI_API_KEY', 'test-key')
    })
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('persist=true 时使用缓存', () => {
      expect(shouldUseCache({ persist: true })).toBe(true)
    })

    it('persist=false 时不使用缓存', () => {
      expect(shouldUseCache({ persist: false })).toBe(false)
    })

    it('无 options 时使用缓存', () => {
      expect(shouldUseCache()).toBe(true)
    })

    it('mock 模式（无 AI_API_KEY）时不使用缓存', () => {
      vi.stubEnv('AI_API_KEY', '')
      expect(shouldUseCache({ persist: true })).toBe(false)
    })
  })

  describe('getAnalysisCacheStats', () => {
    it('空缓存返回零统计', () => {
      const stats = getAnalysisCacheStats()
      expect(stats.totalEntries).toBe(0)
      expect(stats.entries).toEqual([])
    })

    it('写入后返回正确统计', () => {
      setCachedAnalysis('key-a', makeResult(3))
      setCachedAnalysis('key-b', makeResult(5))
      const stats = getAnalysisCacheStats()
      expect(stats.totalEntries).toBe(2)
      expect(stats.entries).toHaveLength(2)
    })
  })
})
