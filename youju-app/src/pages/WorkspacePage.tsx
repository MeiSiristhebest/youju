import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Menu, Plus, UploadCloud } from 'lucide-react'
import type { DragEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardShortcutsModal } from '../components/common/KeyboardShortcutsModal'
import type { TourStep } from '../components/common/ProductTour'
import { ProductTour } from '../components/common/ProductTour'
import { ResizablePanel, Resizer } from '../components/common/ResizablePanel'
import { useToast } from '../components/common/Toast'
import { AddSourceModal } from '../components/modals/AddSourceModal'
import { DraftModal } from '../components/modals/DraftModal'
import { LoginModal } from '../components/modals/LoginModal'
import { RiskDetailModal } from '../components/modals/RiskDetailModal'
import { ShareModal } from '../components/modals/ShareModal'
import { SourceDetailModal } from '../components/modals/SourceDetailModal'
import type { PrintStyle } from '../components/print/PrintReport'
import { ContextPanel } from '../components/workspace/ContextPanel'
import { HistoryDiffPanel } from '../components/workspace/HistoryDiffPanel'
import { HistoryPanel } from '../components/workspace/HistoryPanel'
import { ModelSettingsPanel } from '../components/workspace/ModelSettingsPanel'
import { MonitorPanel } from '../components/workspace/MonitorPanel'
import { PreferencePanel } from '../components/workspace/PreferencePanel'
import { ResultPanel } from '../components/workspace/ResultPanel'
import { RiskWorkflowPanel } from '../components/workspace/RiskWorkflowPanel'
import { SourcePanel } from '../components/workspace/SourcePanel'
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar'
import { WorkspaceTopBar } from '../components/workspace/WorkspaceTopBar'
import { DEMO_RESULTS, DEMO_SOURCES, DEMO_SYS_STATS } from '../constants/demoData'
import { SCENARIOS } from '../constants/workspace'
import { useAnalysis } from '../hooks/useAnalysis'
import { useAuth } from '../hooks/useAuth'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useShareUtils } from '../hooks/useShare'
import { useSources } from '../hooks/useSources'
import { useTasks } from '../hooks/useTasks'
import { createSnapshotFromResult, historyStorage } from '../lib/history'
import { shareApi } from '../services/shareApi'
import { useAnalysisStore, useSourceStore, useTaskStore, useUIPreferenceStore } from '../stores'
import type {
  AnalyzeResult,
  ChecklistItem,
  HistorySnapshot,
  Risk,
  ScenarioType,
  Source,
  TaskRecord,
} from '../types'

interface WorkspacePageProps {
  onGoHome: () => void
}

