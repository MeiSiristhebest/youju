import { useCallback, useEffect, useRef, useState } from 'react'
import type { TourStep } from '../components/common/ProductTour'
import { TeamPanelContent } from '../components/common/TeamPanelContent'
import { TemplateMarketContent } from '../components/common/TemplateMarketContent'
import type { PrintStyle } from '../components/print/PrintReport'
import { ApiLogContent } from '../components/workspace/ApiLogContent'
import { ApiSettingsContent } from '../components/workspace/ApiSettingsContent'
import { BillingContent } from '../components/workspace/BillingContent'
import { ModelSettingsContent } from '../components/workspace/ModelSettingsContent'
import { MonitorContent } from '../components/workspace/MonitorContent'
import type { OverlayPanelType } from '../components/workspace/OverlayPanel'
import { OverlayPanel } from '../components/workspace/OverlayPanel'
import { PreferenceContent } from '../components/workspace/PreferenceContent'
import { WorkspaceLayout } from '../components/workspace/WorkspaceLayout'
import { WorkspaceModals } from '../components/workspace/WorkspaceModals'
import { useChat } from '../hooks/useChat'
import { useWorkspaceHandlers } from '../hooks/useWorkspaceHandlers'
import { storage, storageKeys } from '../lib/storage'
import { sourceApi } from '../services/sourceApi'
import { taskApi } from '../services/taskApi'
import {
  useAnalysisStore,
  useChatStore,
  useSourceStore,
  useUIPreferenceStore,
  useWorkspaceTabsStore,
} from '../stores'
import type { HistorySnapshot, ScenarioType, Source } from '../types'

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
  const [showHistoryDetail, setShowHistoryDetail] = useState(false)
  const [detailSnapshot, setDetailSnapshot] = useState<HistorySnapshot | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [printStyle, setPrintStyle] = useState<PrintStyle>('standard')
  const [sourceDetailModalSource, setSourceDetailModalSource] = useState<Source | null>(null)
  const [sourceDetailModalHighlight, setSourceDetailModalHighlight] = useState<string>('')
  const [riskDetailModalOpen, setRiskDetailModalOpen] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])
  const [sourcePanelWidth, setSourcePanelWidth] = useState(320)
  const [contextPanelWidth, setContextPanelWidth] = useState(320)
  const [sourcePanelCollapsed, setSourcePanelCollapsed] = useState(false)
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeOverlayPanel, setActiveOverlayPanel] = useState<OverlayPanelType>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showTaskSwitcher, setShowTaskSwitcher] = useState(false)

  const tourSteps: TourStep[] = [
    {
      id: 'sidebar-intro',
      target: '#tour-sidebar',
      title: '左侧导航栏',
      description: '这里是你的工作台入口，可以新建分析、查看历史记录、选择不同的分析场景',
      placement: 'right',
      highlightPadding: 12,
    },
    {
      id: 'new-analysis',
      target: '#tour-new-analysis-btn',
      title: '新建分析',
      description: '点击这里选择你的分析场景，有据支持合同审查、尽职调查、文献综述等多种场景',
      placement: 'right',
      highlightPadding: 8,
    },
    {
      id: 'source-panel',
      target: '#tour-source-panel',
      title: '材料面板',
      description: '左侧面板用于管理你上传的所有材料，支持文本、文件、URL 多种格式',
      placement: 'right',
      highlightPadding: 8,
    },
    {
      id: 'add-source',
      target: '#tour-add-source-btn',
      title: '添加材料',
      description: '点击 + 号添加材料，支持粘贴文本、上传文件、抓取网页 URL 三种方式',
      placement: 'bottom',
      highlightPadding: 8,
    },
    {
      id: 'start-analysis',
      target: '#tour-analyze-btn',
      title: '开始分析',
      description: '添加好材料后，点击右上角的"开始分析"，AI 会自动交叉验证多源信息',
      placement: 'bottom',
      highlightPadding: 8,
    },
    {
      id: 'keyboard-shortcuts',
      target: 'button[title="快捷键 (?)"]',
      title: '快捷键支持',
      description: '按 ? 键随时查看所有快捷键，熟练使用可以大幅提升效率',
      placement: 'bottom',
      highlightPadding: 8,
    },
  ]

  const sources = useSourceStore((s) => s.sources)
  const currentTaskId = useSourceStore((s) => s.currentTaskId)
  const isDemo = useSourceStore((s) => s.isDemo)
  const showProductTour = useUIPreferenceStore((s) => s.showProductTour)
  const setShowProductTour = useUIPreferenceStore((s) => s.setShowProductTour)

  // 接入 chat store：读取活跃会话 ID 与上下文范围（页面级订阅，确保状态更新时重渲染）
  const _activeConversationId = useChatStore((s) => s.activeConversationId)
  const _contextScope = useChatStore((s) => s.contextScope)
  // 接入 useChat hook：在页面顶层初始化 React Query（会话列表/消息预加载）
  useChat(currentTaskId ?? undefined)

  // 进入工作台时的统一初始化：恢复标签任务，或创建默认任务
  // 合并为单个 useEffect 避免竞态和重复判断
  const initRef = useRef(false)
  useEffect(() => {
    if (isDemo) return
    if (currentTaskId) return
    if (initRef.current) return

    const tabsState = useWorkspaceTabsStore.getState()
    const activeTab = tabsState.tabs.find((t) => t.id === tabsState.activeTabId)

    // 情况1：活跃标签有 taskId，从标签恢复任务
    if (activeTab?.taskId) {
      initRef.current = true
      const restoreFromTab = async () => {
        try {
          const task = await taskApi.getTask(activeTab.taskId!)
          const srcList = await sourceApi.listSources(activeTab.taskId!)

          useSourceStore.getState().setCurrentTask({ id: task.id, title: task.title })
          useSourceStore.getState().setCurrentScenario(task.scenarioType as ScenarioType)
          useSourceStore.getState().setSources(srcList)

          if (task.result) {
            useAnalysisStore.getState().setResult(task.result as any)
            useAnalysisStore.getState().setChecklist(task.result.checklist || [])
          }
        } catch (error) {
          console.error('Failed to restore task from tab:', error)
        } finally {
          initRef.current = false
        }
      }
      restoreFromTab()
      return
    }

    // 情况2：没有任务且没有材料，创建默认任务
    const hasTabWithTask = tabsState.tabs.some((t) => t.taskId)
    if (!hasTabWithTask && sources.length === 0) {
      initRef.current = true
      const initDefaultTask = async () => {
        try {
          const task = await taskApi.createTask({
            title: '未命名分析',
            scenarioType: 'custom',
            sourceIds: [],
          })
          useSourceStore.getState().setCurrentTask({ id: task.id, title: task.title })
          useSourceStore.getState().setCurrentScenario('custom')
          useWorkspaceTabsStore.getState().openTab('custom', '未命名分析')
        } catch (error) {
          console.error('Failed to create default task:', error)
        } finally {
          initRef.current = false
        }
      }
      initDefaultTask()
    }
  }, [currentTaskId, isDemo, sources.length])

  useEffect(() => {
    const hasCompletedTour = storage.getItem(storageKeys.tourCompleted)
    if (!hasCompletedTour && sources.length === 0) {
      setShowTour(true)
    }
  }, [sources.length])

  useEffect(() => {
    if (showProductTour) {
      setShowTour(true)
      setShowProductTour(false)
    }
  }, [showProductTour, setShowProductTour])

  const { handlers, state } = useWorkspaceHandlers({
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
    showModelSettings: activeOverlayPanel === 'model-settings',
    showNotifications,
    showGlobalSearch,
    showBilling: activeOverlayPanel === 'billing',
    showTeamPanel: activeOverlayPanel === 'team',
    showTemplateMarket: activeOverlayPanel === 'templates',
    showApiSettings: activeOverlayPanel === 'api-settings',
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
    setShowModelSettings: (v: boolean) => setActiveOverlayPanel(v ? 'model-settings' : null),
    setShowNotifications,
    setShowGlobalSearch,
    setShowBilling: (v: boolean) => setActiveOverlayPanel(v ? 'billing' : null),
    setShowTeamPanel: (v: boolean) => setActiveOverlayPanel(v ? 'team' : null),
    setShowTemplateMarket: (v: boolean) => setActiveOverlayPanel(v ? 'templates' : null),
    setShowApiSettings: (v: boolean) => setActiveOverlayPanel(v ? 'api-settings' : null),
    setShowTaskSwitcher,
  })

  const handleSourcePanelResize = (delta: number) => {
    const newWidth = Math.max(280, Math.min(560, sourcePanelWidth + delta))
    setSourcePanelWidth(newWidth)
  }

  const handleContextPanelResize = (delta: number) => {
    const newWidth = Math.max(280, Math.min(560, contextPanelWidth + delta))
    setContextPanelWidth(newWidth)
  }

  return (
    <WorkspaceLayout
      onGoHome={onGoHome}
      sidebarCollapsed={sidebarCollapsed}
      sourcePanelCollapsed={sourcePanelCollapsed}
      contextPanelCollapsed={contextPanelCollapsed}
      sourcePanelWidth={sourcePanelWidth}
      contextPanelWidth={contextPanelWidth}
      mobileSidebarOpen={mobileSidebarOpen}
      mobileContextOpen={mobileContextOpen}
      globalDragOver={state.globalDragOver}
      showTour={showTour}
      tourSteps={tourSteps}
      sources={state.sources}
      selectedSourceId={state.selectedSourceId}
      currentScenario={state.currentScenario}
      scenario={state.scenario}
      result={state.result}
      analyzing={state.analyzing}
      selectedRisk={state.selectedRisk}
      pendingRisks={state.pendingRisks}
      totalUnresolved={state.totalUnresolved}
      user={state.user}
      showExportMenu={showExportMenu}
      printStyle={printStyle}
      sourceDetailModalSource={sourceDetailModalSource}
      riskDetailModalOpen={riskDetailModalOpen}
      isDemoMode={state.isDemoMode}
      riskFeedback={state.riskFeedback}
      taskStatus={state.taskStatus}
      streamProgress={state.streamProgress}
      streamError={state.streamError}
      lastErrorTimestamp={state.lastErrorTimestamp}
      analysisLogs={state.analysisLogs}
      onSidebarCollapse={() => setSidebarCollapsed(true)}
      onSidebarExpand={() => setSidebarCollapsed(false)}
      onMobileSidebarOpen={() => setMobileSidebarOpen(true)}
      onMobileSidebarClose={() => setMobileSidebarOpen(false)}
      onMobileContextOpen={() => setMobileContextOpen(true)}
      onMobileContextClose={() => setMobileContextOpen(false)}
      onSourcePanelCollapse={() => setSourcePanelCollapsed(true)}
      onSourcePanelExpand={() => setSourcePanelCollapsed(false)}
      onContextPanelCollapse={() => setContextPanelCollapsed(true)}
      onContextPanelExpand={() => setContextPanelCollapsed(false)}
      onSourcePanelResize={handleSourcePanelResize}
      onContextPanelResize={handleContextPanelResize}
      onNewAnalysis={handlers.handleNewAnalysis}
      onLoadScenario={handlers.handleLoadScenario}
      onShowHistory={handlers.handleShowHistory}
      onShowLogin={() => state.setShowLoginModal(true)}
      onLogout={state.logout}
      onShowPreference={() => setActiveOverlayPanel('preferences')}
      onShowModelSettings={() => setActiveOverlayPanel('model-settings')}
      onShowMonitor={() => setActiveOverlayPanel('monitor')}
      onShowTeam={() => setActiveOverlayPanel('team')}
      onShowTemplates={() => setActiveOverlayPanel('templates')}
      onShowApiSettings={() => setActiveOverlayPanel('api-settings')}
      onShowApiLogs={() => setActiveOverlayPanel('api-logs')}
      onShowBilling={() => setActiveOverlayPanel('billing')}
      onShowShare={handlers.handleShare}
      onAnalyze={handlers.handleAnalyze}
      onRetryAnalysis={handlers.handleAnalyze}
      onShowKeyboardShortcuts={() => state.setShowKeyboardShortcuts(true)}
      onShowExportMenuChange={setShowExportMenu}
      onPrintStyleChange={setPrintStyle}
      onShowNotifications={() => setShowNotifications(true)}
      onShowSearch={() => setShowGlobalSearch(true)}
      onSelectSource={state.setSelectedSourceId}
      onAddSource={() => state.setShowAddSource(true)}
      onDeleteSource={state._deleteSource}
      onReparseSource={state.reparseSource}
      onOpenSourceDetail={setSourceDetailModalSource}
      onSelectRisk={handlers._handleSelectRisk}
      onCancelAnalysis={state.cancelAnalysis}
      onEvidenceClick={handlers.handleEvidenceClick}
      onFeedback={handlers.handleFeedback}
      onGenerateDraft={state.generateDraft}
      onRiskStatusChange={state.setRiskStatus}
      onRiskNotesChange={state.setRiskNotes}
      onOpenRiskDetail={(risk) => {
        state.setSelectedRisk(risk)
        setRiskDetailModalOpen(true)
      }}
      onCloseContextPanel={() => state.setSelectedRisk(null)}
      getRiskStatus={state.getRiskStatus}
      getRiskNotes={state.getRiskNotes}
      onGlobalDragOver={(e) => {
        e.preventDefault()
        state.setGlobalDragOver(true)
      }}
      onGlobalDragLeave={() => state.setGlobalDragOver(false)}
      onGlobalDrop={handlers.handleGlobalDrop}
      onTourClose={() => setShowTour(false)}
      scenarioType={state.currentScenario || undefined}
      activeOverlayPanel={activeOverlayPanel}
      onGoDesk={() => setActiveOverlayPanel(null)}
    >
      <WorkspaceModals
        showAddSource={state.showAddSource}
        showLoginModal={state.showLoginModal}
        showShareModal={state.showShareModal}
        showKeyboardShortcuts={state.showKeyboardShortcuts}
        showNotifications={showNotifications}
        showGlobalSearch={showGlobalSearch}
        showTaskSwitcher={showTaskSwitcher}
        showHistory={state._showHistory}
        showHistoryDetail={showHistoryDetail}
        showDiff={showDiff}
        showDraft={state._showDraft}
        sidebarCollapsed={sidebarCollapsed}
        sourcePanelCollapsed={sourcePanelCollapsed}
        contextPanelCollapsed={contextPanelCollapsed}
        riskDetailModalOpen={riskDetailModalOpen}
        sourceDetailModalSource={sourceDetailModalSource}
        sourceDetailModalHighlight={sourceDetailModalHighlight}
        selectedRisk={state.selectedRisk}
        diffSnapshotA={diffSnapshotA}
        diffSnapshotB={diffSnapshotB}
        detailSnapshot={detailSnapshot}
        droppedFiles={droppedFiles}
        taskHistory={state.taskHistory}
        isDemoMode={state.isDemoMode}
        sources={state.sources}
        result={state.result}
        draftText={state._draftText}
        generatingDraft={state._generatingDraft}
        shareLink={state.shareLink}
        shareExpired={state.shareExpired}
        creatingShare={state.creatingShare}
        shareViewCount={state.shareViewCount}
        shareExpiryDays={state.shareExpiryDays}
        sharePermission={state.sharePermission}
        loggingIn={state.loggingIn}
        qrCodeUrl={state.qrCodeUrl}
        pollingStatus={state.pollingStatus}
        pollingMessage={state.pollingMessage}
        emailLoginError={state.emailLoginError}
        registerError={state.registerError}
        onCloseAddSource={() => {
          state.setShowAddSource(false)
          setDroppedFiles([])
        }}
        onAddSource={handlers.handleAddSource}
        onCloseSourceDetail={() => {
          setSourceDetailModalSource(null)
          setSourceDetailModalHighlight('')
        }}
        onReparseSource={state.reparseSource}
        onCloseRiskDetail={() => {
          setRiskDetailModalOpen(false)
        }}
        onFeedback={handlers.handleFeedback}
        onEvidenceClick={handlers.handleEvidenceClick}
        onRiskStatusChange={state.setRiskStatus}
        onRiskNotesChange={state.setRiskNotes}
        getRiskStatus={state.getRiskStatus}
        getRiskNotes={state.getRiskNotes}
        onCloseLogin={() => state.setShowLoginModal(false)}
        onWechatLogin={state.login}
        onEmailLogin={state.emailLogin}
        onRegister={state.register}
        onFetchQrCode={state.fetchWechatQrCode}
        onStartPolling={state.startWechatPolling}
        onStopPolling={state.stopWechatPolling}
        onCloseShare={() => state.setShowShareModal(false)}
        onCopyShareLink={handlers.handleCopyShareLink}
        onExpiryChange={handlers.handleExpiryChange}
        onPermissionChange={handlers.handlePermissionChange}
        onCloseHistory={() => state.setShowHistory(false)}
        onSelectHistoryTask={handlers.handleSelectHistory}
        onSelectSnapshot={handlers.handleSelectSnapshot}
        onViewSnapshot={handlers.handleViewSnapshot}
        onRestoreSnapshot={handlers.handleRestoreSnapshot}
        onDeleteHistoryTask={handlers.handleDeleteHistory}
        onCompareSnapshots={handlers.handleCompareSnapshots}
        onCloseHistoryDetail={() => setShowHistoryDetail(false)}
        onRestoreFromDetail={handlers.handleRestoreSnapshot}
        onCompareWithCurrent={handlers.handleCompareWithCurrent}
        onCloseDiff={() => setShowDiff(false)}
        onCloseKeyboardShortcuts={() => state.setShowKeyboardShortcuts(false)}
        onCloseDraft={() => useAnalysisStore.getState().setShowDraft(false)}
        onAdoptDraft={(text) => {
          navigator.clipboard
            ?.writeText(text)
            .then(() => {
              useAnalysisStore.getState().setShowDraft(false)
            })
            .catch(() => {
              useAnalysisStore.getState().setShowDraft(false)
            })
        }}
        generateDraft={state.generateDraft}
        onNotificationsChange={setShowNotifications}
        onGlobalSearchChange={setShowGlobalSearch}
        onGlobalSearchNavigate={(dest) => {
          handlers.handleLoadScenario(dest as ScenarioType)
        }}
        onTaskSwitcherChange={setShowTaskSwitcher}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        onToggleSourcePanel={() => setSourcePanelCollapsed((prev) => !prev)}
        onToggleContextPanel={() => setContextPanelCollapsed((prev) => !prev)}
        onNewAnalysis={(scenarioId) => handlers.handleLoadScenario(scenarioId)}
        onUploadSource={() => state.setShowAddSource(true)}
        onExportReport={() => {
          // 导出报告功能占位
        }}
      />

      {/* 全屏覆盖面板 */}
      <OverlayPanel type={activeOverlayPanel} sidebarCollapsed={sidebarCollapsed}>
        {activeOverlayPanel === 'team' && (
          <TeamPanelContent onClose={() => setActiveOverlayPanel(null)} />
        )}
        {activeOverlayPanel === 'templates' && (
          <TemplateMarketContent
            onApplyTemplate={(id) => {
              handlers.handleLoadScenario(id)
              setActiveOverlayPanel(null)
            }}
            onClose={() => setActiveOverlayPanel(null)}
          />
        )}
        {activeOverlayPanel === 'preferences' && (
          <PreferenceContent
            prefs={
              state.sources.some((s) => s.id.startsWith('demo_'))
                ? state.result?.preferences
                : undefined
            }
            onClose={() => setActiveOverlayPanel(null)}
          />
        )}
        {activeOverlayPanel === 'model-settings' && (
          <ModelSettingsContent onClose={() => setActiveOverlayPanel(null)} />
        )}
        {activeOverlayPanel === 'monitor' && (
          <MonitorContent onClose={() => setActiveOverlayPanel(null)} />
        )}
        {activeOverlayPanel === 'api-settings' && (
          <ApiSettingsContent onClose={() => setActiveOverlayPanel(null)} />
        )}
        {activeOverlayPanel === 'api-logs' && (
          <ApiLogContent onClose={() => setActiveOverlayPanel(null)} />
        )}
        {activeOverlayPanel === 'billing' && (
          <BillingContent onClose={() => setActiveOverlayPanel(null)} />
        )}
      </OverlayPanel>
    </WorkspaceLayout>
  )
}
