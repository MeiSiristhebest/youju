import { Paperclip } from 'lucide-react'

interface EvidenceHighlightProps {
  quote: string
  sourceName: string
  sourceId: string
  onJump: (sourceId: string, quote: string) => void
}

export function EvidenceHighlight({ quote, sourceName, sourceId, onJump }: EvidenceHighlightProps) {
  return (
    <button
      type="button"
      className="w-full text-left group cursor-pointer bg-transparent border-none p-0"
      onClick={() => onJump(sourceId, quote)}
    >
      <div className="rounded-lg bg-paper border border-rule p-3 transition-colors duration-200 hover:bg-accent-bg/20 hover:border-accent-faint">
        <div className="flex items-center gap-1.5 mb-2">
          <Paperclip
            size={12}
            strokeWidth={1.5}
            className="text-ink-faint group-hover:text-accent transition-colors duration-200"
          />
          <span className="text-[11px] text-ink-faint group-hover:text-ink-muted transition-colors duration-200 truncate">
            {sourceName}
          </span>
        </div>

        <div className="border-l-2 border-rule group-hover:border-accent pl-3 py-0.5 transition-colors duration-200">
          <p className="text-[11px] text-ink-muted leading-relaxed italic">"{quote}"</p>
        </div>

        <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[10px] text-accent font-medium">点击跳转到原文</span>
          <span className="text-[10px] text-accent">→</span>
        </div>
      </div>
    </button>
  )
}