export function WorkspacePage({ onGoHome }: WorkspacePageProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileContextOpen, setMobileContextOpen] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [diffSnapshotA, setDiffSnapshotA] = useState<HistorySnapshot | null>(null)
  const [diffSnapshotB, setDiffSnapshotB] = useState<HistorySnapshot | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [printStyle, setPrintStyle] = useState<PrintStyle>('standard')
  const [sourceDetailModalSource, setSourceDetailModalSource] = useState<Source | null>(null)
  const [sourceDetailModalHighlight, setSourceDetailModalHighlight] = useState<string>('')
  const [riskDetailModalOpen, setRiskDetailModalOpen] = useState(false)
  const [sourcePanelWidth, setSourcePanelWidth] = useState(320)
  const [contextPanelWidth, setContextPanelWidth] = useState(320)
  const [sourcePanelCollapsed, setSourcePanelCollapsed] = useState(false)
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showModelSettings, setShowModelSettings] = useState(false)
  const queryClient = useQueryClient()

  const tourSteps: TourStep[] = [
    {
      id: 'welcome',
      target: '#tour-sidebar',
      title: '欢迎来到有据',
      description:
        '有据是一个基于多源证据交叉验证的增量式推理工具，帮你从碎片化信息中梳理事实、识别冲突。',
      placement: 'right',
    },
    {
      id: 'new-analysis',
      target: '#tour-new-analysis-btn',
      title: '新建或切换分析',
      description: '点击这里开始新的分析，或从下方场景模板中选择一个预设场景快速开始。',
      placement: 'right',
    },
    {
      id: 'source-panel',
      target: '#tour-source-panel',
      title: '材料面板',
      description:
        '在这里添加和管理你的证据材料。支持聊天记录、文档、网页、截图等多种格式。点击材料可查看详情。',
      placement: 'right',
    },
    {
      id: 'analyze-btn',
      target: '#tour-analyze-btn',
      title: '开始分析',
      description: '添加材料后点击这里，AI 将自动识别冲突、缺失和风险，生成结构化的分析报告。',
      placement: 'bottom',
    },
    {
      id: 'result-panel',
      target: '#tour-result-panel',
      title: '分析结果',
      description:
        '分析完成后，你可以查看风险清单、检查清单、统一版本等多个维度的分析结果，每条结论都可溯源。',
      placement: 'left',
    },
  ]

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('youju_workspace_tour')
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShowTour(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const {
    sources,
    selectedSourceId,
    showAddSource,
    currentScenario,
    setSelectedSourceId,
    setShowAddSource,
    loadScenario: _loadScenario,
    deleteSource: _deleteSource,
    refetchSources,
    reparseSource,
  } = useSources()

  const {
    result,
    analyzing,
    analysisStep,
    activeTab,
    checklist,
    selectedRisk,
    showDraft: _showDraft,
    draftText: _draftText,
    generatingDraft: _generatingDraft,
    riskFeedback,
    streaming,
    streamProgress,
    streamError,
    dimensions,
    sortedRisks,
    showAddDimensionDialog,
    incrementalPrediction,
    showIncrementalBanner,
    previousResult,
    riskStatusFilter,
    riskStatusCounts,
    pendingRisks,
    totalUnresolved,
    analyze,
    analyzeFull,
    generateDraft,
    submitFeedback,
    cancelAnalysis,
    resetAnalysis,
    setActiveTab,
    setSelectedRisk,
    toggleCheckItem,
    setChecklist,
    toggleDimensionEnabled,
    updateDimensionWeight,
    moveDimension,
    addCustomDimension,
    removeCustomDimension,
    resetDimensionWeights,
    setShowAddDimensionDialog,
    setShowIncrementalBanner,
    setRiskStatusFilter,
    setRiskStatus,
    setRiskNotes,
    getRiskStatus,
    getRiskNotes,
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

  const {
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
  } = useUIPreferenceStore()

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
  } = useShareUtils()
  const { shareExpiryDays, setShareExpiryDays } = useUIPreferenceStore()
  const { showToast } = useToast()
  const { taskSaved, setTaskSaved, setSavingTask } = useTaskStore()
  const { setResult } = useAnalysisStore()
  const { setCurrentScenario } = useSourceStore()

  const handleFeedback = (riskId: string, feedback: 'accurate' | 'inaccurate') => {
    submitFeedback({ riskId, feedback })
  }

  const handleLoadScenario = async (scenarioId: ScenarioType) => {
    const demoSources = DEMO_SOURCES[scenarioId]

    const {
      setSources,
      setSelectedSourceId,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
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
    setIsDemo(true)

    if (demoSources) {
      setSources(demoSources)
      setCurrentScenarioInStore(scenarioId)
    }

    queryClient.setQueryData(['sources'], demoSources || [])
    setMobileSidebarOpen(false)
  }

  const handleShowHistory = () => {
    refetchTasks()
    setShowHistory(true)
  }

  const handleSelectHistory = async (task: TaskRecord) => {
    setShowHistory(false)
    const scenarioType = task.scenarioType as ScenarioType

    const {
      setSources,
      setSelectedSourceId,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
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
    setAnalyzing(true)
    setAnalysisStep(0)
    setSelectedRisk(null)
    setChecklist([])

    if (DEMO_SOURCES[scenarioType]) {
      setIsDemo(true)
      setSources(DEMO_SOURCES[scenarioType])
      setCurrentScenarioInStore(scenarioType)

      const demoResult = DEMO_RESULTS[scenarioType]
      if (demoResult) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        setResult(demoResult)
        setDimensions(demoResult.dimensions || [])
        setChecklist(
          demoResult.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
        )
      }
      setAnalyzing(false)
    } else {
      setIsDemo(false)
      setCurrentScenarioInStore(scenarioType)

      const taskDetail = await getTask(task.id)
      if (taskDetail) {
        setResult(taskDetail.result)
        setDimensions(taskDetail.result.dimensions || [])
        setChecklist(
          taskDetail.result.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
        )
      }
      setAnalyzing(false)
    }
  }

  const handleDeleteHistory = (taskId: string) => {
    _deleteTask(taskId)
  }

  const handleSelectSnapshot = (snapshot: HistorySnapshot) => {
    setShowHistory(false)
    const scenarioType = snapshot.scenarioType as ScenarioType

    const {
      setSources,
      setSelectedSourceId,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
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
    setAnalyzing(true)
    setAnalysisStep(0)
    setSelectedRisk(null)
    setChecklist([])

    if (DEMO_SOURCES[scenarioType]) {
      setIsDemo(true)
      setSources(DEMO_SOURCES[scenarioType])
      setCurrentScenarioInStore(scenarioType)
    }

    setTimeout(() => {
      setResult(snapshot.result)
      setDimensions(snapshot.result.dimensions || [])
      setChecklist(
        snapshot.result.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
      )
      setAnalyzing(false)
    }, 300)
  }

  const handleCompareSnapshots = (snapshotA: HistorySnapshot, snapshotB: HistorySnapshot) => {
    setDiffSnapshotA(snapshotA)
    setDiffSnapshotB(snapshotB)
    setShowDiff(true)
    setShowHistory(false)
  }

  const isDemoMode = sources.some((s) => s.id.startsWith('demo_'))

  const handleNewAnalysis = () => {
    const {
      setSources,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
    } = useSourceStore.getState()
    setSources([])
    setIsDemo(false)
    setCurrentScenarioInStore(null)
    resetAnalysis()
    setSelectedRisk(null)
    setMobileSidebarOpen(false)
    queryClient.setQueryData(['sources'], [])
    queryClient.invalidateQueries({ queryKey: ['sources'] })
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
  }

  const handleAnalyze = () => {
    analyze({
      onSuccess: handleAnalyzeSuccess,
    })
  }

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
        description: '添加材料',
        group: '全局',
        handler: () => {
          setShowAddSource(true)
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
            setShowExportMenu((prev) => !prev)
          }
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
      selectedRisk,
      setShowAddSource,
      setShowLoginModal,
      setShowShareModal,
      setShowKeyboardShortcuts,
      setShowPreferencePanel,
      setShowMonitorPanel,
      setSelectedRisk,
      handleAnalyze,
    ],
  )

  useKeyboardShortcuts({ shortcuts: globalShortcuts })

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

        const shareResult = await shareApi.createShare({
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

  const _toggleCheck = async (id: string) => {
    toggleCheckItem(id)

    const item = checklist.find((c) => c.id === id)
    const newChecked = !item?.checked

    const checkedIds = checklist.filter((c) => c.checked).map((c) => c.id)
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

    const tasks: Promise<Response>[] = []
    if (currentTaskId) {
      tasks.push(
        fetch(`/api/tasks/${currentTaskId}/checklist`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkedItems: checkedIds }),
        }),
      )
    }
    if (item?.riskType) {
      tasks.push(
        fetch('/api/preferences/checklist-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            riskType: item.riskType,
            dimension: item.dimension,
            checked: newChecked,
          }),
        }),
      )
    }

    const results = await Promise.allSettled(tasks)
    for (const r of results) {
      if (r.status === 'rejected') console.error(r.reason)
    }
  }

  const scenario = SCENARIOS.find((s) => s.id === currentScenario)

  const _handleRiskFeedback = async (riskId: string, riskType: string, isAccurate: boolean) => {
    submitFeedback({ riskId, feedback: isAccurate ? 'accurate' : 'inaccurate' })

    try {
      await fetch('/api/preferences/risk-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId, riskType, isAccurate }),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const _loadSysStats = async () => {
    if (loadingStats) return
    const { setLoadingStats, setSysStats } = useUIPreferenceStore.getState()
    setLoadingStats(true)
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (data.code === 200) {
        setSysStats(data.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleGlobalDrop = async (e: DragEvent) => {
    e.preventDefault()
    setGlobalDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    setShowAddSource(true)
  }

  const handleAddSource = (_source: Source) => {
    refetchSources()
  }

  const handleSelectRisk = (risk: Risk | null) => {
    setSelectedRisk(risk)
    if (window.innerWidth < 1024) {
      setMobileContextOpen(true)
    }
  }

  const handleEvidenceClick = (sourceId: string, quote: string) => {
    setSelectedSourceId(sourceId)
    const source = sources.find((s) => s.id === sourceId)
    if (source) {
      setSourceDetailModalHighlight(quote)
      setSourceDetailModalSource(source)
    }
    const { setHighlightedEvidence } = useAnalysisStore.getState()
    setHighlightedEvidence({ sourceId, quote })
  }

  return (
    <div
      className="flex h-screen bg-paper text-ink overflow-hidden relative"
      role="button"
      tabIndex={-1}
      onDragOver={(e) => {
        e.preventDefault()
        setGlobalDragOver(true)
      }}
      onDragLeave={() => setGlobalDragOver(false)}
      onDrop={handleGlobalDrop}
    >
      {/* 移动端侧边栏遮罩 */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 - 桌面端固定，移动端抽屉 */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto transform transition-transform duration-300 ease-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:hidden' : ''}`}
      >
        <WorkspaceSidebar
          currentScenario={currentScenario}
          user={user}
          onGoHome={() => {
            onGoHome()
            setMobileSidebarOpen(false)
          }}
          onNewAnalysis={handleNewAnalysis}
          onLoadScenario={(id) => handleLoadScenario(id as ScenarioType)}
          onShowHistory={handleShowHistory}
          onShowLogin={() => setShowLoginModal(true)}
          onLogout={logout}
          onShowPreference={() => setShowPreferencePanel(true)}
          onShowModelSettings={() => setShowModelSettings(true)}
          onShowMonitor={() => setShowMonitorPanel(true)}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      </div>

      {/* 侧边栏折叠后的窄条 */}
      {sidebarCollapsed && (
        <div
          className="hidden md:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-r border-rule gap-2"
          style={{ width: '48px' }}
        >
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="展开侧边栏"
            title="展开侧边栏"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
            onClick={handleNewAnalysis}
            aria-label="新建分析"
            title="新建分析"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 顶部栏 - 移动端添加菜单按钮 */}
        <div className="relative">
          <WorkspaceTopBar
            scenario={scenario}
            sourcesLength={sources.length}
            analyzing={analyzing}
            hasResult={!!result}
            result={result}
            sources={sources}
            onGoHome={onGoHome}
            onShowShare={handleShare}
            onAnalyze={handleAnalyze}
            onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
            showExportMenu={showExportMenu}
            onShowExportMenuChange={setShowExportMenu}
            printStyle={printStyle}
            onPrintStyleChange={setPrintStyle}
          />
          {/* 移动端菜单按钮 - 绝对定位在左侧 */}
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 md:hidden p-2 text-ink-muted hover:text-ink transition-colors"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex relative">
          {/* SourcePanel - 可拖拽调整宽度 & 可折叠 */}
          {sourcePanelCollapsed ? (
            <div
              className="hidden sm:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-r border-rule gap-2"
              style={{ width: '48px' }}
            >
              <div
                className="text-[10px] font-mono text-accent tracking-widest uppercase writing-mode-vertical"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                材料
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
                onClick={() => setSourcePanelCollapsed(false)}
                aria-label="展开材料面板"
                title="展开材料面板"
              >
                <ChevronRight size={16} strokeWidth={1.5} />
              </button>
              <div className="text-[10px] text-ink-faint font-mono">{sources.length}</div>
            </div>
          ) : (
            <>
              <div
                className="hidden sm:block flex-shrink-0"
                style={{ width: `${sourcePanelWidth}px` }}
              >
                <SourcePanel
                  sources={sources}
                  selectedSource={selectedSourceId}
                  onSelectSource={setSelectedSourceId}
                  onAddSource={() => setShowAddSource(true)}
                  currentScenario={currentScenario}
                  onDeleteSource={(id) => _deleteSource(id)}
                  onReparseSource={(id) => reparseSource(id)}
                  onOpenSourceDetail={(source) => setSourceDetailModalSource(source)}
                  onCollapse={() => setSourcePanelCollapsed(true)}
                />
              </div>
              {/* SourcePanel 拖拽手柄 */}
              <div className="hidden sm:block">
                <Resizer
                  onResize={(delta) => {
                    const newWidth = Math.max(280, Math.min(560, sourcePanelWidth + delta))
                    setSourcePanelWidth(newWidth)
                  }}
                />
              </div>
            </>
          )}

          {/* RiskWorkflowPanel - 待处理清单 */}
          {result && (
            <div className="hidden md:block flex-shrink-0">
              <RiskWorkflowPanel
                risks={pendingRisks}
                totalCount={result.risks.length}
                unresolvedCount={totalUnresolved}
                selectedRiskId={selectedRisk?.id || null}
                onSelectRisk={(risk) => {
                  setSelectedRisk(risk)
                  if (window.innerWidth < 1024) {
                    setMobileContextOpen(true)
                  }
                }}
                getRiskStatus={getRiskStatus}
              />
            </div>
          )}

          {/* ResultPanel - 主内容区 */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <ResultPanel
              analyzing={analyzing}
              analysisStep={analysisStep}
              result={result}
              activeTab={activeTab as any}
              selectedRisk={selectedRisk}
              checklist={checklist}
              dimensions={dimensions}
              sortedRisks={sortedRisks}
              showAddDimensionDialog={showAddDimensionDialog}
              incrementalMeta={result?.incrementalMeta}
              incrementalPrediction={incrementalPrediction}
              showIncrementalBanner={showIncrementalBanner}
              previousResult={previousResult}
              riskStatusFilter={riskStatusFilter}
              riskStatusCounts={riskStatusCounts}
              onTabChange={(tab) => setActiveTab(tab as any)}
              onSelectRisk={handleSelectRisk}
              onToggleCheck={toggleCheckItem}
              onAnalyze={handleAnalyze}
              onAnalyzeFull={() => analyzeFull({ onSuccess: handleAnalyzeSuccess })}
              canAnalyze={sources.length > 0}
              streaming={streaming}
              streamProgress={streamProgress}
              streamError={streamError}
              onCancel={cancelAnalysis}
              onLoadScenario={(id) => handleLoadScenario(id as ScenarioType)}
              onAddSource={() => setShowAddSource(true)}
              hasSources={sources.length > 0}
              onEvidenceClick={handleEvidenceClick}
              onToggleDimensionEnabled={toggleDimensionEnabled}
              onUpdateDimensionWeight={updateDimensionWeight}
              onMoveDimension={moveDimension}
              onAddCustomDimension={addCustomDimension}
              onRemoveCustomDimension={removeCustomDimension}
              onResetDimensionWeights={resetDimensionWeights}
              onShowAddDimensionDialogChange={setShowAddDimensionDialog}
              onDismissIncrementalBanner={() => setShowIncrementalBanner(false)}
              onRiskStatusFilterChange={setRiskStatusFilter}
            />
          </div>

          {/* ContextPanel - 可拖拽调整宽度 & 可折叠 */}
          {contextPanelCollapsed ? (
            <div
              className="hidden lg:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-l border-rule gap-2"
              style={{ width: '48px' }}
            >
              <div
                className="text-[10px] font-mono text-accent tracking-widest uppercase"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                }}
              >
                风险详情
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
                onClick={() => setContextPanelCollapsed(false)}
                aria-label="展开风险详情面板"
                title="展开风险详情面板"
              >
                <ChevronLeft size={16} strokeWidth={1.5} />
              </button>
              {selectedRisk && (
                <div className="w-2 h-2 rounded-full bg-danger" title="有选中的风险" />
              )}
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <Resizer
                  onResize={(delta) => {
                    const newWidth = Math.max(280, Math.min(560, contextPanelWidth + delta))
                    setContextPanelWidth(newWidth)
                  }}
                />
              </div>
              <div
                className="hidden lg:block flex-shrink-0"
                style={{ width: `${contextPanelWidth}px` }}
              >
                <ContextPanel
                  selectedRisk={selectedRisk}
                  hasResult={!!result}
                  riskFeedback={riskFeedback}
                  onClose={() => setSelectedRisk(null)}
                  onGenerateDraft={generateDraft}
                  onFeedback={handleFeedback}
                  onEvidenceClick={handleEvidenceClick}
                  riskStatus={selectedRisk ? getRiskStatus(selectedRisk.id) : 'pending'}
                  onStatusChange={setRiskStatus}
                  notes={selectedRisk ? (getRiskNotes(selectedRisk.id)?.content ?? null) : null}
                  notesUpdatedAt={
                    selectedRisk ? (getRiskNotes(selectedRisk.id)?.updatedAt ?? null) : null
                  }
                  onNotesChange={setRiskNotes}
                  onOpenRiskDetail={(risk) => {
                    setSelectedRisk(risk)
                    setRiskDetailModalOpen(true)
                  }}
                  onCollapse={() => setContextPanelCollapsed(true)}
                />
              </div>
            </>
          )}

          {/* 移动端 ContextPanel 触发按钮 */}
          {selectedRisk && (
            <button
              className="lg:hidden fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-accent text-paper shadow-lg flex items-center justify-center hover:bg-accent-soft transition-colors"
              onClick={() => setMobileContextOpen(true)}
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* 移动端 ContextPanel 抽屉 */}
      {mobileContextOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileContextOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-paper rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <ContextPanel
                selectedRisk={selectedRisk}
                hasResult={!!result}
                riskFeedback={riskFeedback}
                onClose={() => setMobileContextOpen(false)}
                onGenerateDraft={generateDraft}
                onFeedback={handleFeedback}
                onEvidenceClick={handleEvidenceClick}
                riskStatus={selectedRisk ? getRiskStatus(selectedRisk.id) : 'pending'}
                onStatusChange={setRiskStatus}
                notes={selectedRisk ? (getRiskNotes(selectedRisk.id)?.content ?? null) : null}
                notesUpdatedAt={
                  selectedRisk ? (getRiskNotes(selectedRisk.id)?.updatedAt ?? null) : null
                }
                onNotesChange={setRiskNotes}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddSourceModal
        isOpen={showAddSource}
        onClose={() => setShowAddSource(false)}
        onAddSource={handleAddSource}
      />

      <SourceDetailModal
        source={sourceDetailModalSource}
        onClose={() => {
          setSourceDetailModalSource(null)
          setSourceDetailModalHighlight('')
        }}
        onReparse={(id) => {
          reparseSource(id)
        }}
        highlightText={sourceDetailModalHighlight}
      />

      <RiskDetailModal
        risk={riskDetailModalOpen && selectedRisk ? selectedRisk : null}
        onClose={() => {
          setRiskDetailModalOpen(false)
        }}
        onFeedback={handleFeedback}
        onEvidenceClick={handleEvidenceClick}
        riskStatus={selectedRisk ? getRiskStatus(selectedRisk.id) : 'pending'}
        onStatusChange={setRiskStatus}
        notes={selectedRisk ? (getRiskNotes(selectedRisk.id)?.content ?? null) : null}
        notesUpdatedAt={selectedRisk ? (getRiskNotes(selectedRisk.id)?.updatedAt ?? null) : null}
        onNotesChange={setRiskNotes}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        loggingIn={loggingIn}
        onWechatLogin={login}
        onEmailLogin={emailLogin}
        onRegister={register}
        onFetchQrCode={fetchWechatQrCode}
        onStartPolling={startWechatPolling}
        onStopPolling={stopWechatPolling}
        qrCodeUrl={qrCodeUrl}
        pollingStatus={pollingStatus}
        pollingMessage={pollingMessage}
        emailLoginError={emailLoginError?.message || null}
        registerError={registerError?.message || null}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareLink={shareLink}
        shareExpired={shareExpired}
        onCopy={handleCopyShareLink}
        copied={false}
        creatingShare={creatingShare}
        viewCount={shareViewCount}
        isShared={!!shareLink}
        onExpiryChange={handleExpiryChange}
        selectedExpiry={shareExpiryDays}
      />

      <HistoryPanel
        isOpen={_showHistory}
        tasks={taskHistory}
        isDemo={isDemoMode}
        onClose={() => setShowHistory(false)}
        onSelectTask={handleSelectHistory}
        onSelectSnapshot={handleSelectSnapshot}
        onDeleteTask={handleDeleteHistory}
        onCompare={handleCompareSnapshots}
      />

      <HistoryDiffPanel
        isOpen={showDiff}
        snapshotA={diffSnapshotA}
        snapshotB={diffSnapshotB}
        onClose={() => setShowDiff(false)}
        onViewSnapshot={(snapshot) => {
          setShowDiff(false)
          handleSelectSnapshot(snapshot)
        }}
      />

      {showPreferencePanel && (
        <PreferencePanel
          onClose={() => setShowPreferencePanel(false)}
          prefs={sources.some((s) => s.id.startsWith('demo_')) ? result?.preferences : undefined}
        />
      )}

      {showModelSettings && <ModelSettingsPanel onClose={() => setShowModelSettings(false)} />}

      {showMonitorPanel && (
        <MonitorPanel
          onClose={() => setShowMonitorPanel(false)}
          stats={sources.some((s) => s.id.startsWith('demo_')) ? DEMO_SYS_STATS : undefined}
        />
      )}

      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      <DraftModal
        isOpen={_showDraft}
        onClose={() => useAnalysisStore.getState().setShowDraft(false)}
        draftText={_draftText}
        generating={_generatingDraft}
        riskTitle={selectedRisk?.title || ''}
        onRegenerate={() => {
          if (selectedRisk) {
            generateDraft(selectedRisk)
          }
        }}
        onAdopt={(text) => {
          console.log('Adopted draft:', text)
        }}
      />

      {globalDragOver && (
        <div className="fixed inset-0 z-[2000] bg-paper/90 backdrop-blur-md border-4 border-dashed border-accent pointer-events-none">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-accent-bg flex items-center justify-center mb-5 border border-accent-faint">
              <UploadCloud size={36} strokeWidth={1.5} className="text-accent" />
            </div>
            <div className="text-xl font-semibold text-ink font-display tracking-tight">
              释放文件以添加材料
            </div>
            <div className="text-sm text-ink-muted mt-2 font-body">
              支持 TXT、PDF、Word、图片等多种格式
            </div>
          </div>
        </div>
      )}

      <ProductTour
        steps={tourSteps}
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        localStorageKey="youju_workspace_tour"
      />

      {/* Kami-styled print report — rendered via portal in ExportMenu */}
    </div>
  )
}
