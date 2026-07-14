import { useGSAP } from '@gsap/react'
import { ChevronLeft, ChevronRight, Menu, Plus, UploadCloud } from 'lucide-react'
import type { DragEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { storageKeys } from '../../lib/storage'
import type { AnalysisLogEntry, AnalysisTaskStatus } from '../../stores/useAnalysisStore'
import type {
  AnalyzeResult,
  Risk,
  RiskStatus,
  RiskType,
  Scenario,
  ScenarioType,
  Source,
} from '../../types'
import type { TourStep } from '../common/ProductTour'
import { ProductTour } from '../common/ProductTour'
import { Resizer } from '../common/ResizablePanel'
import type { PrintStyle } from '../print/PrintReport'
import { ContextPanel } from './ContextPanel'
import type { OverlayPanelType } from './OverlayPanel'
import { ResultPanel } from './ResultPanel'
import { RiskWorkflowDrawer } from './RiskWorkflowDrawer'
import { RiskWorkflowPanel } from './RiskWorkflowPanel'
import { SourcePanel } from './SourcePanel'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { WorkspaceTabs } from './WorkspaceTabs'
import { WorkspaceTopBar } from './WorkspaceTopBar'

interface WorkspaceLayoutProps {
  onGoHome: () => void
  sidebarCollapsed: boolean
  sourcePanelCollapsed: boolean
  contextPanelCollapsed: boolean
  sourcePanelWidth: number
  contextPanelWidth: number
  mobileSidebarOpen: boolean
  mobileContextOpen: boolean
  globalDragOver: boolean
  showTour: boolean
  tourSteps: TourStep[]
  sources: Source[]
  selectedSourceId: string | null
  currentScenario: ScenarioType | null
  scenario: Scenario | undefined
  result: AnalyzeResult | null
  analyzing: boolean
  selectedRisk: Risk | null
  pendingRisks: Risk[]
  totalUnresolved: number
  user: { id: number; nickname: string; avatar: string; phone?: string } | null
  showExportMenu: boolean
  printStyle: PrintStyle
  sourceDetailModalSource: Source | null
  riskDetailModalOpen: boolean
  isDemoMode: boolean
  riskFeedback: Record<string, 'accurate' | 'inaccurate'>
  taskStatus: AnalysisTaskStatus
  streamProgress: number
  streamError: string | null
  lastErrorTimestamp: string | null
  analysisLogs: AnalysisLogEntry[]
  onSidebarCollapse: () => void
  onSidebarExpand: () => void
  onMobileSidebarOpen: () => void
  onMobileSidebarClose: () => void
  onMobileContextOpen: () => void
  onMobileContextClose: () => void
  onSourcePanelCollapse: () => void
  onSourcePanelExpand: () => void
  onContextPanelCollapse: () => void
  onContextPanelExpand: () => void
  onSourcePanelResize: (delta: number) => void
  onContextPanelResize: (delta: number) => void
  onNewAnalysis: () => void
  onLoadScenario: (id: ScenarioType) => void
  onShowHistory: () => void
  onShowLogin: () => void
  onLogout: () => void
  onShowPreference: () => void
  onShowModelSettings: () => void
  onShowMonitor: () => void
  onShowTeam: () => void
  onShowTemplates: () => void
  onShowApiSettings: () => void
  onShowApiLogs: () => void
  onShowBilling: () => void
  onShowShare: () => void
  onAnalyze: () => void
  onRetryAnalysis: () => void
  onShowKeyboardShortcuts: () => void
  onShowExportMenuChange: (open: boolean) => void
  onPrintStyleChange: (style: PrintStyle) => void
  onShowNotifications: () => void
  onShowSearch: () => void
  onSelectSource: (id: string | null) => void
  onAddSource: () => void
  onDeleteSource: (id: string) => void
  onReparseSource: (id: string) => void
  onOpenSourceDetail: (source: Source) => void
  onSelectRisk: (risk: Risk | null) => void
  onCancelAnalysis: () => void
  onEvidenceClick: (sourceId: string, quote: string) => void
  onFeedback: (riskId: string, riskType: RiskType, isAccurate: boolean) => void
  onGenerateDraft: (risk: Risk) => void
  onRiskStatusChange: (riskId: string, status: RiskStatus) => void
  onRiskNotesChange: (riskId: string, notes: string) => void
  onOpenRiskDetail: (risk: Risk) => void
  onCloseContextPanel: () => void
  getRiskStatus: (riskId: string) => RiskStatus
  getRiskNotes: (riskId: string) => { content: string | null; updatedAt: string | null } | null
  onGlobalDragOver: (e: DragEvent) => void
  onGlobalDragLeave: () => void
  onGlobalDrop: (e: DragEvent) => void
  onTourClose: () => void
  scenarioType?: string
  activeOverlayPanel?: OverlayPanelType
  onGoDesk?: () => void
  children?: ReactNode
}

export function WorkspaceLayout(props: WorkspaceLayoutProps) {
  const {
    onGoHome,
    sidebarCollapsed,
    sourcePanelCollapsed,
    contextPanelCollapsed,
    sourcePanelWidth,
    contextPanelWidth,
    mobileSidebarOpen,
    mobileContextOpen,
    globalDragOver,
    showTour,
    tourSteps,
    sources,
    selectedSourceId,
    currentScenario,
    scenario,
    result,
    analyzing,
    selectedRisk,
    pendingRisks,
    totalUnresolved,
    user,
    showExportMenu,
    printStyle,
    isDemoMode,
    riskFeedback,
    taskStatus,
    streamProgress,
    streamError,
    lastErrorTimestamp,
    analysisLogs,
    onSidebarCollapse,
    onSidebarExpand,
    onMobileSidebarOpen,
    onMobileSidebarClose,
    onMobileContextClose,
    onSourcePanelCollapse,
    onSourcePanelExpand,
    onContextPanelCollapse,
    onContextPanelExpand,
    onSourcePanelResize,
    onContextPanelResize,
    onNewAnalysis,
    onLoadScenario,
    onShowHistory,
    onShowLogin,
    onLogout,
    onShowPreference,
    onShowModelSettings,
    onShowMonitor,
    onShowTeam,
    onShowTemplates,
    onShowApiSettings,
    onShowApiLogs,
    onShowBilling,
    onShowShare,
    onAnalyze,
    onRetryAnalysis,
    onShowKeyboardShortcuts,
    onShowExportMenuChange,
    onPrintStyleChange,
    onShowNotifications,
    onShowSearch,
    onSelectSource,
    onAddSource,
    onDeleteSource,
    onReparseSource,
    onOpenSourceDetail,
    onSelectRisk,
    onCancelAnalysis,
    onEvidenceClick,
    onFeedback,
    onGenerateDraft,
    onRiskStatusChange,
    onRiskNotesChange,
    onOpenRiskDetail,
    onCloseContextPanel,
    getRiskStatus,
    getRiskNotes,
    onGlobalDragOver,
    onGlobalDragLeave,
    onGlobalDrop,
    onTourClose,
    scenarioType,
    activeOverlayPanel,
    onGoDesk,
    children,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const [mobileRiskDrawerOpen, setMobileRiskDrawerOpen] = useState(false)

  useGSAP(
    () => {
      const isMobile = window.matchMedia('(max-width: 768px)').matches
      if (isMobile) return

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('[data-ws-sidebar]', {
        x: -20,
        opacity: 0,
        duration: 0.4,
      })
        .from(
          '[data-ws-topbar]',
          {
            y: -10,
            opacity: 0,
            duration: 0.4,
          },
          '-=0.34',
        )
        .from(
          '[data-ws-source-panel]',
          {
            x: -20,
            opacity: 0,
            duration: 0.45,
          },
          '-=0.34',
        )
        .from(
          '[data-ws-risk-panel]',
          {
            x: -15,
            opacity: 0,
            duration: 0.45,
          },
          '-=0.34',
        )
        .from(
          '[data-ws-result-panel]',
          {
            y: 10,
            opacity: 0,
            duration: 0.5,
          },
          '-=0.34',
        )
        .from(
          '[data-ws-context-panel]',
          {
            x: 20,
            opacity: 0,
            duration: 0.45,
          },
          '-=0.34',
        )
    },
    { scope: containerRef },
  )

  return (
    <div
      ref={containerRef}
      className="flex h-screen bg-paper text-ink overflow-hidden relative"
      role="button"
      tabIndex={-1}
      onDragOver={onGlobalDragOver}
      onDragLeave={onGlobalDragLeave}
      onDrop={onGlobalDrop}
    >
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileSidebarClose} />
      )}

      <div
        data-ws-sidebar
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto transform transition-transform duration-300 ease-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:hidden' : ''}`}
      >
        <WorkspaceSidebar
          currentScenario={currentScenario}
          user={user}
          onGoHome={() => {
            onGoHome()
            onMobileSidebarClose()
          }}
          onNewAnalysis={onNewAnalysis}
          onLoadScenario={(id) => onLoadScenario(id as ScenarioType)}
          onShowHistory={onShowHistory}
          onShowLogin={onShowLogin}
          onLogout={onLogout}
          onShowPreference={onShowPreference}
          onShowModelSettings={onShowModelSettings}
          onShowMonitor={onShowMonitor}
          onShowTeam={onShowTeam}
          onShowTemplates={onShowTemplates}
          onShowApiSettings={onShowApiSettings}
          onShowApiLogs={onShowApiLogs}
          onShowBilling={onShowBilling}
          onCollapse={onSidebarCollapse}
          activeOverlayPanel={activeOverlayPanel}
          onGoDesk={onGoDesk}
        />
      </div>

      {sidebarCollapsed && (
        <div
          className="hidden md:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-r border-rule gap-2"
          style={{ width: '48px' }}
        >
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
            onClick={onSidebarExpand}
            aria-label="展开侧边栏"
            title="展开侧边栏"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
            onClick={onNewAnalysis}
            aria-label="新建分析"
            title="新建分析"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div data-ws-topbar className="relative shrink-0">
          <WorkspaceTopBar
            scenario={scenario}
            sourcesLength={sources.length}
            analyzing={analyzing}
            hasResult={!!result}
            result={result}
            sources={sources}
            taskStatus={taskStatus}
            streamProgress={streamProgress}
            streamError={streamError}
            lastErrorTimestamp={lastErrorTimestamp}
            analysisLogs={analysisLogs}
            pendingRisksCount={pendingRisks.length}
            onGoHome={onGoHome}
            onShowShare={onShowShare}
            onAnalyze={onAnalyze}
            onRetryAnalysis={onRetryAnalysis}
            onShowKeyboardShortcuts={onShowKeyboardShortcuts}
            onOpenRiskDrawer={() => setMobileRiskDrawerOpen(true)}
            showExportMenu={showExportMenu}
            onShowExportMenuChange={onShowExportMenuChange}
            printStyle={printStyle}
            onPrintStyleChange={onPrintStyleChange}
          />
          <WorkspaceTabs onNewAnalysis={onNewAnalysis} />
          <button
            className="absolute left-3 top-7 -translate-y-1/2 md:hidden p-2 text-ink-muted hover:text-ink transition-colors z-10"
            onClick={onMobileSidebarOpen}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex relative">
          {sourcePanelCollapsed ? (
            <div
              className="hidden sm:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-r border-rule gap-2 h-full"
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
                onClick={onSourcePanelExpand}
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
                data-ws-source-panel
                className="hidden sm:block flex-shrink-0 h-full"
                style={{ width: `${sourcePanelWidth}px` }}
              >
                <SourcePanel
                  sources={sources}
                  selectedSource={selectedSourceId}
                  onSelectSource={onSelectSource}
                  onAddSource={onAddSource}
                  currentScenario={currentScenario}
                  onDeleteSource={(id) => onDeleteSource(id)}
                  onReparseSource={(id) => onReparseSource(id)}
                  onOpenSourceDetail={(source) => onOpenSourceDetail(source)}
                  onCollapse={onSourcePanelCollapse}
                />
              </div>
              <div className="hidden sm:block h-full">
                <Resizer
                  onResize={(delta) => {
                    onSourcePanelResize(delta)
                  }}
                />
              </div>
            </>
          )}

          {(result || analyzing) && (
            <div data-ws-risk-panel className="hidden md:block flex-shrink-0 h-full">
              <RiskWorkflowPanel
                risks={pendingRisks}
                totalCount={result?.risks.length || 0}
                unresolvedCount={totalUnresolved}
                selectedRiskId={selectedRisk?.id || null}
                onSelectRisk={(risk) => {
                  onSelectRisk(risk)
                }}
                getRiskStatus={getRiskStatus}
                isLoading={analyzing && !result}
              />
            </div>
          )}

          <div data-ws-result-panel className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <ResultPanel
              onAnalyze={onAnalyze}
              onCancel={onCancelAnalysis}
              onLoadScenario={(id) => onLoadScenario(id as ScenarioType)}
              onAddSource={onAddSource}
              hasSources={sources.length > 0}
              onEvidenceClick={onEvidenceClick}
            />
          </div>

          {contextPanelCollapsed ? (
            <div
              className="hidden lg:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-l border-rule gap-2 h-full"
              style={{ width: '48px' }}
            >
              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
                onClick={onContextPanelExpand}
                aria-label="展开风险详情面板"
                title="展开风险详情面板"
              >
                <ChevronLeft size={16} strokeWidth={1.5} />
              </button>
              <span
                className="text-[9px] font-mono text-ink-faint tracking-wider"
                style={{ writingMode: 'vertical-rl' }}
              >
                风险详情
              </span>
              {selectedRisk && (
                <div className="w-2 h-2 rounded-full bg-danger" title="有选中的风险" />
              )}
            </div>
          ) : (
            <>
              <div className="hidden lg:block h-full">
                <Resizer
                  onResize={(delta) => {
                    onContextPanelResize(delta)
                  }}
                />
              </div>
              <div
                data-ws-context-panel
                className="hidden lg:block flex-shrink-0 h-full"
                style={{ width: `${contextPanelWidth}px` }}
              >
                <ContextPanel
                  selectedRisk={selectedRisk}
                  hasResult={!!result}
                  riskFeedback={riskFeedback}
                  onClose={onCloseContextPanel}
                  onGenerateDraft={onGenerateDraft}
                  onFeedback={onFeedback}
                  onEvidenceClick={onEvidenceClick}
                  onStatusChange={onRiskStatusChange}
                  notes={selectedRisk ? (getRiskNotes(selectedRisk.id)?.content ?? null) : null}
                  notesUpdatedAt={
                    selectedRisk ? (getRiskNotes(selectedRisk.id)?.updatedAt ?? null) : null
                  }
                  onNotesChange={onRiskNotesChange}
                  onOpenRiskDetail={(risk) => {
                    onOpenRiskDetail(risk)
                  }}
                  onCollapse={onContextPanelCollapse}
                />
              </div>
            </>
          )}

          {selectedRisk && (
            <button
              className="lg:hidden fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-accent text-paper shadow-lg flex items-center justify-center hover:bg-accent-soft transition-colors"
              onClick={() => onMobileContextClose || undefined}
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {mobileContextOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileContextClose} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-paper rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <ContextPanel
                selectedRisk={selectedRisk}
                hasResult={!!result}
                riskFeedback={riskFeedback}
                onClose={onMobileContextClose}
                onGenerateDraft={onGenerateDraft}
                onFeedback={onFeedback}
                onEvidenceClick={onEvidenceClick}
                onStatusChange={onRiskStatusChange}
                notes={selectedRisk ? (getRiskNotes(selectedRisk.id)?.content ?? null) : null}
                notesUpdatedAt={
                  selectedRisk ? (getRiskNotes(selectedRisk.id)?.updatedAt ?? null) : null
                }
                onNotesChange={onRiskNotesChange}
              />
            </div>
          </div>
        </div>
      )}

      {(result || analyzing) && (
        <RiskWorkflowDrawer
          isOpen={mobileRiskDrawerOpen}
          onClose={() => setMobileRiskDrawerOpen(false)}
          risks={pendingRisks}
          totalCount={result?.risks.length || 0}
          unresolvedCount={totalUnresolved}
          selectedRiskId={selectedRisk?.id || null}
          onSelectRisk={(risk) => {
            onSelectRisk(risk)
            setMobileRiskDrawerOpen(false)
          }}
          getRiskStatus={getRiskStatus}
          isLoading={analyzing && !result}
        />
      )}

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
        onClose={onTourClose}
        localStorageKey={storageKeys.tourCompleted}
      />

      {children}
    </div>
  )
}
