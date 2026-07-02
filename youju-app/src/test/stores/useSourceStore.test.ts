import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSourceStore } from '../../stores/useSourceStore'
import type { ScenarioType, Source, SourceType } from '../../types'

const mockSources: Source[] = [
  { id: 'source-1', type: 'chat', name: '来源1', content: '内容1' },
  { id: 'source-2', type: 'doc', name: '来源2', content: '内容2' },
]

describe('useSourceStore', () => {
  beforeEach(() => {
    useSourceStore.setState(useSourceStore.getInitialState())
  })

  afterEach(() => {
    useSourceStore.setState(useSourceStore.getInitialState())
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useSourceStore.getState()
      expect(state.sources).toEqual([])
      expect(state.selectedSourceId).toBeNull()
      expect(state.showAddSource).toBe(false)
      expect(state.addSourceTab).toBe('text')
      expect(state.newSourceType).toBe('chat')
      expect(state.newSourceName).toBe('')
      expect(state.newSourceContent).toBe('')
      expect(state.newSourceUrl).toBe('')
      expect(state.uploading).toBe(false)
      expect(state.deletingId).toBeNull()
      expect(state.fileDragOver).toBe(false)
      expect(state.ocrProgress).toBe('')
      expect(state.screenshotPreview).toBeNull()
      expect(state.currentScenario).toBeNull()
      expect(state.isDemo).toBe(false)
    })
  })

  describe('setter 方法', () => {
    it('setSources 应该正确设置来源列表', () => {
      useSourceStore.getState().setSources(mockSources)
      expect(useSourceStore.getState().sources).toEqual(mockSources)
    })

    it('setSources 空数组应该清空列表', () => {
      useSourceStore.getState().setSources(mockSources)
      useSourceStore.getState().setSources([])
      expect(useSourceStore.getState().sources).toEqual([])
    })

    it('addSource 应该添加来源', () => {
      useSourceStore.getState().addSource(mockSources[0])
      expect(useSourceStore.getState().sources.length).toBe(1)
      expect(useSourceStore.getState().sources[0]).toEqual(mockSources[0])
    })

    it('addSource 应该追加到列表末尾', () => {
      useSourceStore.getState().addSource(mockSources[0])
      useSourceStore.getState().addSource(mockSources[1])
      expect(useSourceStore.getState().sources[0].id).toBe('source-1')
      expect(useSourceStore.getState().sources[1].id).toBe('source-2')
    })

    it('removeSource 应该删除指定来源', () => {
      useSourceStore.getState().setSources(mockSources)
      useSourceStore.getState().removeSource('source-1')
      expect(useSourceStore.getState().sources.length).toBe(1)
      expect(useSourceStore.getState().sources[0].id).toBe('source-2')
    })

    it('removeSource 不存在的 id 不改变列表', () => {
      useSourceStore.getState().setSources(mockSources)
      useSourceStore.getState().removeSource('non-existent')
      expect(useSourceStore.getState().sources).toEqual(mockSources)
    })

    it('removeSource 空列表时不报错', () => {
      useSourceStore.getState().removeSource('source-1')
      expect(useSourceStore.getState().sources).toEqual([])
    })

    it('setSelectedSourceId 应该正确设置选中的来源 id', () => {
      useSourceStore.getState().setSelectedSourceId('source-1')
      expect(useSourceStore.getState().selectedSourceId).toBe('source-1')
      useSourceStore.getState().setSelectedSourceId(null)
      expect(useSourceStore.getState().selectedSourceId).toBeNull()
    })

    it('setShowAddSource 应该正确设置添加来源弹窗显示状态', () => {
      useSourceStore.getState().setShowAddSource(true)
      expect(useSourceStore.getState().showAddSource).toBe(true)
    })

    it('setAddSourceTab 应该正确设置添加来源标签页', () => {
      useSourceStore.getState().setAddSourceTab('file')
      expect(useSourceStore.getState().addSourceTab).toBe('file')
    })

    it('setNewSourceType 应该正确设置新来源类型', () => {
      const newType: SourceType = 'doc'
      useSourceStore.getState().setNewSourceType(newType)
      expect(useSourceStore.getState().newSourceType).toBe('doc')
    })

    it('setNewSourceName 应该正确设置新来源名称', () => {
      useSourceStore.getState().setNewSourceName('测试名称')
      expect(useSourceStore.getState().newSourceName).toBe('测试名称')
    })

    it('setNewSourceContent 应该正确设置新来源内容', () => {
      useSourceStore.getState().setNewSourceContent('测试内容')
      expect(useSourceStore.getState().newSourceContent).toBe('测试内容')
    })

    it('setNewSourceUrl 应该正确设置新来源 URL', () => {
      useSourceStore.getState().setNewSourceUrl('https://example.com')
      expect(useSourceStore.getState().newSourceUrl).toBe('https://example.com')
    })

    it('setUploading 应该正确设置上传状态', () => {
      useSourceStore.getState().setUploading(true)
      expect(useSourceStore.getState().uploading).toBe(true)
    })

    it('setDeletingId 应该正确设置删除中的 id', () => {
      useSourceStore.getState().setDeletingId('source-1')
      expect(useSourceStore.getState().deletingId).toBe('source-1')
      useSourceStore.getState().setDeletingId(null)
      expect(useSourceStore.getState().deletingId).toBeNull()
    })

    it('setFileDragOver 应该正确设置文件拖拽状态', () => {
      useSourceStore.getState().setFileDragOver(true)
      expect(useSourceStore.getState().fileDragOver).toBe(true)
    })

    it('setOcrProgress 应该正确设置 OCR 进度', () => {
      useSourceStore.getState().setOcrProgress('处理中 50%')
      expect(useSourceStore.getState().ocrProgress).toBe('处理中 50%')
    })

    it('setScreenshotPreview 应该正确设置截图预览', () => {
      useSourceStore.getState().setScreenshotPreview('data:image/png;base64,xxx')
      expect(useSourceStore.getState().screenshotPreview).toBe('data:image/png;base64,xxx')
      useSourceStore.getState().setScreenshotPreview(null)
      expect(useSourceStore.getState().screenshotPreview).toBeNull()
    })

    it('setCurrentScenario 应该正确设置当前场景', () => {
      const scenario: ScenarioType = 'contract'
      useSourceStore.getState().setCurrentScenario(scenario)
      expect(useSourceStore.getState().currentScenario).toBe('contract')
      useSourceStore.getState().setCurrentScenario(null)
      expect(useSourceStore.getState().currentScenario).toBeNull()
    })

    it('setIsDemo 应该正确设置演示模式', () => {
      useSourceStore.getState().setIsDemo(true)
      expect(useSourceStore.getState().isDemo).toBe(true)
    })
  })

  describe('resetNewSourceForm', () => {
    it('应该重置新来源表单字段', () => {
      useSourceStore.setState({
        newSourceName: '测试名称',
        newSourceContent: '测试内容',
        newSourceUrl: 'https://example.com',
      })

      useSourceStore.getState().resetNewSourceForm()

      const state = useSourceStore.getState()
      expect(state.newSourceName).toBe('')
      expect(state.newSourceContent).toBe('')
      expect(state.newSourceUrl).toBe('')
    })

    it('不应该重置其他状态', () => {
      useSourceStore.setState({
        newSourceName: '测试名称',
        newSourceContent: '测试内容',
        newSourceUrl: 'https://example.com',
        newSourceType: 'doc',
        addSourceTab: 'file',
        sources: mockSources,
      })

      useSourceStore.getState().resetNewSourceForm()

      const state = useSourceStore.getState()
      expect(state.newSourceType).toBe('doc')
      expect(state.addSourceTab).toBe('file')
      expect(state.sources).toEqual(mockSources)
    })
  })
})
