/**
 * ChatStreamRenderer - 流式消息渲染组件
 *
 * 功能：
 * - 流式渲染文本（token 实时累加显示，附 blink 光标）
 * - typing 指示器（三个点 pulse 动画）
 * - tool_call 事件触发"正在检索文档..."加载态（spinner + 文字）
 * - citation 事件到达时缓存并显示引用标签
 * - 用户可点击"停止"按钮中断生成
 * - 尊重 prefers-reduced-motion（全局 CSS 已处理 animation 降级）
 */
import { Loader2, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatCitation } from '@/types'

export interface ChatStreamRendererProps {
  streamingMessage: string
  streamingCitations: ChatCitation[]
  isRetrieving: boolean
  onStop: () => void
}

const ASSISTANT_LABEL = 'AI'

/** Typing 指示器 - 三个点 pulse 动画 */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="正在输入" role="status">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-ink-muted animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}

/** 流式引用标签（与 ChatMessage.CitationTag 视觉一致，但无点击行为） */
interface StreamingCitationTagProps {
  citation: ChatCitation
  index: number
}

function StreamingCitationTag({ citation, index }: StreamingCitationTagProps) {
  const label = `[${index + 1}]`
  const sourceName = citation.sourceName ?? citation.sourceId
  return (
    <span
      title={`引用 ${label}：${sourceName}`}
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1.5',
        'font-mono text-[11px] font-medium leading-none',
        'border border-accent/30 bg-accent-bg text-accent',
      )}
    >
      {label}
    </span>
  )
}

export function ChatStreamRenderer({
  streamingMessage,
  streamingCitations,
  isRetrieving,
  onStop,
}: ChatStreamRendererProps) {
  const hasContent = streamingMessage.length > 0
  const hasCitations = streamingCitations.length > 0

  return (
    <div
      className="flex gap-3 px-4 py-3"
      data-role="assistant-streaming"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          'border border-rule bg-paper-dark text-ink-muted',
          'text-xs font-medium leading-none',
        )}
        aria-hidden="true"
      >
        {ASSISTANT_LABEL}
      </div>

      <div className="flex max-w-[80%] flex-col items-start gap-1.5">
        <div
          className={cn(
            'relative min-w-[3rem] rounded-2xl rounded-tl-sm px-4 py-2.5',
            'text-base leading-relaxed shadow-sm',
            'border border-rule/60 bg-paper-dark text-ink',
          )}
        >
          {isRetrieving ? (
            // tool_call 事件触发：正在检索文档...（spinner + 文字）
            <div className="flex items-center gap-2 text-ink-muted">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
              <span className="text-sm">正在检索文档...</span>
            </div>
          ) : hasContent ? (
            // 流式文本 + blink 光标
            <>
              <div className="whitespace-pre-wrap break-words">
                {streamingMessage}
                <span
                  className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] bg-accent align-middle animate-pulse"
                  aria-hidden="true"
                />
              </div>

              {/* 流式过程中缓存的 citations，complete 时由父组件 ChatMessage 渲染最终引用 */}
              {hasCitations && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-rule/50 pt-2">
                  <span className="text-xs text-ink-faint">引用：</span>
                  {streamingCitations.map((c, i) => (
                    <StreamingCitationTag key={`${c.chunkId}-${i}`} citation={c} index={i} />
                  ))}
                </div>
              )}
            </>
          ) : (
            // 等待首个 token：typing 指示器
            <TypingDots />
          )}
        </div>

        {/* 停止按钮 - 流式过程中显示 */}
        <button
          type="button"
          onClick={onStop}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1',
            'text-xs font-medium text-ink-muted',
            'border border-rule/60 bg-paper hover:bg-paper-dark hover:text-ink',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
          aria-label="停止生成"
        >
          <Square className="size-3 fill-current" strokeWidth={1.75} />
          停止生成
        </button>
      </div>
    </div>
  )
}
