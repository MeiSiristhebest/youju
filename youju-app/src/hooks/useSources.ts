import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fileParser } from '../algorithms/fileParser'
import { sourceApi } from '../services/sourceApi'
import { useAnalysisStore, useSourceStore } from '../stores'
import type { ParsedSource, ScenarioType, SourceType } from '../types'

export interface ParseProgress {
  status: 'idle' | 'detecting' | 'parsing' | 'completed' | 'error'
  message: string
  percentage: number
}

export const useSources = () => {
  const queryClient = useQueryClient()
  const {
    sources,
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
    isDemo,
    setSources: setSourcesStore,
    setSelectedSourceId,
    setShowAddSource,
    setAddSourceTab,
    setNewSourceType,
    setNewSourceName,
    setNewSourceContent,
    setNewSourceUrl,
    setUploading,
    setDeletingId,
    setFileDragOver,
    setOcrProgress,
    setScreenshotPreview,
    setCurrentScenario,
    setIsDemo,
    resetNewSourceForm,
  } = useSourceStore()
  const { resetAnalysis } = useAnalysisStore()

  const sourcesQuery = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      try {
        const fetchedSources = await sourceApi.listSources()
        setSourcesStore(fetchedSources)
        return fetchedSources
      } catch {
        return []
      }
    },
    enabled: !isDemo,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const addTextSourceMutation = useMutation({
    mutationFn: (params: { type: SourceType; name: string; content: string }) =>
      sourceApi.addTextSource(params),
    onMutate: () => {
      setUploading(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      setShowAddSource(false)
      resetNewSourceForm()
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const uploadFileMutation = useMutation({
    mutationFn: (params: { file: File; type: SourceType; name?: string }) =>
      sourceApi.uploadFile(params.file, params.type, params.name),
    onMutate: () => {
      setUploading(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      setShowAddSource(false)
      resetNewSourceForm()
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const addUrlSourceMutation = useMutation({
    mutationFn: (params: { url: string; type: SourceType; name?: string }) =>
      sourceApi.addUrlSource(params),
    onMutate: () => {
      setUploading(true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
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
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      resetAnalysis()
    },
    onSettled: () => {
      setDeletingId(null)
    },
  })

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

  const loadScenario = async (scenarioId: ScenarioType) => {
    setCurrentScenario(scenarioId)
    resetAnalysis()

    try {
      await sourceApi.initScenario(scenarioId)
      queryClient.invalidateQueries({ queryKey: ['sources'] })
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
    addTextSource: addTextSourceMutation.mutate,
    uploadFile: uploadFileMutation.mutate,
    addUrlSource: addUrlSourceMutation.mutate,
    deleteSource: deleteSourceMutation.mutate,
    parseFile: parseFileMutation.mutate,
    parseUrl: parseUrlMutation.mutate,
    parseFileWithProgress,
    parseUrlWithProgress,
    parseFileLoading: parseFileMutation.isPending,
    parseUrlLoading: parseUrlMutation.isPending,
    loadScenario,
    refetchSources: sourcesQuery.refetch,
  }
}
