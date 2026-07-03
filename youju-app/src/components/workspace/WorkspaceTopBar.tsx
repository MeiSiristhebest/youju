import { Home, Keyboard, Loader2, Play, Share2 } from 'lucide-react'
import { useTranslation } from '../../i18n'
import type { AnalyzeResult, Scenario, Source } from '../../types'
import { ExportMenu } from '../common/ExportMenu'
import type { PrintStyle } from '../print/PrintReport'

interface WorkspaceTopBarProps {
  scenario?: Scenario | null
  sourcesLength: number
  analyzing: boolean
  hasResult: boolean
  result?: AnalyzeResult | null
  sources?: Source[]
  onGoHome: () => void
  onShowShare: () => void
  onAnalyze: () => void
  onShowKeyboardShortcuts: () => void
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
  onGoHome,
  onShowShare,
  onAnalyze,
  onShowKeyboardShortcuts,
  showExportMenu,
  onShowExportMenuChange,
  printStyle,
  onPrintStyleChange,
}: WorkspaceTopBarProps) {
  const { t } = useTranslation()
  return (
    <header className="h-14 bg-paper border-b border-rule flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-medium text-ink truncate font-display tracking-tight">
          {scenario ? scenario.name : t('topbar.customAnalysis')}
        </h1>
        {scenario && (
          <span className="text-[10px] text-ink-faint bg-paper-dark px-2 py-0.5 rounded-md border border-rule shrink-0 font-mono tracking-wide">
            {t('topbar.materialsCount', { count: sourcesLength })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
          onClick={onShowKeyboardShortcuts}
          title="快捷键 (?)"
        >
          <Keyboard size={13} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
          onClick={onGoHome}
        >
          <Home size={13} strokeWidth={1.5} />
          {t('topbar.backToHome')}
        </button>
        {hasResult && result && (
          <ExportMenu
            result={result}
            sources={sources}
            title={scenario?.name || t('topbar.analysisReport')}
            isOpen={showExportMenu}
            onOpenChange={onShowExportMenuChange}
            printStyle={printStyle}
            onPrintStyleChange={onPrintStyleChange}
          />
        )}
        {hasResult && (
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border border-rule bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onShowShare}
          >
            <Share2 size={13} strokeWidth={1.5} />
            {t('topbar.share')}
          </button>
        )}
        <button
          id="tour-analyze-btn"
          type="button"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 group"
          onClick={onAnalyze}
          disabled={analyzing || sourcesLength === 0}
        >
          {analyzing ? (
            <>
              <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
              {t('topbar.analyzing')}
            </>
          ) : (
            <>
              <Play
                size={12}
                strokeWidth={1.5}
                className="group-hover:scale-110 transition-transform duration-200"
              />
              {t('topbar.startAnalysis')}
            </>
          )}
        </button>
      </div>
    </header>
  )
}
