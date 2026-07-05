import { DEMO_SYS_STATS } from '../../constants/demoData'
import type {
  HistorySnapshot,
  Risk,
  RiskStatus,
  ScenarioType,
  SharePermission,
  Source,
  TaskRecord,
} from '../../types'
import { ApiSettingsPanel } from '../common/ApiSettingsPanel'
import { BillingModal } from '../common/BillingModal'
import { CommandPalette } from '../common/CommandPalette'
import { KeyboardShortcutsModal } from '../common/KeyboardShortcutsModal'
import { NotificationCenter } from '../common/NotificationCenter'
import { TaskSwitcher } from '../common/TaskSwitcher'
import { TeamPanel } from '../common/TeamPanel'
import { TemplateMarket } from '../common/TemplateMarket'
import { AddSourceModal } from '../modals/AddSourceModal'
import { DraftModal } from '../modals/DraftModal'
import { LoginModal } from '../modals/LoginModal'
import { RiskDetailModal } from '../modals/RiskDetailModal'
import { ShareModal } from '../modals/ShareModal'
import { SourceDetailModal } from '../modals/SourceDetailModal'
import { ApiLogPanel } from './ApiLogPanel'
import { HistoryDetailPanel } from './HistoryDetailPanel'
import { HistoryDiffPanel } from './HistoryDiffPanel'
import { HistoryPanel } from './HistoryPanel'
import { ModelSettingsPanel } from './ModelSettingsPanel'
import { MonitorPanel } from './MonitorPanel'
import { PreferencePanel } from './PreferencePanel'

interface WorkspaceModalsProps {
  showAddSource: boolean
  showLoginModal: boolean
  showShareModal: boolean
  showPreferencePanel: boolean
  showMonitorPanel: boolean
  showKeyboardShortcuts: boolean
  showModelSettings: boolean
  showNotifications: boolean
  showGlobalSearch: boolean
  showBilling: boolean
  showTeamPanel: boolean
  showTemplateMarket: boolean
  showApiSettings: boolean
  showApiLogs: boolean
  showTaskSwitcher: boolean
  showHistory: boolean
  showHistoryDetail: boolean
  showDiff: boolean
  showDraft: boolean
  sidebarCollapsed: boolean
  sourcePanelCollapsed: boolean
  contextPanelCollapsed: boolean
  riskDetailModalOpen: boolean
  sourceDetailModalSource: Source | null
  sourceDetailModalHighlight: string
  selectedRisk: Risk | null
  diffSnapshotA: HistorySnapshot | null
  diffSnapshotB: HistorySnapshot | null
  detailSnapshot: HistorySnapshot | null
  droppedFiles: File[]
  taskHistory: TaskRecord[]
  isDemoMode: boolean
  sources: Source[]
  result: any
  riskFeedback: Record<string, 'accurate' | 'inaccurate'>
  draftText: string
  generatingDraft: boolean
  shareLink: string
  shareExpired: string
  creatingShare: boolean
  shareViewCount: number
  shareExpiryDays: number | null
  sharePermission: SharePermission
  user: { id: number; nickname: string; avatar: string; phone?: string } | null
  loggingIn: boolean
  qrCodeUrl: string | null
  pollingStatus: 'idle' | 'polling' | 'success' | 'failed'
  pollingMessage: string
  emailLoginError: { message: string } | null
  registerError: { message: string } | null
  onCloseAddSource: () => void
  onAddSource: (source: Source) => void
  onCloseSourceDetail: () => void
  onReparseSource: (id: string) => void
  onCloseRiskDetail: () => void
  onFeedback: (riskId: string, feedback: 'accurate' | 'inaccurate') => void
  onEvidenceClick: (sourceId: string, quote: string) => void
  onRiskStatusChange: (riskId: string, status: RiskStatus) => void
  onRiskNotesChange: (riskId: string, notes: string) => void
  getRiskStatus: (riskId: string) => RiskStatus
  getRiskNotes: (riskId: string) => { content: string | null; updatedAt: string | null } | null
  onCloseLogin: () => void
  onWechatLogin: () => void
  onEmailLogin: (email: string, password: string) => void
  onRegister: (email: string, password: string, nickname: string) => void
  onFetchQrCode: () => void
  onStartPolling: () => void
  onStopPolling: () => void
  onCloseShare: () => void
  onCopyShareLink: () => void
  onExpiryChange: (days: number | null) => void
  onPermissionChange: (permission: SharePermission) => void
  onCloseHistory: () => void
  onSelectHistoryTask: (task: TaskRecord) => void
  onSelectSnapshot: (snapshot: HistorySnapshot) => void
  onViewSnapshot: (snapshot: HistorySnapshot) => void
  onRestoreSnapshot: (snapshot: HistorySnapshot) => void
  onDeleteHistoryTask: (taskId: string) => void
  onCompareSnapshots: (a: HistorySnapshot, b: HistorySnapshot) => void
  onCloseHistoryDetail: () => void
  onRestoreFromDetail: (snapshot: HistorySnapshot) => void
  onCompareWithCurrent: (snapshot: HistorySnapshot) => void
  onCloseDiff: () => void
  onViewSnapshotFromDiff: (snapshot: HistorySnapshot) => void
  onClosePreference: () => void
  onCloseModelSettings: () => void
  onCloseMonitor: () => void
  onCloseKeyboardShortcuts: () => void
  onCloseDraft: () => void
  onRegenerateDraft: () => void
  onAdoptDraft: (text: string) => void
  generateDraft: (risk: Risk) => void
  onNotificationsChange: (open: boolean) => void
  onGlobalSearchChange: (open: boolean) => void
  onGlobalSearchNavigate: (dest: string) => void
  onBillingChange: (open: boolean) => void
  onTeamPanelChange: (open: boolean) => void
  onTemplateMarketChange: (open: boolean) => void
  onApplyTemplate: (id: string) => void
  onApiSettingsChange: (open: boolean) => void
  onApiLogsChange: (open: boolean) => void
  onTaskSwitcherChange: (open: boolean) => void
  onToggleSidebar: () => void
  onToggleSourcePanel: () => void
  onToggleContextPanel: () => void
  onNewAnalysis: (scenarioId: ScenarioType) => void
  onUploadSource: () => void
  onExportReport: () => void
}

