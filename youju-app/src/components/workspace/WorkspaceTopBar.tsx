import { Home, Loader2, Play, Share2 } from 'lucide-react'
import type { Scenario } from '../../types'

interface WorkspaceTopBarProps {
  scenario?: Scenario | null
  sourcesLength: number
  analyzing: boolean
  hasResult: boolean
  onGoHome: () => void
  onShowShare: () => void
  onAnalyze: () => void
}

export function WorkspaceTopBar({
  scenario,
  sourcesLength,
  analyzing,
  hasResult,
  onGoHome,
  onShowShare,
  onAnalyze,
}: WorkspaceTopBarProps) {
  return (
    <header className="h-14 bg-paper border-b border-rule flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-medium text-ink truncate font-display tracking-tight">
          {scenario ? scenario.name : '自定义分析'}
        </h1>
        {scenario && (
          <span className="text-[10px] text-ink-faint bg-paper-dark px-2 py-0.5 rounded-md border border-rule shrink-0 font-mono tracking-wide">
            {sourcesLength} 份材料
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
          onClick={onGoHome}
        >
          <Home size={13} strokeWidth={1.5} />
          返回首页
        </button>
        {hasResult && (
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border border-rule bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onShowShare}
          >
            <Share2 size={13} strokeWidth={1.5} />
            分享
          </button>
        )}
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 group"
          onClick={onAnalyze}
          disabled={analyzing || sourcesLength === 0}
        >
          {analyzing ? (
            <>
              <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
              分析中…
            </>
          ) : (
            <>
              <Play
                size={12}
                strokeWidth={1.5}
                className="group-hover:scale-110 transition-transform duration-200"
              />
              开始分析
            </>
          )}
        </button>
      </div>
    </header>
  )
}
