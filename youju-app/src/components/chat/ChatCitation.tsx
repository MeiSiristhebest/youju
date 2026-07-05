import { AlertTriangle, ExternalLink, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ChatCitation as ChatCitationType } from '../../types'

export interface ChatCitationProps {
  citation: ChatCitationType
  /** 引用序号（从 0 开始，展示时 +1） */
  index: number
  /** 点击"查看原文"或引用标签时回调，用于打开 SourceDetailModal 高亮 */
  onClick?: (sourceId: string, quote: string) => void
}

// rerank score 低于此阈值视为"低可信"
const LOW_CONFIDENCE_THRESHOLD = 0.5
// popover 中原文片段预览长度上限
const QUOTE_PREVIEW_LENGTH = 200

export function ChatCitation({ citation, index, onClick }: ChatCitationProps) {
  const isLowConfidence = citation.score < LOW_CONFIDENCE_THRESHOLD
  const scorePercent = Math.round(citation.score * 100)
  const quotePreview =
    citation.quote.length > QUOTE_PREVIEW_LENGTH
      ? `${citation.quote.slice(0, QUOTE_PREVIEW_LENGTH)}…`
      : citation.quote
  // 后端可能未返回 sourceName，做兜底显示
  const displayName = citation.sourceName || `来源 ${citation.sourceId.slice(0, 6)}`

  const handleViewSource = () => {
    onClick?.(citation.sourceId, citation.quote)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`引用 ${index + 1}: ${displayName}, 置信度 ${scorePercent}%${
              isLowConfidence ? ', 低可信' : ''
            }`}
            className={cn(
              'inline-flex items-center gap-0.5 ml-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
              isLowConfidence
                ? 'border border-warning/60 bg-warning-bg/40 text-warning hover:bg-warning-bg/70'
                : 'border border-accent/50 bg-accent-bg/50 text-accent hover:bg-accent-faint',
            )}
          />
        }
      >
        <span className="font-mono">[{index + 1}]</span>
        {isLowConfidence && (
          <AlertTriangle size={9} strokeWidth={2} className="shrink-0" aria-hidden="true" />
        )}
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start" side="top" sideOffset={6}>
        <div className="flex flex-col">
          {/* 头部：来源名 + 置信度 */}
          <div className="px-3 py-2.5 border-b border-rule/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText
                  size={12}
                  className="text-ink-muted shrink-0"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-ink truncate">{displayName}</span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded',
                  isLowConfidence ? 'bg-warning-bg text-warning' : 'bg-paper-dark text-ink-muted',
                )}
              >
                {scorePercent}%
              </span>
            </div>
            {isLowConfidence && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-warning">
                <AlertTriangle size={9} strokeWidth={2} aria-hidden="true" />
                <span>低可信</span>
              </div>
            )}
          </div>

          {/* 原文片段（前 200 字截断） */}
          <div className="px-3 py-2.5 border-b border-rule/60">
            <p className="text-[10px] text-ink-faint mb-1">原文片段</p>
            <p className="text-xs text-ink-muted leading-relaxed whitespace-pre-wrap break-words">
              {quotePreview}
            </p>
          </div>

          {/* 操作：查看原文 → 调用 onClick 打开 SourceDetailModal 高亮 */}
          <div className="px-2.5 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={handleViewSource}
            >
              <ExternalLink data-icon="inline-start" strokeWidth={1.5} />
              查看原文
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
