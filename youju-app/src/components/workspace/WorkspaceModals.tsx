import type {
  HistorySnapshot,
  Risk,
  RiskStatus,
  RiskType,
  ScenarioType,
  SharePermission,
  Source,
  TaskRecord,
} from '../../types'
import { CommandPalette } from '../common/CommandPalette'
import { KeyboardShortcutsModal } from '../common/KeyboardShortcutsModal'
import { NotificationCenter } from '../common/NotificationCenter'
import { TaskSwitcher } from '../common/TaskSwitcher'
import { AddSourceModal } from '../modals/AddSourceModal'
import { DraftModal } from '../modals/DraftModal'
import { LoginModal } from '../modals/LoginModal'
import { RiskDetailModal } from '../modals/RiskDetailModal'
import { ScenarioSelector } from '../modals/ScenarioSelector'
import { ShareModal } from '../modals/ShareModal'
import { SourceDetailModal } from '../modals/SourceDetailModal'
import { HistoryDetailPanel } from './HistoryDetailPanel'
import { HistoryDiffPanel } from './HistoryDiffPanel'
import { HistoryPanel } from './HistoryPanel'

interface WorkspaceModalsProps {
  showAddSource: boolean
  showLoginModal: boolean
  showShareModal: boolean
  showKeyboardShortcuts: boolean
  showNotifications: boolean
  showGlobalSearch: boolean
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
  draftText: string
  generatingDraft: boolean
  shareLink: string
  shareExpired: string
  creatingShare: boolean
  shareViewCount: number
  shareExpiryDays: number | null
  sharePermission: SharePermission
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
  onFeedback: (riskId: string, riskType: RiskType, isAccurate: boolean) => void
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
  onCloseKeyboardShortcuts: () => void
  onCloseDraft: () => void
  onAdoptDraft: (text: string) => void
  generateDraft: (risk: Risk) => void
  onNotificationsChange: (open: boolean) => void
  onGlobalSearchChange: (open: boolean) => void
  onGlobalSearchNavigate: (dest: string) => void
  onTaskSwitcherChange: (open: boolean) => void
  onToggleSidebar: () => void
  onToggleSourcePanel: () => void
  onToggleContextPanel: () => void
  showScenarioSelector: boolean
  onScenarioSelectorChange: (open: boolean) => void
  onNewAnalysis: (scenarioId: ScenarioType) => void
  onUploadSource: () => void
  onExportReport: () => void
}

export function WorkspaceModals(props: WorkspaceModalsProps) {
  const {
    showAddSource,
    showLoginModal,
    showShareModal,
    showKeyboardShortcuts,
    showNotifications,
    showGlobalSearch,
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
    result,
    draftText,
    generatingDraft,
    shareLink,
    shareExpired,
    creatingShare,
    shareViewCount,
    shareExpiryDays,
    sharePermission,
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
    onCloseKeyboardShortcuts,
    onCloseDraft,
    onAdoptDraft,
    generateDraft,
    onNotificationsChange,
    onGlobalSearchChange,
    onGlobalSearchNavigate,
    onTaskSwitcherChange,
    onToggleSidebar,
    onToggleSourcePanel,
    onToggleContextPanel,
    showScenarioSelector,
    onScenarioSelectorChange,
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

      <RiskDetailModal
        risk={riskDetailModalOpen && selectedRisk ? selectedRisk : null}
        onClose={onCloseRiskDetail}
        onFeedback={onFeedback}
        onEvidenceClick={(sourceId, quote) => {
          onCloseRiskDetail()
          onEvidenceClick(sourceId, quote)
        }}
        onStatusChange={onRiskStatusChange}
        notes={selectedRisk ? (getRiskNotes(selectedRisk.id)?.content ?? null) : null}
        notesUpdatedAt={selectedRisk ? (getRiskNotes(selectedRisk.id)?.updatedAt ?? null) : null}
        onNotesChange={onRiskNotesChange}
      />

      <SourceDetailModal
        source={sourceDetailModalSource}
        onClose={onCloseSourceDetail}
        onReparse={(id) => {
          onReparseSource(id)
        }}
        highlightText={sourceDetailModalHighlight}
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

      <ScenarioSelector
        isOpen={showScenarioSelector}
        onClose={() => onScenarioSelectorChange(false)}
        onSelectScenario={onNewAnalysis}
      />

      <TaskSwitcher isOpen={showTaskSwitcher} onOpenChange={onTaskSwitcherChange} />
    </>
  )
}