export function WorkspaceModals(props: WorkspaceModalsProps) {
  const {
    showAddSource,
    showLoginModal,
    showShareModal,
    showPreferencePanel,
    showMonitorPanel,
    showKeyboardShortcuts,
    showModelSettings,
    showNotifications,
    showGlobalSearch,
    showBilling,
    showTeamPanel,
    showTemplateMarket,
    showApiSettings,
    showApiLogs,
    showTaskSwitcher,
    showHistory,
    showHistoryDetail,
    showDiff,
    showDraft,
    sidebarCollapsed,
    sourcePanelCollapsed,
    contextPanelCollapsed,
    riskDetailModalOpen,
    sourceDetailModalSource,
    sourceDetailModalHighlight,
    selectedRisk,
    diffSnapshotA,
    diffSnapshotB,
    detailSnapshot,
    droppedFiles,
    taskHistory,
    isDemoMode,
    sources,
    result,
    riskFeedback,
    draftText,
    generatingDraft,
    shareLink,
    shareExpired,
    creatingShare,
    shareViewCount,
    shareExpiryDays,
    sharePermission,
    user,
    loggingIn,
    qrCodeUrl,
    pollingStatus,
    pollingMessage,
    emailLoginError,
    registerError,
    onCloseAddSource,
    onAddSource,
    onCloseSourceDetail,
    onReparseSource,
    onCloseRiskDetail,
    onFeedback,
    onEvidenceClick,
    onRiskStatusChange,
    onRiskNotesChange,
    getRiskStatus,
    getRiskNotes,
    onCloseLogin,
    onWechatLogin,
    onEmailLogin,
    onRegister,
    onFetchQrCode,
    onStartPolling,
    onStopPolling,
    onCloseShare,
    onCopyShareLink,
    onExpiryChange,
    onPermissionChange,
    onCloseHistory,
    onSelectHistoryTask,
    onSelectSnapshot,
    onViewSnapshot,
    onRestoreSnapshot,
    onDeleteHistoryTask,
    onCompareSnapshots,
    onCloseHistoryDetail,
    onRestoreFromDetail,
    onCompareWithCurrent,
    onCloseDiff,
    onViewSnapshotFromDiff,
    onClosePreference,
    onCloseModelSettings,
    onCloseMonitor,
    onCloseKeyboardShortcuts,
    onCloseDraft,
    onRegenerateDraft,
    onAdoptDraft,
    generateDraft,
    onNotificationsChange,
    onGlobalSearchChange,
    onGlobalSearchNavigate,
    onBillingChange,
    onTeamPanelChange,
    onTemplateMarketChange,
    onApplyTemplate,
    onApiSettingsChange,
    onApiLogsChange,
    onTaskSwitcherChange,
    onToggleSidebar,
    onToggleSourcePanel,
    onToggleContextPanel,
    onNewAnalysis,
    onUploadSource,
    onExportReport,
  } = props

  return (
    <>
      <AddSourceModal
        isOpen={showAddSource}
        onClose={onCloseAddSource}
        onAddSource={onAddSource}
        initialFiles={droppedFiles}
      />

      <SourceDetailModal
        source={sourceDetailModalSource}
        onClose={onCloseSourceDetail}
        onReparse={(id) => {
          onReparseSource(id)
        }}
        highlightText={sourceDetailModalHighlight}
      />

      <RiskDetailModal
        risk={riskDetailModalOpen && selectedRisk ? selectedRisk : null}
        onClose={onCloseRiskDetail}
        onFeedback={onFeedback}
        onEvidenceClick={onEvidenceClick}
        riskStatus={selectedRisk ? getRiskStatus(selectedRisk.id) : 'pending'}
        onStatusChange={onRiskStatusChange}
        notes={selectedRisk ? (getRiskNotes(selectedRisk.id)?.content ?? null) : null}
        notesUpdatedAt={selectedRisk ? (getRiskNotes(selectedRisk.id)?.updatedAt ?? null) : null}
        onNotesChange={onRiskNotesChange}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={onCloseLogin}
        loggingIn={loggingIn}
        onWechatLogin={onWechatLogin}
        onEmailLogin={onEmailLogin}
        onRegister={onRegister}
        onFetchQrCode={onFetchQrCode}
        onStartPolling={onStartPolling}
        onStopPolling={onStopPolling}
        qrCodeUrl={qrCodeUrl}
        pollingStatus={pollingStatus}
        pollingMessage={pollingMessage}
        emailLoginError={emailLoginError?.message || null}
        registerError={registerError?.message || null}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={onCloseShare}
        shareLink={shareLink}
        shareExpired={shareExpired}
        onCopy={onCopyShareLink}
        copied={false}
        creatingShare={creatingShare}
        viewCount={shareViewCount}
        isShared={!!shareLink}
        onExpiryChange={onExpiryChange}
        selectedExpiry={shareExpiryDays}
        onPermissionChange={onPermissionChange}
        selectedPermission={sharePermission}
      />

      <HistoryPanel
        isOpen={showHistory}
        tasks={taskHistory}
        isDemo={isDemoMode}
        onClose={onCloseHistory}
        onSelectTask={onSelectHistoryTask}
        onSelectSnapshot={onSelectSnapshot}
        onViewSnapshot={onViewSnapshot}
        onRestoreSnapshot={onRestoreSnapshot}
        onDeleteTask={onDeleteHistoryTask}
        onCompare={onCompareSnapshots}
      />

      <HistoryDetailPanel
        isOpen={showHistoryDetail}
        snapshot={detailSnapshot}
        onClose={onCloseHistoryDetail}
        onRestore={onRestoreFromDetail}
        onCompareWithCurrent={result ? onCompareWithCurrent : undefined}
      />

      <HistoryDiffPanel
        isOpen={showDiff}
        snapshotA={diffSnapshotA}
        snapshotB={diffSnapshotB}
        onClose={onCloseDiff}
        onViewSnapshot={(snapshot) => {
          onCloseDiff()
          onSelectSnapshot(snapshot)
        }}
      />

      {showPreferencePanel && (
        <PreferencePanel
          onClose={onClosePreference}
          prefs={sources.some((s) => s.id.startsWith('demo_')) ? result?.preferences : undefined}
        />
      )}

      {showModelSettings && <ModelSettingsPanel onClose={onCloseModelSettings} />}

      {showMonitorPanel && (
        <MonitorPanel
          onClose={onCloseMonitor}
          stats={sources.some((s) => s.id.startsWith('demo_')) ? DEMO_SYS_STATS : undefined}
        />
      )}

      <KeyboardShortcutsModal isOpen={showKeyboardShortcuts} onClose={onCloseKeyboardShortcuts} />

      <DraftModal
        isOpen={showDraft}
        onClose={onCloseDraft}
        draftText={draftText}
        generating={generatingDraft}
        riskTitle={selectedRisk?.title || ''}
        onRegenerate={() => {
          if (selectedRisk) {
            generateDraft(selectedRisk)
          }
        }}
        onAdopt={(text) => {
          onAdoptDraft(text)
        }}
      />

      <NotificationCenter isOpen={showNotifications} onOpenChange={onNotificationsChange} />

      <CommandPalette
        isOpen={showGlobalSearch}
        onOpenChange={onGlobalSearchChange}
        onNavigate={onGlobalSearchNavigate}
        onNewAnalysis={onNewAnalysis}
        onUploadSource={onUploadSource}
        onExportReport={onExportReport}
        onCopyShareLink={onCopyShareLink}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
        sourcePanelCollapsed={sourcePanelCollapsed}
        onToggleSourcePanel={onToggleSourcePanel}
        contextPanelCollapsed={contextPanelCollapsed}
        onToggleContextPanel={onToggleContextPanel}
      />

      <BillingModal isOpen={showBilling} onOpenChange={onBillingChange} />

      {showTeamPanel && (
        <div className="fixed top-0 right-0 bottom-0 w-80 z-40">
          <TeamPanel isOpen={showTeamPanel} onOpenChange={onTeamPanelChange} />
        </div>
      )}

      {showTemplateMarket && (
        <div className="fixed top-0 right-0 bottom-0 w-80 z-40">
          <TemplateMarket
            isOpen={showTemplateMarket}
            onOpenChange={onTemplateMarketChange}
            onApplyTemplate={(id) => onApplyTemplate(id)}
          />
        </div>
      )}

      {showApiSettings && (
        <div className="fixed top-0 right-0 bottom-0 w-80 z-40">
          <ApiSettingsPanel isOpen={showApiSettings} onOpenChange={onApiSettingsChange} />
        </div>
      )}

      <ApiLogPanel isOpen={showApiLogs} onOpenChange={onApiLogsChange} />

      <TaskSwitcher isOpen={showTaskSwitcher} onOpenChange={onTaskSwitcherChange} />
    </>
  )
}
