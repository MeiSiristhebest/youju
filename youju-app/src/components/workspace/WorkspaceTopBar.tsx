import { AlertTriangle, Home, Keyboard, Loader2, Play, Share2 } from 'lucide-react'
import { useTranslation } from '../../i18n'
import type { AnalysisLogEntry, AnalysisTaskStatus } from '../../stores/useAnalysisStore'
import type { AnalyzeResult, Scenario, Source } from '../../types'
import { ExportMenu } from '../common/ExportMenu'
import type { PrintStyle } from '../print/PrintReport'
import { Button } from '../ui/button'
import { MagneticButton } from '../ui/MagneticButton'
import { TaskStatusBadge } from './TaskStatusBadge'

interface WorkspaceTopBarProps {
  scenario?: Scenario | null
  sourcesLength: number
  analyzing: boolean
  hasResult: boolean
  result?: AnalyzeResult | null
  sources?: Source[]
  taskStatus: AnalysisTaskStatus
  streamProgress: number
  streamError: string | null
  lastErrorTimestamp: string | null
  analysisLogs: AnalysisLogEntry[]
  pendingRisksCount: number
  onGoHome: () => void
  onShowShare: () => void
  onAnalyze: () => void
  onRetryAnalysis: () => void
  onShowKeyboardShortcuts: () => void
  onOpenRiskDrawer: () => void
  showExportMenu?: boolean
  onShowExportMenuChange?: (open: boolean) => void
  printStyle: PrintStyle
  onPrintStyleChange: (style: PrintStyle) => void
}

export function WorkspaceTopBar({
  scenario,
  sourcesLength,
  analyzing,
  hasResult,
  result,
  sources = [],
  taskStatus,
  streamProgress,
  streamError,
  lastErrorTimestamp,
  analysisLogs,
  pendingRisksCount,
  onGoHome,
  onShowShare,
  onAnalyze,
  onRetryAnalysis,
  onShowKeyboardShortcuts,
  onOpenRiskDrawer,
  showExportMenu,
  onShowExportMenuChange,
  printStyle,
  onPrintStyleChange,
}: WorkspaceTopBarProps) {
  const { t } = useTranslation()
  return (
    <header className="h-14 bg-paper border-b border-rule flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-lg font-medium text-ink truncate font-display tracking-tight">
          {scenario ? scenario.name : t('topbar.customAnalysis')}
        </h1>
        {scenario && (
          <span className="text-[10px] text-ink-faint bg-paper-dark px-2 py-0.5 rounded-md border border-rule shrink-0 font-mono tracking-wide">
            {t('topbar.materialsCount', { count: sourcesLength })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {hasResult && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onOpenRiskDrawer}
            className="md:hidden relative"
            title="待处理风险"
            aria-label={`待处理风险 ${pendingRisksCount} 项`}
          >
            <AlertTriangle size={13} strokeWidth={1.5} />
            {pendingRisksCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 bg-danger text-paper text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingRisksCount > 99 ? '99+' : pendingRisksCount}
              </span>
            )}
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onShowKeyboardShortcuts}
          title="快捷键 (?)"
          aria-label="查看键盘快捷键"
        >
          <Keyboard size={13} strokeWidth={1.5} />
        </Button>
        <TaskStatusBadge
          status={taskStatus}
          progress={streamProgress}
          errorMessage={streamError}
          errorTimestamp={lastErrorTimestamp}
          errorLogs={analysisLogs}
          onRetry={onRetryAnalysis}
        />
        <Button variant="outline" size="sm" onClick={onGoHome} data-icon="inline-start">
          <Home size={13} strokeWidth={1.5} />
          {t('topbar.backToHome')}
        </Button>
        {hasResult && result && (
          <div id="tour-export-btn">
            <ExportMenu
              result={result}
              sources={sources}
              title={scenario?.name || t('topbar.analysisReport')}
              isOpen={showExportMenu}
              onOpenChange={onShowExportMenuChange}
              printStyle={printStyle}
              onPrintStyleChange={onPrintStyleChange}
            />
          </div>
        )}
        {hasResult && (
          <Button
            id="tour-share-btn"
            variant="outline"
            size="sm"
            onClick={onShowShare}
            data-icon="inline-start"
          >
            <Share2 size={13} strokeWidth={1.5} />
            {t('topbar.share')}
          </Button>
        )}
        <MagneticButton
          id="tour-analyze-btn"
          variant="primary"
          size="sm"
          onClick={onAnalyze}
          disabled={analyzing || sourcesLength === 0}
          iconLeft={
            analyzing ? (
              <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Play size={12} strokeWidth={1.5} />
            )
          }
          className="group"
          strength={0.3}
          radius={100}
        >
          {analyzing ? t('topbar.analyzing') : t('topbar.startAnalysis')}
        </MagneticButton>
      </div>
    </header>
  )
}
