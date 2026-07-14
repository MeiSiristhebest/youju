import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fileParser } from '../algorithms/fileParser'
import { useToast } from '../components/common/Toast'
import { DEMO_SOURCES } from '../constants/demoData'
import { isDemoScenario } from '../services/demoAnalysisStream'
import { analyzeIntent } from '../services/intentAnalysis'
import { sourceApi } from '../services/sourceApi'
import { useAnalysisStore, useSourceStore } from '../stores'
import { useWorkspaceTabsStore } from '../stores/useWorkspaceTabsStore'
import type { ParsedSource, ScenarioType, Source, SourceType } from '../types'
import { useUndoableAction } from './useUndoableAction'

export interface ParseProgress {
  status: 'idle' | 'detecting' | 'parsing' | 'completed' | 'error'
  message: string
  percentage: number
}

export const useSources = () => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // 细粒度 Zustand Selector：每个字段独立订阅，避免任意字段变化引发整体重渲
  const sources = useSourceStore((s) => s.sources)
  const selectedSourceId = useSourceStore((s) => s.selectedSourceId)
  const showAddSource = useSourceStore((s) => s.showAddSource)
  const addSourceTab = useSourceStore((s) => s.addSourceTab)
  const newSourceType = useSourceStore((s) => s.newSourceType)
  const newSourceName = useSourceStore((s) => s.newSourceName)
  const newSourceContent = useSourceStore((s) => s.newSourceContent)
  const newSourceUrl = useSourceStore((s) => s.newSourceUrl)
  const uploading = useSourceStore((s) => s.uploading)
  const deletingId = useSourceStore((s) => s.deletingId)
  const fileDragOver = useSourceStore((s) => s.fileDragOver)
  const ocrProgress = useSourceStore((s) => s.ocrProgress)
  const screenshotPreview = useSourceStore((s) => s.screenshotPreview)
  const currentScenario = useSourceStore((s) => s.currentScenario)
  const isDemo = useSourceStore((s) => s.isDemo)
  const editingSourceId = useSourceStore((s) => s.editingSourceId)
  const currentTaskId = useSourceStore((s) => s.currentTaskId)

  // Actions（引用稳定，不会引发重渲染）
  const setSourcesStore = useSourceStore((s) => s.setSources)
  const setSelectedSourceId = useSourceStore((s) => s.setSelectedSourceId)
  const setShowAddSource = useSourceStore((s) => s.setShowAddSource)
  const setAddSourceTab = useSourceStore((s) => s.setAddSourceTab)
  const setNewSourceType = useSourceStore((s) => s.setNewSourceType)
  const setNewSourceName = useSourceStore((s) => s.setNewSourceName)
  const setNewSourceContent = useSourceStore((s) => s.setNewSourceContent)
  const setNewSourceUrl = useSourceStore((s) => s.setNewSourceUrl)
  const setUploading = useSourceStore((s) => s.setUploading)
  const setDeletingId = useSourceStore((s) => s.setDeletingId)
  const setFileDragOver = useSourceStore((s) => s.setFileDragOver)
  const setOcrProgress = useSourceStore((s) => s.setOcrProgress)
  const setScreenshotPreview = useSourceStore((s) => s.setScreenshotPreview)
  const setCurrentScenario = useSourceStore((s) => s.setCurrentScenario)
  const _setIsDemo = useSourceStore((s) => s.setIsDemo)
  const updateSource = useSourceStore((s) => s.updateSource)
  const updateSourceStatus = useSourceStore((s) => s.updateSourceStatus)
  const updateSourceSummary = useSourceStore((s) => s.updateSourceSummary)
  const setEditingSourceId = useSourceStore((s) => s.setEditingSourceId)
  const resetNewSourceForm = useSourceStore((s) => s.resetNewSourceForm)

  const resetAnalysis = useAnalysisStore((s) => s.resetAnalysis)

  const intentAnalysis = useSourceStore((s) => s.intentAnalysis)
  const setAnalyzingIntent = useSourceStore((s) => s.setAnalyzingIntent)
  const setIntentAnalysis = useSourceStore((s) => s.setIntentAnalysis)
  const setScenarioDescription = useSourceStore((s) => s.setScenarioDescription)
  const currentTaskTitle = useSourceStore((s) => s.currentTaskTitle)
  const setCurrentTaskTitle = useSourceStore((s) => s.setCurrentTaskTitle)

  useEffect(() => {
    if (sources.length === 0) return

    const hasNewContent = sources.some((s) => {
      const createdAt = s.createdAt
      if (typeof createdAt === 'number') {
        return createdAt > Date.now() - 60000
      }
      if (typeof createdAt === 'string') {
        const parsed = Date.parse(createdAt)
        return !isNaN(parsed) && parsed > Date.now() - 60000
      }
      return false
    })

    if (!hasNewContent && intentAnalysis) return

    const autoAnalyzeIntent = async () => {
      if (sources.length === 0) return

      setAnalyzingIntent(true)
      setIntentAnalysis(null)

      try {
        const allContent = sources.map((s) => `${s.name}: ${s.content.slice(0, 500)}`).join('\n\n')
        const result = await analyzeIntent(allContent)
        setIntentAnalysis(result)
        setScenarioDescription(allContent)

        // 更新标签页名称为识别的场景（置信度>=40%时）
        if (result.scenarioType && result.confidence >= 0.4) {
          const activeTabId = useWorkspaceTabsStore.getState().activeTabId
          if (activeTabId) {
            useWorkspaceTabsStore.getState().renameTab(activeTabId, result.scenarioType)
          }
        }

        if (!currentTaskTitle || currentTaskTitle === '未命名分析') {
          const newTitle = result.scenarioType || '未命名分析'
          setCurrentTaskTitle(newTitle)
        }
      } catch (error) {
        console.error('Auto intent analysis failed:', error)
      } finally {
        setAnalyzingIntent(false)
      }
    }

    const debounceTimer = setTimeout(autoAnalyzeIntent, 500)
    return () => clearTimeout(debounceTimer)
  }, [sources.length, sources.map((s) => s.id).join(',')])

  const sourcesQuery = useQuery({
    queryKey: ['sources', currentTaskId],
    queryFn: async () => {
      try {
        const fetchedSources = await sourceApi.listSources(currentTaskId ?? undefined)
        setSourcesStore(fetchedSources)
        return fetchedSources
      } catch {
        return []
      }
    },
    enabled: !isDemo && !!currentTaskId,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const addTextSourceMutation = useMutation({
    mutationFn: (params: { type: SourceType; name: string; content: string }) =>
      sourceApi.addTextSource({ ...params, taskId: currentTaskId ?? undefined }),
    onMutate: () => {
      setUploading(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', currentTaskId] })
      setShowAddSource(false)
      resetNewSourceForm()
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const uploadFileMutation = useMutation({
    mutationFn: (params: { file: File; type: SourceType; name?: string }) =>
      sourceApi.uploadFile(params.file, params.type, params.name, currentTaskId ?? undefined),
    onMutate: () => {
      setUploading(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', currentTaskId] })
      setShowAddSource(false)
      resetNewSourceForm()
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const addUrlSourceMutation = useMutation({
    mutationFn: (params: { url: string; type: SourceType; name?: string }) =>
      sourceApi.addUrlSource({ ...params, taskId: currentTaskId ?? undefined }),
    onMutate: () => {
      setUploading(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', currentTaskId] })
      setShowAddSource(false)
      resetNewSourceForm()
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const deleteSourceMutation = useMutation({
    mutationFn: (id: string) => sourceApi.deleteSource(id),
    onMutate: (id) => {
      setDeletingId(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', currentTaskId] })
      resetAnalysis()
    },
    onSettled: () => {
      setDeletingId(null)
    },
  })

  const { execute: executeDeleteSource } = useUndoableAction<Source>({
    action: async (source) => {
      try {
        await deleteSourceMutation.mutateAsync(source.id)
      } catch (error) {
        console.error('Failed to delete source:', error)
      }
    },
    undo: (source) => {
      const addSource = useSourceStore.getState().addSource
      addSource(source)
      queryClient.setQueryData<Source[]>(['sources', currentTaskId], (prev) => {
        if (!prev) return [source]
        return [...prev, source]
      })
    },
    message: '材料已删除，5秒内可撤销',
    undoLabel: '撤销',
    duration: 5,
  })

  const handleDeleteSource = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId)
    if (!source) return

    const removeSource = useSourceStore.getState().removeSource
    removeSource(sourceId)

    queryClient.setQueryData<Source[]>(['sources', currentTaskId], (prev) => {
      if (!prev) return []
      return prev.filter((s) => s.id !== sourceId)
    })

    if (selectedSourceId === sourceId) {
      setSelectedSourceId(null)
    }

    executeDeleteSource(source)
  }

  const parseFileMutation = useMutation({
    mutationFn: (file: File) => fileParser.parseFile(file),
    onMutate: () => {
      setUploading(true)
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const parseUrlMutation = useMutation({
    mutationFn: (url: string) => sourceApi.parseUrl(url),
    onMutate: () => {
      setUploading(true)
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const initScenarioMutation = useMutation({
    mutationFn: (scenarioId: ScenarioType) => sourceApi.initScenario(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources', currentTaskId] })
    },
    onError: () => {
      showToast('场景初始化失败，请重试', 'error')
    },
  })

  const loadScenario = async (scenarioId: ScenarioType) => {
    setCurrentScenario(scenarioId)
    resetAnalysis()

    if (isDemoScenario(scenarioId)) {
      const demoSources = DEMO_SOURCES[scenarioId as keyof typeof DEMO_SOURCES] || []
      useSourceStore.getState().setIsDemo(true)

      const currentTaskId = useSourceStore.getState().currentTaskId
      if (currentTaskId) {
        const savedSources: Source[] = []
        for (const demoSource of demoSources) {
          try {
            const saved = await sourceApi.addTextSource({
              type: demoSource.type as SourceType,
              name: demoSource.name,
              content: demoSource.content,
              taskId: currentTaskId,
            })
            savedSources.push(saved)
          } catch (e) {
            console.error('Failed to save demo source:', e)
            savedSources.push(demoSource)
          }
        }
        setSourcesStore(savedSources)
      } else {
        setSourcesStore([...demoSources])
      }
      return
    }

    try {
      useSourceStore.getState().setIsDemo(false)
      await initScenarioMutation.mutateAsync(scenarioId)
    } catch (e) {
      console.error('Failed to init scenario:', e)
    }
  }

  const parseFileWithProgress = async (
    file: File,
    onProgress: (progress: ParseProgress) => void,
  ): Promise<ParsedSource | null> => {
    try {
      onProgress({ status: 'detecting', message: '正在检测文件类型…', percentage: 10 })

      const fileType = fileParser.detectFileType(file)
      const fileTypeLabel = fileParser.getFileTypeLabel(fileType)
      const needsBackend = fileParser.needsBackend(fileType)

      onProgress({
        status: 'parsing',
        message: needsBackend ? `正在通过后端解析 ${fileTypeLabel}…` : `正在解析 ${fileTypeLabel}…`,
        percentage: 30,
      })

      const result = await fileParser.parseFile(file)

      onProgress({
        status: 'completed',
        message: `解析完成（${result.meta.charCount} 字符，${result.meta.lineCount} 行）`,
        percentage: 100,
      })

      return result
    } catch (error) {
      onProgress({
        status: 'error',
        message: error instanceof Error ? error.message : '文件解析失败',
        percentage: 0,
      })
      return null
    }
  }

  const parseUrlWithProgress = async (
    url: string,
    onProgress: (progress: ParseProgress) => void,
  ): Promise<string | null> => {
    try {
      onProgress({ status: 'parsing', message: '正在抓取网页内容…', percentage: 30 })

      const result = await sourceApi.parseUrl(url)

      if (!result.success || !result.text) {
        onProgress({
          status: 'error',
          message: result.error || '网页抓取失败',
          percentage: 0,
        })
        return null
      }

      onProgress({
        status: 'completed',
        message: `抓取完成（${result.meta?.charCount || 0} 字符）`,
        percentage: 100,
      })

      return result.text
    } catch (error) {
      onProgress({
        status: 'error',
        message: error instanceof Error ? error.message : '网页抓取失败',
        percentage: 0,
      })
      return null
    }
  }

  const reparseSource = async (sourceId: string) => {
    updateSourceStatus(sourceId, 'parsing', 10)

    const source = sources.find((s) => s.id === sourceId)
    if (!source) return

    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      updateSourceStatus(sourceId, 'parsing', 50)

      await new Promise((resolve) => setTimeout(resolve, 800))
      updateSourceStatus(sourceId, 'parsing', 80)

      await new Promise((resolve) => setTimeout(resolve, 500))
      updateSourceStatus(sourceId, 'ready', 100)

      resetAnalysis()
    } catch (_error) {
      updateSourceStatus(sourceId, 'error', 0)
    }
  }

  return {
    sources,
    sourcesLoading: sourcesQuery.isLoading,
    selectedSourceId,
    showAddSource,
    addSourceTab,
    newSourceType,
    newSourceName,
    newSourceContent,
    newSourceUrl,
    uploading,
    deletingId,
    fileDragOver,
    ocrProgress,
    screenshotPreview,
    currentScenario,
    editingSourceId,
    setSelectedSourceId,
    setShowAddSource,
    setAddSourceTab,
    setNewSourceType,
    setNewSourceName,
    setNewSourceContent,
    setNewSourceUrl,
    setFileDragOver,
    setOcrProgress,
    setScreenshotPreview,
    setEditingSourceId,
    updateSource,
    updateSourceStatus,
    updateSourceSummary,
    addTextSource: addTextSourceMutation.mutate,
    uploadFile: uploadFileMutation.mutate,
    addUrlSource: addUrlSourceMutation.mutate,
    deleteSource: handleDeleteSource,
    parseFile: parseFileMutation.mutate,
    parseUrl: parseUrlMutation.mutate,
    parseFileWithProgress,
    parseUrlWithProgress,
    parseFileLoading: parseFileMutation.isPending,
    parseUrlLoading: parseUrlMutation.isPending,
    reparseSource,
    loadScenario,
    initScenario: initScenarioMutation.mutate,
    initScenarioAsync: initScenarioMutation.mutateAsync,
    isInitScenario: initScenarioMutation.isPending,
    refetchSources: sourcesQuery.refetch,
  }
}
