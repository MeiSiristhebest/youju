import { useQueryClient } from '@tanstack/react-query'
import type { DragEvent } from 'react'
import { useMemo } from 'react'
import { useToast } from '../components/common/Toast'
import type { PrintStyle } from '../components/print/PrintReport'
import { DEMO_RESULTS, DEMO_SOURCES } from '../constants/demoData'
import { SCENARIOS } from '../constants/workspace'
import { useAnalysis } from '../hooks/useAnalysis'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useShareUtils } from '../hooks/useShare'
import { useSources } from '../hooks/useSources'
import { useTasks } from '../hooks/useTasks'
import { createSnapshotFromResult, historyStorage } from '../lib/history'
import { isDemoScenario } from '../services/demoAnalysisStream'
import { sourceApi } from '../services/sourceApi'
import { taskApi } from '../services/taskApi'
import {
  useAnalysisStore,
  useChatStore,
  useSourceStore,
  useTaskStore,
  useUIPreferenceStore,
  useWorkspaceTabsStore,
} from '../stores'
import type {
  AnalyzeResult,
  ChecklistItem,
  HistorySnapshot,
  Risk,
  RiskType,
  ScenarioType,
  SharePermission,
  Source,
  TaskRecord,
} from '../types'

interface UseWorkspaceHandlersParams {
  mobileSidebarOpen: boolean
  mobileContextOpen: boolean
  showTour: boolean
  showDiff: boolean
  diffSnapshotA: HistorySnapshot | null
  diffSnapshotB: HistorySnapshot | null
  showHistoryDetail: boolean
  detailSnapshot: HistorySnapshot | null
  showExportMenu: boolean
  printStyle: PrintStyle
  sourceDetailModalSource: Source | null
  sourceDetailModalHighlight: string
  riskDetailModalOpen: boolean
  droppedFiles: File[]
  sourcePanelWidth: number
  contextPanelWidth: number
  sourcePanelCollapsed: boolean
  contextPanelCollapsed: boolean
  sidebarCollapsed: boolean
  showModelSettings: boolean
  showNotifications: boolean
  showGlobalSearch: boolean
  showBilling: boolean
  showTeamPanel: boolean
  showTemplateMarket: boolean
  showApiSettings: boolean
  showTaskSwitcher: boolean
  setMobileSidebarOpen: (open: boolean) => void
  setMobileContextOpen: (open: boolean) => void
  setShowTour: (show: boolean) => void
  setShowDiff: (show: boolean) => void
  setDiffSnapshotA: (snapshot: HistorySnapshot | null) => void
  setDiffSnapshotB: (snapshot: HistorySnapshot | null) => void
  setShowHistoryDetail: (show: boolean) => void
  setDetailSnapshot: (snapshot: HistorySnapshot | null) => void
  setShowExportMenu: (show: boolean) => void
  setPrintStyle: (style: PrintStyle) => void
  setSourceDetailModalSource: (source: Source | null) => void
  setSourceDetailModalHighlight: (highlight: string) => void
  setRiskDetailModalOpen: (open: boolean) => void
  setDroppedFiles: (files: File[]) => void
  setSourcePanelWidth: (width: number) => void
  setContextPanelWidth: (width: number) => void
  setSourcePanelCollapsed: (collapsed: boolean) => void
  setContextPanelCollapsed: (collapsed: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setShowModelSettings: (show: boolean) => void
  setShowNotifications: (show: boolean) => void
  setShowGlobalSearch: (show: boolean) => void
  setShowBilling: (show: boolean) => void
  setShowTeamPanel: (show: boolean) => void
  setShowTemplateMarket: (show: boolean) => void
  setShowApiSettings: (show: boolean) => void
  setShowTaskSwitcher: (show: boolean) => void
}

export function useWorkspaceHandlers(params: UseWorkspaceHandlersParams) {
  const {
    mobileSidebarOpen,
    mobileContextOpen,
    showTour,
    showDiff,
    diffSnapshotA,
    diffSnapshotB,
    showHistoryDetail,
    detailSnapshot,
    showExportMenu,
    printStyle,
    sourceDetailModalSource,
    sourceDetailModalHighlight,
    riskDetailModalOpen,
    droppedFiles,
    sourcePanelWidth,
    contextPanelWidth,
    sourcePanelCollapsed,
    contextPanelCollapsed,
    sidebarCollapsed,
    showModelSettings,
    showNotifications,
    showGlobalSearch,
    showBilling,
    showTeamPanel,
    showTemplateMarket,
    showApiSettings,
    showTaskSwitcher,
    setMobileSidebarOpen,
    setMobileContextOpen,
    setShowTour,
    setShowDiff,
    setDiffSnapshotA,
    setDiffSnapshotB,
    setShowHistoryDetail,
    setDetailSnapshot,
    setShowExportMenu,
    setPrintStyle,
    setSourceDetailModalSource,
    setSourceDetailModalHighlight,
    setRiskDetailModalOpen,
    setDroppedFiles,
    setSourcePanelWidth,
    setContextPanelWidth,
    setSourcePanelCollapsed,
    setContextPanelCollapsed,
    setSidebarCollapsed,
    setShowModelSettings,
    setShowNotifications,
    setShowGlobalSearch,
    setShowBilling,
    setShowTeamPanel,
    setShowTemplateMarket,
    setShowApiSettings,
    setShowTaskSwitcher,
  } = params

  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const {
    sources,
    selectedSourceId,
    showAddSource,
    currentScenario,
    setSelectedSourceId,
    setShowAddSource,
    deleteSource: _deleteSource,
    refetchSources,
    reparseSource,
  } = useSources()

  const {
    result,
    analyzing,
    selectedRisk,
    pendingRisks,
    totalUnresolved,
    analyze,
    analyzeFull,
    submitFeedback,
    cancelAnalysis,
    setSelectedRisk,
    getRiskStatus,
    resetAnalysis,
    riskFeedback,
    generateDraft,
    setRiskStatus,
    getRiskNotes,
    setRiskNotes,
    toggleCheckItem,
    checklist,
    showDraft: _showDraft,
    draftText: _draftText,
    generatingDraft: _generatingDraft,
    taskStatus,
    streamProgress,
    streamError,
    lastErrorTimestamp,
    analysisLogs,
  } = useAnalysis(sources)

  const {
    user,
    login,
    logout,
    loggingIn,
    emailLogin,
    register,
    fetchWechatQrCode,
    startWechatPolling,
    stopWechatPolling,
    qrCodeUrl,
    pollingStatus,
    pollingMessage,
    emailLoginError,
    registerError,
  } = useAuth()

  const {
    tasks: taskHistory,
    showHistory: _showHistory,
    setShowHistory,
    createTask,
    deleteTask: _deleteTask,
    refetchTasks,
    getTask,
  } = useTasks()

  const showLoginModal = useUIPreferenceStore((s) => s.showLoginModal)
  const showShareModal = useUIPreferenceStore((s) => s.showShareModal)
  const loadingStats = useUIPreferenceStore((s) => s.loadingStats)
  const globalDragOver = useUIPreferenceStore((s) => s.globalDragOver)
  const showPreferencePanel = useUIPreferenceStore((s) => s.showPreferencePanel)
  const showMonitorPanel = useUIPreferenceStore((s) => s.showMonitorPanel)
  const showKeyboardShortcuts = useUIPreferenceStore((s) => s.showKeyboardShortcuts)
  const setShowLoginModal = useUIPreferenceStore((s) => s.setShowLoginModal)
  const setShowShareModal = useUIPreferenceStore((s) => s.setShowShareModal)
  const setShowPreferencePanel = useUIPreferenceStore((s) => s.setShowPreferencePanel)
  const setShowMonitorPanel = useUIPreferenceStore((s) => s.setShowMonitorPanel)
  const setGlobalDragOver = useUIPreferenceStore((s) => s.setGlobalDragOver)
  const setShowKeyboardShortcuts = useUIPreferenceStore((s) => s.setShowKeyboardShortcuts)
  const shareExpiryDays = useUIPreferenceStore((s) => s.shareExpiryDays)
  const setShareExpiryDays = useUIPreferenceStore((s) => s.setShareExpiryDays)
  const sharePermission = useUIPreferenceStore((s) => s.sharePermission)
  const setSharePermission = useUIPreferenceStore((s) => s.setSharePermission)

  const taskSaved = useTaskStore((s) => s.taskSaved)
  const setTaskSaved = useTaskStore((s) => s.setTaskSaved)
  const setSavingTask = useTaskStore((s) => s.setSavingTask)

  const {
    copyShareLink,
    shareLink,
    shareExpired,
    creatingShare,
    shareViewCount,
    setCreatingShare,
    createDemoShare,
    setShareLink,
    setShareExpired,
    setShareViewCount,
    createShareAsync,
  } = useShareUtils()

  // 对话相关：接入 useChat hook 以供 CommandPalette 等调用
  const currentTaskId = useSourceStore((s) => s.currentTaskId)
  const {
    createConversation: createChatConversation,
    deleteConversation: deleteChatConversation,
    renameConversation: renameChatConversation,
  } = useChat(currentTaskId ?? undefined)
  const setActiveChatConversationId = useChatStore((s) => s.setActiveConversationId)

  // 新建对话：创建会话并切换到 AI 对话视图
  const handleNewChat = () => {
    createChatConversation({ taskId: currentTaskId ?? undefined })
    useAnalysisStore.getState().setActiveTab('chat')
  }

  // 选择对话：设置活跃会话并切换到 AI 对话视图
  const handleSelectChat = (id: string) => {
    setActiveChatConversationId(id)
    useAnalysisStore.getState().setActiveTab('chat')
  }

  // 删除对话
  const handleDeleteChat = (id: string) => {
    deleteChatConversation(id)
  }

  // 重命名对话
  const handleRenameChat = (id: string, title: string) => {
    renameChatConversation({ id, title })
  }

  const handleFeedback = (riskId: string, riskType: RiskType, isAccurate: boolean) => {
    submitFeedback({ riskId, riskType, isAccurate })
  }

  const handleLoadScenario = async (scenarioId: ScenarioType) => {
    const scenarioSources = DEMO_SOURCES[scenarioId] as Source[] | undefined
    const hasPresetSources = !!scenarioSources
    const isDemoMode = isDemoScenario(scenarioId)

    const {
      setSources,
      setSelectedSourceId,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
      setCurrentTask,
      setIntentAnalysis,
      setAnalyzingIntent,
      setScenarioDescription,
    } = useSourceStore.getState()
    const {
      setResult,
      setAnalyzing,
      setAnalysisStep,
      setSelectedRisk,
      setChecklist,
      setDimensions,
    } = useAnalysisStore.getState()

    setSelectedSourceId(null)
    setResult(null)
    setAnalyzing(false)
    setAnalysisStep(0)
    setSelectedRisk(null)
    setChecklist([])
    setCurrentTask(null)
    setIntentAnalysis(null)
    setAnalyzingIntent(false)
    setScenarioDescription('')

    const scenarioInfo = SCENARIOS.find((s) => s.id === scenarioId)
    const tabName = scenarioInfo?.name || '分析任务'
    useWorkspaceTabsStore.getState().openTab(scenarioId, tabName)
    setMobileSidebarOpen(false)

    if (isDemoMode) {
      setIsDemo(true)
      setSources(scenarioSources || [])
      setCurrentScenarioInStore(scenarioId)
      queryClient.setQueryData(['sources', null], scenarioSources || [])
      return
    }

    setIsDemo(false)
    setCurrentScenarioInStore(scenarioId)
    setSources([])
    queryClient.setQueryData(['sources', null], [])

    try {
      const initialSources = hasPresetSources
        ? scenarioSources.map((s) => ({
            type: s.type,
            name: s.name,
            content: s.content,
            meta: typeof s.meta === 'string' ? s.meta : JSON.stringify(s.meta),
          }))
        : undefined

      const task = await taskApi.createTask({
        title: tabName,
        scenarioType: scenarioId,
        sourceIds: [],
        initialSources,
      })
      setCurrentTask({ id: task.id, title: task.title })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['sources', task.id] })
    } catch (error) {
      console.error('Failed to create task for scenario:', error)
      showToast('创建场景任务失败，请重试', 'error')
    }
  }

  const handleShowHistory = () => {
    refetchTasks()
    setShowHistory(true)
  }

  const handleSelectHistory = async (task: TaskRecord) => {
    setShowHistory(false)
    const scenarioType = task.scenarioType as ScenarioType

    // 为历史任务创建新的工作区标签页，避免覆盖当前分析
    const tabName = task.title || SCENARIOS.find((s) => s.id === scenarioType)?.name || '历史任务'
    useWorkspaceTabsStore.getState().openTab(scenarioType, tabName)

    const {
      setSources,
      setSelectedSourceId,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
      setCurrentTask,
      setIntentAnalysis,
      setAnalyzingIntent,
      setScenarioDescription,
    } = useSourceStore.getState()
    const {
      setResult,
      setAnalyzing,
      setAnalysisStep,
      setSelectedRisk,
      setChecklist,
      setDimensions,
      setActiveTab: setActiveAnalysisTab,
    } = useAnalysisStore.getState()

    setSelectedSourceId(null)
    setResult(null)
    setAnalysisStep(0)
    setSelectedRisk(null)
    setChecklist([])
    setActiveAnalysisTab('overview')
    setCurrentTask({ id: task.id, title: task.title })
    setIntentAnalysis(null)
    setAnalyzingIntent(false)
    setScenarioDescription('')

    if (DEMO_SOURCES[scenarioType]) {
      setIsDemo(true)
      setSources(DEMO_SOURCES[scenarioType])
      setCurrentScenarioInStore(scenarioType)

      const demoResult = DEMO_RESULTS[scenarioType]
      if (demoResult) {
        setResult(demoResult)
        setDimensions(demoResult.dimensions || [])
        setChecklist(
          demoResult.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
        )
      }
    } else {
      setIsDemo(false)
      setCurrentScenarioInStore(scenarioType)

      try {
        const [taskDetail, srcList] = await Promise.all([
          getTask(task.id),
          sourceApi.listSources(task.id),
        ])
        setSources(srcList)
        if (taskDetail) {
          setResult(taskDetail.result)
          setDimensions(taskDetail.result.dimensions || [])
          setChecklist(
            taskDetail.result.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) ||
              [],
          )
        }
      } catch (error) {
        console.error('Failed to load task:', error)
        showToast('加载历史任务失败，请重试', 'error')
      }
    }
  }

  const handleDeleteHistory = (taskId: string) => {
    _deleteTask(taskId)
  }

  const handleSelectSnapshot = (snapshot: HistorySnapshot) => {
    setShowHistory(false)
    const scenarioType = snapshot.scenarioType as ScenarioType

    // 为历史快照创建新的工作区标签页，避免覆盖当前分析
    const tabName =
      snapshot.title || SCENARIOS.find((s) => s.id === scenarioType)?.name || '历史分析'
    useWorkspaceTabsStore.getState().openTab(scenarioType, tabName)

    const {
      setSources,
      setSelectedSourceId,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
      setIntentAnalysis,
      setAnalyzingIntent,
      setScenarioDescription,
    } = useSourceStore.getState()
    const {
      setResult,
      setAnalyzing,
      setAnalysisStep,
      setSelectedRisk,
      setChecklist,
      setDimensions,
      setActiveTab: setActiveAnalysisTab,
    } = useAnalysisStore.getState()

    setSelectedSourceId(null)
    setResult(null)
    setAnalysisStep(0)
    setSelectedRisk(null)
    setChecklist([])
    setActiveAnalysisTab('overview')
    setIntentAnalysis(null)
    setAnalyzingIntent(false)
    setScenarioDescription('')

    if (DEMO_SOURCES[scenarioType]) {
      setIsDemo(true)
      setSources(DEMO_SOURCES[scenarioType])
      setCurrentScenarioInStore(scenarioType)

      setResult(snapshot.result)
      setDimensions(snapshot.result.dimensions || [])
      setChecklist(
        snapshot.result.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
      )
    } else {
      setIsDemo(false)
      setCurrentScenarioInStore(scenarioType)

      // 从 snapshot.sourceIds 加载材料
      const loadSnapshotSources = async () => {
        try {
          const allSources = await sourceApi.listSources()
          const snapshotSources = snapshot.sourceIds
            .map((id) => allSources.find((s) => s.id === id))
            .filter(Boolean) as Source[]
          setSources(snapshotSources)
        } catch (e) {
          console.error('Failed to load snapshot sources:', e)
          setSources([])
        } finally {
          setResult(snapshot.result)
          setDimensions(snapshot.result.dimensions || [])
          setChecklist(
            snapshot.result.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
          )
        }
      }

      loadSnapshotSources()
    }
  }

  const handleCompareSnapshots = (snapshotA: HistorySnapshot, snapshotB: HistorySnapshot) => {
    setDiffSnapshotA(snapshotA)
    setDiffSnapshotB(snapshotB)
    setShowDiff(true)
    setShowHistory(false)
  }

  const handleViewSnapshot = (snapshot: HistorySnapshot) => {
    setDetailSnapshot(snapshot)
    setShowHistoryDetail(true)
  }

  const handleRestoreSnapshot = (snapshot: HistorySnapshot) => {
    handleSelectSnapshot(snapshot)
    setShowHistoryDetail(false)
  }

  const handleCompareWithCurrent = (snapshot: HistorySnapshot) => {
    if (!result) return
    const currentSnapshot: HistorySnapshot = {
      id: 'current',
      title: '当前版本',
      scenarioType: currentScenario || 'custom',
      createdAt: new Date().toISOString(),
      durationMs: result.meta?.durationMs || 0,
      sourceCount: sources.length,
      sourceIds: sources.map((s) => s.id),
      result,
    }
    setDiffSnapshotA(snapshot)
    setDiffSnapshotB(currentSnapshot)
    setShowDiff(true)
    setShowHistoryDetail(false)
  }

  const isDemoMode = sources.some((s) => s.id.startsWith('demo_'))

  const handleNewAnalysis = async () => {
    const {
      setSources,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
      setCurrentTask,
      setIntentAnalysis,
      setAnalyzingIntent,
      setScenarioDescription,
      setSelectedSourceId,
    } = useSourceStore.getState()
    setSources([])
    setIsDemo(false)
    setCurrentScenarioInStore(null)
    setIntentAnalysis(null)
    setAnalyzingIntent(false)
    setScenarioDescription('')
    setSelectedSourceId(null)
    resetAnalysis()
    setSelectedRisk(null)
    setMobileSidebarOpen(false)
    queryClient.setQueryData(['sources', null], [])

    try {
      const task = await taskApi.createTask({
        title: '未命名分析',
        scenarioType: 'custom',
        sourceIds: [],
      })
      setCurrentTask({ id: task.id, title: task.title })
      useWorkspaceTabsStore.getState().openTab('custom', '未命名分析')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['sources', task.id] })
    } catch (error) {
      console.error('Failed to create task:', error)
      showToast('创建任务失败，请重试', 'error')
    }
  }

  const saveTask = async () => {
    if (sources.length === 0 || !result) return
    setSavingTask(true)
    try {
      const title = currentScenario
        ? SCENARIOS.find((s) => s.id === currentScenario)?.name || '分析任务'
        : sources[0]?.name || `分析任务 ${new Date().toLocaleDateString()}`

      createTask(
        {
          title,
          scenarioType: currentScenario || 'custom',
          sourceIds: sources.map((s) => s.id),
        },
        {
          onSuccess: () => {
            setTaskSaved(true)
            setTimeout(() => setTaskSaved(false), 2000)
            refetchTasks()
          },
        },
      )
    } finally {
      setSavingTask(false)
    }
  }

  const handleAnalyzeSuccess = async (analysisResult: AnalyzeResult) => {
    const isDemoMode = sources.some((s) => s.id.startsWith('demo_'))

    if (!isDemoMode && !currentScenario) {
      await saveTask()
    }

    const title = currentScenario
      ? SCENARIOS.find((s) => s.id === currentScenario)?.name || '分析任务'
      : sources[0]?.name || `分析任务 ${new Date().toLocaleDateString()}`

    const snapshotData = createSnapshotFromResult({
      result: analysisResult,
      title,
      scenarioType: currentScenario || 'custom',
      durationMs: analysisResult.meta?.durationMs || 0,
      sourceCount: sources.length,
      sourceIds: sources.map((s) => s.id),
    })

    if (!isDemoMode) {
      historyStorage.saveSnapshot(snapshotData)
    }

    const activeTabId = useWorkspaceTabsStore.getState().activeTabId
    if (activeTabId) {
      useWorkspaceTabsStore.getState().updateTabStatus(activeTabId, 'completed')
      useWorkspaceTabsStore
        .getState()
        .updateTabCounts(activeTabId, sources.length, analysisResult.risks?.length || 0)
    }
  }

  const handleAnalyze = () => {
    const activeTabId = useWorkspaceTabsStore.getState().activeTabId
    if (activeTabId) {
      useWorkspaceTabsStore.getState().updateTabStatus(activeTabId, 'analyzing')
    }
    analyze({
      onSuccess: handleAnalyzeSuccess,
    })
  }

  const handleShare = async () => {
    if (!result) {
      showToast('请先完成分析后再分享', 'error')
      return
    }

    const isDemoMode = sources.some((s: Source) => s.id.startsWith('demo_'))

    setCreatingShare(true)
    try {
      if (isDemoMode) {
        createDemoShare(shareExpiryDays)
        setShowShareModal(true)
        showToast('分享链接已创建', 'success')
      } else {
        if (!taskSaved && !currentScenario) {
          await saveTask()
        }

        const currentTaskId =
          taskHistory.length > 0
            ? taskHistory.find(
                (t) =>
                  t.title ===
                  (currentScenario
                    ? SCENARIOS.find((s) => s.id === currentScenario)?.name
                    : `分析任务 ${new Date().toLocaleDateString()}`),
              )?.id
            : undefined

        if (!currentTaskId && !taskSaved) {
          showToast('请先保存任务后再分享', 'error')
          return
        }

        let taskId = currentTaskId
        if (!taskId && taskHistory.length > 0) {
          taskId = taskHistory[0].id
        }

        if (!taskId) {
          showToast('请先保存任务后再分享', 'error')
          return
        }

        const shareResult = await createShareAsync({
          taskId,
          expiresInDays: shareExpiryDays ?? undefined,
        })
        const baseUrl = window.location.origin
        const fullUrl = `${baseUrl}/share/${shareResult.token}`
        setShareLink(fullUrl)
        setShareExpired(
          shareResult.expiresAt ? new Date(shareResult.expiresAt).toLocaleString() : '永久有效',
        )
        setShareViewCount(0)
        setShowShareModal(true)
        showToast('分享链接已创建', 'success')
      }
    } catch (error) {
      console.error('Failed to create share:', error)
      showToast('创建分享链接失败，请重试', 'error')
    } finally {
      setCreatingShare(false)
    }
  }

  const handleCopyShareLink = async () => {
    const success = await copyShareLink()
    if (success) {
      showToast('分享链接已复制到剪贴板', 'success')
    } else {
      showToast('复制失败，请手动复制', 'error')
    }
  }

  const handleExpiryChange = (days: number | null) => {
    setShareExpiryDays(days)
  }

  const handlePermissionChange = (permission: SharePermission) => {
    setSharePermission(permission)
  }

  const handleGlobalDrop = async (e: DragEvent) => {
    e.preventDefault()
    setGlobalDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    setDroppedFiles(files)
    setShowAddSource(true)
  }

  const handleAddSource = (source: Source) => {
    const { addSource } = useSourceStore.getState()
    addSource(source)
    refetchSources()
  }

  const _handleSelectRisk = (risk: Risk | null) => {
    setSelectedRisk(risk)
    if (window.innerWidth < 1024) {
      setMobileContextOpen(true)
    }
  }

  const handleEvidenceClick = (sourceIdOrName: string, quote: string) => {
    let source = sources.find((s) => s.id === sourceIdOrName)
    if (!source) {
      source = sources.find((s) => s.name === sourceIdOrName)
    }
    if (source) {
      setSelectedSourceId(source.id)
      setSourceDetailModalHighlight(quote)
      setSourceDetailModalSource(source)
      const { setHighlightedEvidence } = useAnalysisStore.getState()
      setHighlightedEvidence({ sourceId: source.id, quote })
    }
  }

  const scenario = SCENARIOS.find((s) => s.id === currentScenario)

  const globalShortcuts = useMemo(
    () => [
      {
        key: 'Enter',
        modifiers: ['ctrl'] as const,
        description: '开始分析',
        group: '全局',
        enabled: sources.length > 0 && !analyzing,
        handler: () => {
          if (sources.length > 0 && !analyzing) {
            handleAnalyze()
          }
        },
      },
      {
        key: 'k',
        modifiers: ['ctrl'] as const,
        description: selectedRisk ? 'AI 重写当前风险' : '打开命令面板',
        group: '全局',
        handler: () => {
          if (selectedRisk) {
            useAnalysisStore.getState().setAiEditorTargetRiskId(selectedRisk.id)
          } else {
            setShowGlobalSearch(true)
          }
        },
      },
      {
        key: 'k',
        modifiers: ['ctrl', 'shift'] as const,
        description: '打开命令面板',
        group: '全局',
        handler: () => {
          setShowGlobalSearch(true)
        },
      },
      {
        key: 'n',
        description: '添加材料',
        group: '操作',
        handler: () => {
          setShowAddSource(true)
        },
      },
      {
        key: 'p',
        modifiers: ['ctrl', 'shift'] as const,
        description: '打开命令面板',
        group: '全局',
        handler: () => {
          setShowGlobalSearch(true)
        },
      },
      {
        key: 's',
        modifiers: ['ctrl'] as const,
        description: '导出',
        group: '全局',
        enabled: !!result,
        handler: () => {
          if (result) {
            setShowExportMenu(!showExportMenu)
          }
        },
      },
      {
        key: 'b',
        modifiers: ['ctrl'] as const,
        description: '切换侧边栏',
        group: '面板',
        handler: () => {
          setSidebarCollapsed(!sidebarCollapsed)
        },
      },
      {
        key: '[',
        description: '折叠/展开材料面板',
        group: '面板',
        handler: () => {
          if (sourcePanelCollapsed) {
            setSourcePanelCollapsed(false)
          } else {
            setSourcePanelCollapsed(true)
          }
        },
      },
      {
        key: ']',
        description: '折叠/展开上下文面板',
        group: '面板',
        handler: () => {
          if (contextPanelCollapsed) {
            setContextPanelCollapsed(false)
          } else {
            setContextPanelCollapsed(true)
          }
        },
      },
      {
        key: 's',
        description: '聚焦材料面板',
        group: '导航',
        isChord: true,
        chordPrefix: 'g',
        handler: () => {
          if (sourcePanelCollapsed) {
            setSourcePanelCollapsed(false)
          }
        },
      },
      {
        key: 'r',
        description: '聚焦风险面板',
        group: '导航',
        isChord: true,
        chordPrefix: 'g',
        handler: () => {
          if (contextPanelCollapsed && selectedRisk) {
            setContextPanelCollapsed(false)
          }
        },
      },
      {
        key: 'e',
        description: '导出报告',
        group: '操作',
        enabled: !!result,
        handler: () => {
          if (result) {
            setShowExportMenu(!showExportMenu)
          }
        },
      },
      {
        key: 's',
        description: '保存任务',
        group: '操作',
        enabled: !!result && sources.length > 0,
        handler: () => {
          if (result && sources.length > 0) {
            saveTask()
          }
        },
      },
      {
        key: 't',
        modifiers: ['ctrl'] as const,
        description: '任务切换器',
        group: '全局',
        handler: () => {
          setShowTaskSwitcher(true)
        },
      },
      {
        key: 'j',
        modifiers: ['ctrl'] as const,
        description: '切换到 AI 对话',
        group: '全局',
        handler: () => {
          useAnalysisStore.getState().setActiveTab('chat')
        },
      },
      {
        key: 'Escape',
        description: '关闭弹窗',
        group: '全局',
        handler: () => {
          if (showAddSource) {
            setShowAddSource(false)
            return
          }
          if (showLoginModal) {
            setShowLoginModal(false)
            return
          }
          if (showShareModal) {
            setShowShareModal(false)
            return
          }
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false)
            return
          }
          if (showPreferencePanel) {
            setShowPreferencePanel(false)
            return
          }
          if (showMonitorPanel) {
            setShowMonitorPanel(false)
            return
          }
          if (showExportMenu) {
            setShowExportMenu(false)
            return
          }
          if (showNotifications) {
            setShowNotifications(false)
            return
          }
          if (showGlobalSearch) {
            setShowGlobalSearch(false)
            return
          }
          if (showBilling) {
            setShowBilling(false)
            return
          }
          if (showTeamPanel) {
            setShowTeamPanel(false)
            return
          }
          if (showTemplateMarket) {
            setShowTemplateMarket(false)
            return
          }
          if (showApiSettings) {
            setShowApiSettings(false)
            return
          }
          if (showTaskSwitcher) {
            setShowTaskSwitcher(false)
            return
          }
          if (selectedRisk) {
            setSelectedRisk(null)
            return
          }
        },
      },
      {
        key: '?',
        description: '打开快捷键面板',
        group: '全局',
        handler: () => {
          setShowKeyboardShortcuts(true)
        },
      },
    ],
    [
      sources.length,
      analyzing,
      result,
      showAddSource,
      showLoginModal,
      showShareModal,
      showKeyboardShortcuts,
      showPreferencePanel,
      showMonitorPanel,
      showExportMenu,
      showNotifications,
      showGlobalSearch,
      showBilling,
      showTeamPanel,
      showTemplateMarket,
      showApiSettings,
      showTaskSwitcher,
      selectedRisk,
      sidebarCollapsed,
      sourcePanelCollapsed,
      contextPanelCollapsed,
      setShowAddSource,
      setShowLoginModal,
      setShowShareModal,
      setShowKeyboardShortcuts,
      setShowPreferencePanel,
      setShowMonitorPanel,
      setShowNotifications,
      setShowGlobalSearch,
      setShowBilling,
      setShowTeamPanel,
      setShowTemplateMarket,
      setShowApiSettings,
      setShowTaskSwitcher,
      setSelectedRisk,
      setSidebarCollapsed,
      setSourcePanelCollapsed,
      setContextPanelCollapsed,
      setShowExportMenu,
      handleAnalyze,
      saveTask,
      setShowHistory,
    ],
  )

  useKeyboardShortcuts({ shortcuts: globalShortcuts })

  return {
    handlers: {
      handleFeedback,
      handleLoadScenario,
      handleShowHistory,
      handleSelectHistory,
      handleDeleteHistory,
      handleSelectSnapshot,
      handleCompareSnapshots,
      handleViewSnapshot,
      handleRestoreSnapshot,
      handleCompareWithCurrent,
      handleNewAnalysis,
      saveTask,
      handleAnalyzeSuccess,
      handleAnalyze,
      handleShare,
      handleCopyShareLink,
      handleExpiryChange,
      handlePermissionChange,
      handleGlobalDrop,
      handleAddSource,
      _handleSelectRisk,
      handleEvidenceClick,
      handleNewChat,
      handleSelectChat,
      handleDeleteChat,
      handleRenameChat,
    },
    state: {
      sources,
      selectedSourceId,
      showAddSource,
      currentScenario,
      setSelectedSourceId,
      setShowAddSource,
      _deleteSource,
      refetchSources,
      reparseSource,
      result,
      analyzing,
      selectedRisk,
      pendingRisks,
      totalUnresolved,
      taskStatus,
      streamProgress,
      streamError,
      lastErrorTimestamp,
      analysisLogs,
      analyze,
      analyzeFull,
      submitFeedback,
      cancelAnalysis,
      setSelectedRisk,
      getRiskStatus,
      resetAnalysis,
      riskFeedback,
      generateDraft,
      setRiskStatus,
      getRiskNotes,
      setRiskNotes,
      toggleCheckItem,
      checklist,
      _showDraft,
      _draftText,
      _generatingDraft,
      user,
      login,
      logout,
      loggingIn,
      emailLogin,
      register,
      fetchWechatQrCode,
      startWechatPolling,
      stopWechatPolling,
      qrCodeUrl,
      pollingStatus,
      pollingMessage,
      emailLoginError,
      registerError,
      taskHistory,
      _showHistory,
      setShowHistory,
      createTask,
      _deleteTask,
      refetchTasks,
      getTask,
      showLoginModal,
      showShareModal,
      loadingStats,
      globalDragOver,
      showPreferencePanel,
      showMonitorPanel,
      showKeyboardShortcuts,
      setShowLoginModal,
      setShowShareModal,
      setShowPreferencePanel,
      setShowMonitorPanel,
      setGlobalDragOver,
      setShowKeyboardShortcuts,
      shareExpiryDays,
      setShareExpiryDays,
      sharePermission,
      setSharePermission,
      taskSaved,
      setTaskSaved,
      setSavingTask,
      copyShareLink,
      shareLink,
      shareExpired,
      creatingShare,
      shareViewCount,
      setCreatingShare,
      createDemoShare,
      setShareLink,
      setShareExpired,
      setShareViewCount,
      isDemoMode,
      scenario,
      mobileSidebarOpen,
      mobileContextOpen,
      showTour,
      showDiff,
      diffSnapshotA,
      diffSnapshotB,
      showHistoryDetail,
      detailSnapshot,
      showExportMenu,
      printStyle,
      sourceDetailModalSource,
      sourceDetailModalHighlight,
      riskDetailModalOpen,
      droppedFiles,
      sourcePanelWidth,
      contextPanelWidth,
      sourcePanelCollapsed,
      contextPanelCollapsed,
      sidebarCollapsed,
      showModelSettings,
      showNotifications,
      showGlobalSearch,
      showBilling,
      showTeamPanel,
      showTemplateMarket,
      showApiSettings,
    },
    setters: {
      setMobileSidebarOpen,
      setMobileContextOpen,
      setShowTour,
      setShowDiff,
      setDiffSnapshotA,
      setDiffSnapshotB,
      setShowHistoryDetail,
      setDetailSnapshot,
      setShowExportMenu,
      setPrintStyle,
      setSourceDetailModalSource,
      setSourceDetailModalHighlight,
      setRiskDetailModalOpen,
      setDroppedFiles,
      setSourcePanelWidth,
      setContextPanelWidth,
      setSourcePanelCollapsed,
      setContextPanelCollapsed,
      setSidebarCollapsed,
      setShowModelSettings,
      setShowNotifications,
      setShowGlobalSearch,
      setShowBilling,
      setShowTeamPanel,
      setShowTemplateMarket,
      setShowApiSettings,
    },
  }
}
