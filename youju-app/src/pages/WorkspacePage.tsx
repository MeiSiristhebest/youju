import { useCallback, useEffect, useState } from 'react'
import type { TourStep } from '../components/common/ProductTour'
import type { PrintStyle } from '../components/print/PrintReport'
import { WorkspaceLayout } from '../components/workspace/WorkspaceLayout'
import { WorkspaceModals } from '../components/workspace/WorkspaceModals'
import { useChat } from '../hooks/useChat'
import { useWorkspaceHandlers } from '../hooks/useWorkspaceHandlers'
import {
  CHAT_TAB_ID,
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
  const [showModelSettings, setShowModelSettings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showBilling, setShowBilling] = useState(false)
  const [showTeamPanel, setShowTeamPanel] = useState(false)
  const [showTemplateMarket, setShowTemplateMarket] = useState(false)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [showApiLogs, setShowApiLogs] = useState(false)
  const [showTaskSwitcher, setShowTaskSwitcher] = useState(false)

  const tourSteps: TourStep[] = [
    {
      id: 'scenario-selection',
      target: '#tour-new-analysis-btn',
      title: '选择你的分析场景',
      description: '有据支持多种场景，选择一个开始你的第一次分析',
      placement: 'right',
    },
    {
      id: 'upload-materials',
      target: '#tour-add-source-btn',
      title: '上传你的材料',
      description: '支持文本粘贴、文件上传、URL 抓取，多种方式快速导入材料',
      placement: 'bottom',
    },
    {
      id: 'view-risks',
      target: '#tour-risks-tab',
      title: 'AI 自动发现风险',
      description: 'AI 会交叉验证多源信息，自动识别矛盾、缺失和承诺',
      placement: 'bottom',
    },
    {
      id: 'export-report',
      target: '#tour-export-btn',
      title: '导出和分享',
      description: '一键导出分析报告，或生成分享链接发送给团队成员',
      placement: 'bottom',
    },
  ]

  const sources = useSourceStore((s) => s.sources)
  const showProductTour = useUIPreferenceStore((s) => s.showProductTour)
  const setShowProductTour = useUIPreferenceStore((s) => s.setShowProductTour)

  // 接入 chat store：读取活跃会话 ID 与上下文范围（页面级订阅）
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const contextScope = useChatStore((s) => s.contextScope)
  // 接入 useChat hook：在页面顶层初始化 React Query（会话列表/消息预加载）
  useChat()
  // 接入 workspace tabs store：判断当前是否为对话 tab
  const activeTabId = useWorkspaceTabsStore((s) => s.activeTabId)
  const isChatActive = activeTabId === CHAT_TAB_ID

  useEffect(() => {
    const hasCompletedTour = localStorage.getItem('youju_tour_completed')
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

  // 切换到对话 tab：供 sidebar "AI 对话" 入口调用
  const handleShowChat = useCallback(() => {
    // 订阅读取 activeConversationId / contextScope，确保页面感知 chat 状态变化
    void activeConversationId
    void contextScope
    useWorkspaceTabsStore.getState().setActiveTab(CHAT_TAB_ID)
  }, [activeConversationId, contextScope])

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
      onShowPreference={() => state.setShowPreferencePanel(true)}
      onShowModelSettings={() => setShowModelSettings(true)}
      onShowMonitor={() => state.setShowMonitorPanel(true)}
      onShowTeam={() => setShowTeamPanel(true)}
      onShowTemplates={() => setShowTemplateMarket(true)}
      onShowApiSettings={() => setShowApiSettings(true)}
      onShowApiLogs={() => setShowApiLogs(true)}
      onShowBilling={() => setShowBilling(true)}
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
      isChatActive={isChatActive}
      scenarioType={state.currentScenario || undefined}
      onShowChat={handleShowChat}
    >
      <WorkspaceModals
        showAddSource={state.showAddSource}
        showLoginModal={state.showLoginModal}
        showShareModal={state.showShareModal}
        showPreferencePanel={state.showPreferencePanel}
        showMonitorPanel={state.showMonitorPanel}
        showKeyboardShortcuts={state.showKeyboardShortcuts}
        showModelSettings={showModelSettings}
        showNotifications={showNotifications}
        showGlobalSearch={showGlobalSearch}
        showBilling={showBilling}
        showTeamPanel={showTeamPanel}
        showTemplateMarket={showTemplateMarket}
        showApiSettings={showApiSettings}
        showApiLogs={showApiLogs}
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
        riskFeedback={state.riskFeedback}
        draftText={state._draftText}
        generatingDraft={state._generatingDraft}
        shareLink={state.shareLink}
        shareExpired={state.shareExpired}
        creatingShare={state.creatingShare}
        shareViewCount={state.shareViewCount}
        shareExpiryDays={state.shareExpiryDays}
        sharePermission={state.sharePermission}
        user={state.user}
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
        onViewSnapshotFromDiff={handlers.handleSelectSnapshot}
        onClosePreference={() => state.setShowPreferencePanel(false)}
        onCloseModelSettings={() => setShowModelSettings(false)}
        onCloseMonitor={() => state.setShowMonitorPanel(false)}
        onCloseKeyboardShortcuts={() => state.setShowKeyboardShortcuts(false)}
        onCloseDraft={() => useAnalysisStore.getState().setShowDraft(false)}
        onRegenerateDraft={() => {
          if (state.selectedRisk) {
            state.generateDraft(state.selectedRisk)
          }
        }}
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
        onBillingChange={setShowBilling}
        onTeamPanelChange={setShowTeamPanel}
        onTemplateMarketChange={setShowTemplateMarket}
        onApplyTemplate={(id) => handlers.handleLoadScenario(id as ScenarioType)}
        onApiSettingsChange={setShowApiSettings}
        onApiLogsChange={setShowApiLogs}
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
    </WorkspaceLayout>
  )
}
