import { Check, Edit3, Loader2, Maximize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TYPE_LABELS } from '../../constants/workspace'
import type { Source, SourceStatus, SourceType } from '../../types'

function SourceStatusBadge({ status, progress }: { status: SourceStatus; progress?: number }) {
  const statusConfig: Record<SourceStatus, { label: string; color: string; dotColor: string }> = {
    uploading: { label: '上传中', color: 'text-info', dotColor: 'bg-info' },
    parsing: { label: '解析中', color: 'text-warning', dotColor: 'bg-warning' },
    ready: { label: '已就绪', color: 'text-success', dotColor: 'bg-success' },
    error: { label: '解析失败', color: 'text-danger', dotColor: 'bg-danger' },
  }

  const config = statusConfig[status]
  const isProcessing = status === 'uploading' || status === 'parsing'

  return (
    <div className="flex items-center gap-1.5">
      {isProcessing ? (
        <Loader2 size={10} className={cn(config.color, 'animate-spin')} strokeWidth={2} />
      ) : status === 'ready' ? (
        <Check size={10} className={config.color} strokeWidth={2.5} />
      ) : (
        <div className={cn('w-2 h-2 rounded-full', config.dotColor)} />
      )}
      <span className={cn('text-[10px] font-medium', config.color)}>{config.label}</span>
      {isProcessing && progress !== undefined && (
        <span className="text-[10px] text-ink-faint font-mono">{progress}%</span>
      )}
    </div>
  )
}

export interface SourcePreviewProps {
  source: Source
  onClose: () => void
  onOpenDetail?: () => void
  editingSourceId: string | null
  editingContent: string
  onStartEdit: () => void
  onSaveEdit: () => void
  onEditingContentChange: (content: string) => void
}

export function SourcePreview({
  source,
  onClose,
  onOpenDetail,
  editingSourceId,
  editingContent,
  onStartEdit,
  onSaveEdit,
  onEditingContentChange,
}: SourcePreviewProps) {
  const isEditing = editingSourceId === source.id
  const status: SourceStatus = source.status || 'ready'

  return (
    <div
      className="border-t border-rule bg-paper-dark flex flex-col shrink-0"
      style={{ maxHeight: '45vh' }}
    >
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-rule shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{source.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-ink-faint">{TYPE_LABELS[source.type as SourceType]}</span>
            <span className="text-ink-faint/40">·</span>
            <SourceStatusBadge status={status} progress={source.progress} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onOpenDetail && (
            <button
              type="button"
              className="w-6 h-6 rounded-md flex items-center justify-center text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper transition-colors"
              onClick={onOpenDetail}
              aria-label="放大查看"
              title="放大查看"
            >
              <Maximize2 size={12} strokeWidth={1.5} />
            </button>
          )}
          {!isEditing ? (
            <button
              type="button"
              className="w-6 h-6 rounded-md flex items-center justify-center text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper transition-colors"
              onClick={onStartEdit}
              aria-label="编辑材料"
              title="编辑"
            >
              <Edit3 size={12} strokeWidth={1.5} />
            </button>
          ) : (
            <button
              type="button"
              className="w-6 h-6 rounded-md flex items-center justify-center text-success bg-paper-dark/60 hover:bg-paper transition-colors"
              onClick={onSaveEdit}
              aria-label="保存编辑"
              title="保存"
            >
              <Check size={12} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            className="w-6 h-6 rounded-md flex items-center justify-center text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper transition-colors"
            onClick={onClose}
            aria-label="关闭预览"
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto" style={{ minHeight: 0 }}>
        {isEditing ? (
          <textarea
            value={editingContent}
            onChange={(e) => onEditingContentChange(e.target.value)}
            className="w-full h-full min-h-[120px] bg-paper border border-rule rounded-lg p-3 text-base text-ink leading-relaxed resize-none focus:outline-none focus:border-accent/50 font-body"
            placeholder="编辑材料内容..."
          />
        ) : (
          <div className="text-base text-ink-muted leading-relaxed whitespace-pre-wrap font-body">
            {source.content}
          </div>
        )}
      </div>
    </div>
  )
}
