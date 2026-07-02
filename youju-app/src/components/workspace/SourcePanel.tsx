import { FileText, Link, Plus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TYPE_LABELS } from '../../constants/workspace'
import type { Source, SourceType } from '../../types'

interface SourcePanelProps {
  sources: Source[]
  selectedSource: string | null
  onSelectSource: (id: string | null) => void
  onAddSource: () => void
}

const typeIcons: Record<SourceType, ReactNode> = {
  chat: <FileText size={14} strokeWidth={1.5} />,
  doc: <FileText size={14} strokeWidth={1.5} />,
  web: <Link size={14} strokeWidth={1.5} />,
  screenshot: <FileText size={14} strokeWidth={1.5} />,
  contract: <FileText size={14} strokeWidth={1.5} />,
}

export function SourcePanel({
  sources,
  selectedSource,
  onSelectSource,
  onAddSource,
}: SourcePanelProps) {
  const selectedSourceData = sources.find((s) => s.id === selectedSource)

  return (
    <div className="w-96 bg-paper border-r border-rule flex flex-col shrink-0">
      <div className="px-3.5 py-3 border-b border-rule flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink font-medium">材料</span>
          <span className="text-[10px] text-ink-faint bg-paper-dark px-2 py-0.5 rounded-full font-mono">
            {sources.length}
          </span>
        </div>
        <button
          type="button"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
          onClick={onAddSource}
          aria-label="添加材料"
        >
          <Plus size={15} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sources.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint">
              <FileText size={20} strokeWidth={1.5} />
            </div>
            <p className="text-xs text-ink-faint mb-3">暂无材料</p>
            <button
              type="button"
              className="px-4 py-2 bg-accent-bg border border-accent-faint text-accent rounded-full text-xs font-medium cursor-pointer hover:bg-accent-faint transition-colors duration-200"
              onClick={onAddSource}
            >
              添加材料
            </button>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer transition-colors duration-200',
                  selectedSource === s.id ? 'bg-paper-dark' : 'hover:bg-paper-dark/50',
                )}
                onClick={() => onSelectSource(selectedSource === s.id ? null : s.id)}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                    selectedSource === s.id
                      ? 'bg-accent text-paper'
                      : 'bg-paper-dark text-ink-muted',
                  )}
                >
                  {typeIcons[s.type as SourceType]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-ink truncate">{s.name}</div>
                  <div className="text-[10px] text-ink-faint truncate">
                    {TYPE_LABELS[s.type as SourceType]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSourceData && (
        <div className="border-t border-rule bg-paper-dark flex-1 flex flex-col">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-rule shrink-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink truncate">
                {selectedSourceData.name}
              </div>
              <div className="text-xs text-ink-faint">
                {TYPE_LABELS[selectedSourceData.type as SourceType]}
              </div>
            </div>
            <button
              type="button"
              className="w-6 h-6 rounded-md flex items-center justify-center text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper transition-colors"
              onClick={() => onSelectSource(null)}
              aria-label="关闭预览"
            >
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap font-body">
              {selectedSourceData.content}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
