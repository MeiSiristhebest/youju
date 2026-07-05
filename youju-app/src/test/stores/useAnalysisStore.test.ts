import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IncrementalPrediction } from '../../algorithms/incrementalEngine'
import { useAnalysisStore } from '../../stores/useAnalysisStore'
import type { AnalyzeResult, ChecklistItem, Risk } from '../../types'

const mockChecklist: ChecklistItem[] = [
  { id: '1', text: '检查项1', hasDraft: false, checked: false },
  { id: '2', text: '检查项2', hasDraft: true, checked: true },
]

const mockRisk: Risk = {
  id: 'risk-1',
  level: 'critical',
  type: '合规风险',
  title: '测试风险',
  description: '风险描述',
  sources: ['source-1'],
}

const mockResult: AnalyzeResult = {
  summary: { critical: 1, warning: 2, info: 3, total: 6 },
  risks: [mockRisk],
  checklist: mockChecklist,
  alignedVersion: 'v1.0',
  meta: {
    durationMs: 1000,
    isMock: false,
    sourceCount: 2,
    sourceIds: ['source-1', 'source-2'],
  },
}

const mockIncrementalPrediction: IncrementalPrediction = {
  predictedRisks: [],
  confidence: 0.8,
  status: 'predicting',
} as any

describe('useAnalysisStore', () => {
  beforeEach(() => {
    useAnalysisStore.setState(useAnalysisStore.getInitialState())
  })

  afterEach(() => {
    useAnalysisStore.setState(useAnalysisStore.getInitialState())
    vi.useRealTimers()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useAnalysisStore.getState()
      expect(state.result).toBeNull()
      expect(state.analyzing).toBe(false)
      expect(state.analysisStep).toBe(0)
      expect(state.activeTab).toBe('overview')
      expect(state.highlightedRisk).toBeNull()
      expect(state.highlightedEvidence).toBeNull()
      expect(state.checklist).toEqual([])
      expect(state.showDraft).toBe(false)
      expect(state.draftText).toBe('')
      expect(state.generatingDraft).toBe(false)
      expect(state.selectedRisk).toBeNull()
      expect(state.showDebug).toBe(false)
      expect(state.debugTab).toBe('info')
      expect(state.riskFeedback).toEqual({})
      expect(state.streaming).toBe(false)
      expect(state.streamProgress).toBe(0)
      expect(state.streamError).toBeNull()
      expect(state.incrementalPrediction).toBeNull()
      expect(state.cacheHit).toBe(false)
      expect(state.lastAnalysisDuration).toBe(0)
      expect(state.analysisCache).toEqual([])
    })
  })

  describe('setter 方法', () => {
    it('setResult 应该正确设置结果', () => {
      useAnalysisStore.getState().setResult(mockResult)
      expect(useAnalysisStore.getState().result).toEqual(mockResult)
    })

    it('setResult 应该支持设置为 null', () => {
      useAnalysisStore.getState().setResult(mockResult)
      useAnalysisStore.getState().setResult(null)
      expect(useAnalysisStore.getState().result).toBeNull()
    })

    it('setAnalyzing 应该正确设置分析状态', () => {
      useAnalysisStore.getState().setAnalyzing(true)
      expect(useAnalysisStore.getState().analyzing).toBe(true)
      useAnalysisStore.getState().setAnalyzing(false)
      expect(useAnalysisStore.getState().analyzing).toBe(false)
    })

    it('setAnalysisStep 应该正确设置分析步骤', () => {
      useAnalysisStore.getState().setAnalysisStep(5)
      expect(useAnalysisStore.getState().analysisStep).toBe(5)
    })

    it('setActiveTab 应该正确设置活动标签页', () => {
      useAnalysisStore.getState().setActiveTab('checklist')
      expect(useAnalysisStore.getState().activeTab).toBe('checklist')
    })

    it('setHighlightedRisk 应该正确设置高亮风险', () => {
      useAnalysisStore.getState().setHighlightedRisk('risk-1')
      expect(useAnalysisStore.getState().highlightedRisk).toBe('risk-1')
      useAnalysisStore.getState().setHighlightedRisk(null)
      expect(useAnalysisStore.getState().highlightedRisk).toBeNull()
    })

    it('setHighlightedEvidence 应该正确设置高亮证据', () => {
      const ev = { sourceId: 'source-1', quote: '测试引用' }
      useAnalysisStore.getState().setHighlightedEvidence(ev)
      expect(useAnalysisStore.getState().highlightedEvidence).toEqual(ev)
      useAnalysisStore.getState().setHighlightedEvidence(null)
      expect(useAnalysisStore.getState().highlightedEvidence).toBeNull()
    })

    it('setChecklist 应该正确设置检查清单', () => {
      useAnalysisStore.getState().setChecklist(mockChecklist)
      expect(useAnalysisStore.getState().checklist).toEqual(mockChecklist)
    })

    it('setShowDraft 应该正确设置草稿显示状态', () => {
      useAnalysisStore.getState().setShowDraft(true)
      expect(useAnalysisStore.getState().showDraft).toBe(true)
    })

    it('setDraftText 应该正确设置草稿文本', () => {
      useAnalysisStore.getState().setDraftText('测试草稿')
      expect(useAnalysisStore.getState().draftText).toBe('测试草稿')
    })

    it('setGeneratingDraft 应该正确设置生成草稿状态', () => {
      useAnalysisStore.getState().setGeneratingDraft(true)
      expect(useAnalysisStore.getState().generatingDraft).toBe(true)
    })

    it('setSelectedRisk 应该正确设置选中的风险', () => {
      useAnalysisStore.getState().setSelectedRisk(mockRisk)
      expect(useAnalysisStore.getState().selectedRisk).toEqual(mockRisk)
      useAnalysisStore.getState().setSelectedRisk(null)
      expect(useAnalysisStore.getState().selectedRisk).toBeNull()
    })

    it('setShowDebug 应该正确设置调试显示状态', () => {
      useAnalysisStore.getState().setShowDebug(true)
      expect(useAnalysisStore.getState().showDebug).toBe(true)
    })

    it('setDebugTab 应该正确设置调试标签页', () => {
      useAnalysisStore.getState().setDebugTab('stats')
      expect(useAnalysisStore.getState().debugTab).toBe('stats')
    })

    it('setRiskFeedback 应该正确设置风险反馈', () => {
      useAnalysisStore.getState().setRiskFeedback('risk-1', 'accurate')
      expect(useAnalysisStore.getState().riskFeedback['risk-1']).toBe('accurate')

      useAnalysisStore.getState().setRiskFeedback('risk-1', 'inaccurate')
      expect(useAnalysisStore.getState().riskFeedback['risk-1']).toBe('inaccurate')

      useAnalysisStore.getState().setRiskFeedback('risk-2', 'accurate')
      expect(Object.keys(useAnalysisStore.getState().riskFeedback).length).toBe(2)
    })

    it('setStreaming 应该正确设置流式状态', () => {
      useAnalysisStore.getState().setStreaming(true)
      expect(useAnalysisStore.getState().streaming).toBe(true)
    })

    it('setStreamProgress 应该正确设置流式进度', () => {
      useAnalysisStore.getState().setStreamProgress(50)
      expect(useAnalysisStore.getState().streamProgress).toBe(50)
    })

    it('setStreamError 应该正确设置流式错误', () => {
      useAnalysisStore.getState().setStreamError('测试错误')
      expect(useAnalysisStore.getState().streamError).toBe('测试错误')
      useAnalysisStore.getState().setStreamError(null)
      expect(useAnalysisStore.getState().streamError).toBeNull()
    })

    it('setIncrementalPrediction 应该正确设置增量预测', () => {
      useAnalysisStore.getState().setIncrementalPrediction(mockIncrementalPrediction)
      expect(useAnalysisStore.getState().incrementalPrediction).toEqual(mockIncrementalPrediction)
    })

    it('setCacheHit 应该正确设置缓存命中状态', () => {
      useAnalysisStore.getState().setCacheHit(true)
      expect(useAnalysisStore.getState().cacheHit).toBe(true)
    })

    it('setLastAnalysisDuration 应该正确设置上次分析时长', () => {
      useAnalysisStore.getState().setLastAnalysisDuration(2000)
      expect(useAnalysisStore.getState().lastAnalysisDuration).toBe(2000)
    })
  })

  describe('toggleCheckItem', () => {
    it('应该切换检查项的选中状态', () => {
      useAnalysisStore.getState().setChecklist(mockChecklist)
      useAnalysisStore.getState().toggleCheckItem('1')
      const checklist = useAnalysisStore.getState().checklist
      expect(checklist.find((c) => c.id === '1')?.checked).toBe(true)
      expect(checklist.find((c) => c.id === '2')?.checked).toBe(true)
    })

    it('应该切换已选中的检查项为未选中', () => {
      useAnalysisStore.getState().setChecklist(mockChecklist)
      useAnalysisStore.getState().toggleCheckItem('2')
      const checklist = useAnalysisStore.getState().checklist
      expect(checklist.find((c) => c.id === '2')?.checked).toBe(false)
    })

    it('当检查项不存在时不改变列表', () => {
      useAnalysisStore.getState().setChecklist(mockChecklist)
      useAnalysisStore.getState().toggleCheckItem('non-existent')
      expect(useAnalysisStore.getState().checklist).toEqual(mockChecklist)
    })

    it('空检查清单时不报错', () => {
      useAnalysisStore.getState().toggleCheckItem('1')
      expect(useAnalysisStore.getState().checklist).toEqual([])
    })
  })

  describe('缓存功能', () => {
    it('setCache 应该添加缓存条目', () => {
      useAnalysisStore.getState().setCache('key-1', mockResult)
      expect(useAnalysisStore.getState().analysisCache.length).toBe(1)
      expect(useAnalysisStore.getState().analysisCache[0].key).toBe('key-1')
      expect(useAnalysisStore.getState().analysisCache[0].result).toEqual(mockResult)
    })

    it('setCache 相同 key 应该覆盖旧缓存', () => {
      const result1 = { ...mockResult, summary: { ...mockResult.summary, total: 10 } }
      const result2 = { ...mockResult, summary: { ...mockResult.summary, total: 20 } }
      useAnalysisStore.getState().setCache('key-1', result1)
      useAnalysisStore.getState().setCache('key-1', result2)
      expect(useAnalysisStore.getState().analysisCache.length).toBe(1)
      expect(useAnalysisStore.getState().analysisCache[0].result.summary.total).toBe(20)
    })

    it('setCache 最多保留 10 条缓存', () => {
      for (let i = 0; i < 12; i++) {
        useAnalysisStore.getState().setCache(`key-${i}`, mockResult)
      }
      expect(useAnalysisStore.getState().analysisCache.length).toBe(10)
      expect(useAnalysisStore.getState().analysisCache[0].key).toBe('key-11')
      expect(useAnalysisStore.getState().analysisCache[9].key).toBe('key-2')
    })

    it('getCache 应该返回存在的缓存', () => {
      useAnalysisStore.getState().setCache('key-1', mockResult)
      const result = useAnalysisStore.getState().getCache('key-1')
      expect(result).toEqual(mockResult)
    })

    it('getCache 不存在的 key 返回 undefined', () => {
      const result = useAnalysisStore.getState().getCache('non-existent')
      expect(result).toBeUndefined()
    })

    it('getCache 过期缓存返回 undefined 并移除', () => {
      vi.useFakeTimers()
      useAnalysisStore.getState().setCache('key-1', mockResult)
      vi.advanceTimersByTime(31 * 60 * 1000)
      const result = useAnalysisStore.getState().getCache('key-1')
      expect(result).toBeUndefined()
      expect(useAnalysisStore.getState().analysisCache.length).toBe(0)
    })

    it('getCache 未过期缓存正常返回', () => {
      vi.useFakeTimers()
      useAnalysisStore.getState().setCache('key-1', mockResult)
      vi.advanceTimersByTime(29 * 60 * 1000)
      const result = useAnalysisStore.getState().getCache('key-1')
      expect(result).toEqual(mockResult)
    })

    it('clearCache 应该清空所有缓存', () => {
      useAnalysisStore.getState().setCache('key-1', mockResult)
      useAnalysisStore.getState().setCache('key-2', mockResult)
      useAnalysisStore.getState().clearCache()
      expect(useAnalysisStore.getState().analysisCache).toEqual([])
    })

    it('setCache 应该正确提取 sourceIds', () => {
      useAnalysisStore.getState().setCache('key-1', mockResult)
      expect(useAnalysisStore.getState().analysisCache[0].sourceIds).toEqual([
        'source-1',
        'source-2',
      ])
    })

    it('setCache meta 不存在时 sourceIds 为空数组', () => {
      const resultWithoutMeta = { ...mockResult, meta: undefined }
      useAnalysisStore.getState().setCache('key-1', resultWithoutMeta as any)
      expect(useAnalysisStore.getState().analysisCache[0].sourceIds).toEqual([])
    })
  })

  describe('resetAnalysis', () => {
    it('应该重置分析相关状态', () => {
      useAnalysisStore.setState({
        result: mockResult,
        analyzing: true,
        analysisStep: 5,
        checklist: mockChecklist,
        selectedRisk: mockRisk,
        streaming: true,
        streamProgress: 50,
        streamError: 'error',
        incrementalPrediction: mockIncrementalPrediction,
        cacheHit: true,
        lastAnalysisDuration: 1000,
      })

      useAnalysisStore.getState().resetAnalysis()

      const state = useAnalysisStore.getState()
      expect(state.result).toBeNull()
      expect(state.analyzing).toBe(false)
      expect(state.analysisStep).toBe(0)
      expect(state.checklist).toEqual([])
      expect(state.selectedRisk).toBeNull()
      expect(state.streaming).toBe(false)
      expect(state.streamProgress).toBe(0)
      expect(state.streamError).toBeNull()
      expect(state.incrementalPrediction).toBeNull()
      expect(state.cacheHit).toBe(false)
      expect(state.lastAnalysisDuration).toBe(0)
    })

    it('不应该重置 UI 相关状态', () => {
      useAnalysisStore.setState({
        activeTab: 'checklist',
        showDraft: true,
        draftText: 'test',
        showDebug: true,
        debugTab: 'stats',
        riskFeedback: { 'risk-1': 'accurate' },
        analysisCache: [{ key: 'key-1', result: mockResult, timestamp: Date.now(), sourceIds: [] }],
      })

      useAnalysisStore.getState().resetAnalysis()

      const state = useAnalysisStore.getState()
      expect(state.activeTab).toBe('checklist')
      expect(state.showDraft).toBe(true)
      expect(state.draftText).toBe('test')
      expect(state.showDebug).toBe(true)
      expect(state.debugTab).toBe('stats')
      expect(state.riskFeedback).toEqual({ 'risk-1': 'accurate' })
      expect(state.analysisCache.length).toBe(1)
    })
  })
})
