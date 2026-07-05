import { useGSAP } from '@gsap/react'
import { ArrowDown, MessageCircle, Settings, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { gsap } from '../../lib/gsap'
import { chatApi } from '../../services/chatApi'
import { useChatStore } from '../../stores/useChatStore'
import { useSourceStore } from '../../stores/useSourceStore'
import type { Source } from '../../types'
import type { MessageFeedback } from '../../types/chat'
import { SourceDetailModal } from '../modals/SourceDetailModal'
import { ChatEmpty } from './ChatEmpty'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'
import { ChatStreamRenderer } from './ChatStreamRenderer'

interface ChatPanelProps {
  className?: string
  scenarioType?: string
}

// 距底距离阈值（px）：小于此值视为"贴近底部"，新消息自动滚动
const NEAR_BOTTOM_THRESHOLD = 100
// "滚动到最新"按钮显示阈值（px）：距底超过此值时显示
const SHOW_SCROLL_BUTTON_THRESHOLD = 200

export function ChatPanel({ className, scenarioType }: ChatPanelProps) {
  const {
    messages,
    streaming,
    streamingMessage,
    streamingCitations,
    isRetrieving,
    activeConversationId,
    conversations,
    sendMessage,
    abortStream,
    sendFeedback,
  } = useChat()

  const sources = useSourceStore((s) => s.sources)
  const clearMessages = useChatStore((s) => s.clearMessages)

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  // 推荐问题点击后填入输入框的内容
  const [inputContent, setInputContent] = useState('')
  // 用于强制 ChatInput 重新挂载以接受新的 defaultValue
  const [inputNonce, setInputNonce] = useState(0)
  // SourceDetailModal 本地状态（证据高亮）
  const [detailSource, setDetailSource] = useState<Source | null>(null)
  const [detailHighlight, setDetailHighlight] = useState('')

  const activeTitle = conversations.find((c) => c.id === activeConversationId)?.title

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  // 监听滚动位置：更新 isNearBottom 与"滚动到最新"按钮可见性
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsNearBottom(distance <= NEAR_BOTTOM_THRESHOLD)
    setShowScrollButton(distance > SHOW_SCROLL_BUTTON_THRESHOLD)
  }, [])

  // 新消息到达：贴近底部时自动滚动
  const prevCountRef = useRef(messages.length)
  useEffect(() => {
    const grew = messages.length > prevCountRef.current
    prevCountRef.current = messages.length
    if (grew && isNearBottom) {
      requestAnimationFrame(() => scrollToBottom('auto'))
    }
  }, [messages.length, isNearBottom, scrollToBottom])

  // 流式过程中：贴近底部时跟随滚动
  useEffect(() => {
    if (streaming && isNearBottom) {
      requestAnimationFrame(() => scrollToBottom('auto'))
    }
  }, [streamingMessage, streaming, isNearBottom, scrollToBottom])

  // 切换会话：重置到底部
  useEffect(() => {
    if (activeConversationId) {
      requestAnimationFrame(() => scrollToBottom('auto'))
    }
  }, [activeConversationId, scrollToBottom])

  // GSAP 入场动画：淡入 + 上移；尊重 prefers-reduced-motion，移动端跳过
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference) and (min-width: 769px)', () => {
        gsap.from(containerRef.current, {
          y: 12,
          opacity: 0,
          duration: 0.4,
          ease: 'power3.out',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef },
  )

  const handleSend = useCallback(
    (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || streaming) return
      sendMessage({ content: trimmed, scenarioType })
    },
    [sendMessage, scenarioType, streaming],
  )

  // 推荐问题点击：填入输入框（通过 remount 注入 defaultValue）
  const handlePickQuestion = useCallback((question: string) => {
    setInputContent(question)
    setInputNonce((n) => n + 1)
  }, [])

  // 重新生成：以该助手消息对应的上一条 user 消息内容重新发送
  const handleRegenerate = useCallback(
    (messageId: string) => {
      if (streaming) return
      const idx = messages.findIndex((m) => m.id === messageId)
      if (idx <= 0) return
      const prevUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
      if (prevUser) {
        sendMessage({ content: prevUser.content, scenarioType })
      }
    },
    [messages, sendMessage, scenarioType, streaming],
  )

  // 证据点击：打开 SourceDetailModal 并高亮引用片段
  const handleEvidenceClick = useCallback(
    (sourceId: string, quote: string) => {
      const source = sources.find((s) => s.id === sourceId) ?? null
      if (source) {
        setDetailHighlight(quote)
        setDetailSource(source)
      }
    },
    [sources],
  )

  const handleFeedback = useCallback(
    (messageId: string, feedback: MessageFeedback) => {
      if (feedback === 'positive' || feedback === 'negative') {
        sendFeedback({ messageId, feedback })
      }
    },
    [sendFeedback],
  )

  const handleRememberPreference = useCallback(async (content: string) => {
    await chatApi.createMemory(content)
  }, [])

  const handleClear = useCallback(() => {
    if (streaming) abortStream()
    clearMessages()
  }, [streaming, abortStream, clearMessages])

  const isEmpty = messages.length === 0 && !streaming

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="AI 对话面板"
      className={`flex flex-col h-full bg-paper text-ink ${className ?? ''}`}
    >
      {/* 顶部标题栏 */}
      <header
        data-cp-header
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-rule bg-paper"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent-bg border border-accent-faint flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-accent" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink font-display tracking-tight truncate">
              AI 对话
            </h2>
            <p className="text-[11px] text-ink-faint truncate">
              {activeTitle ?? (activeConversationId ? '当前会话已就绪' : '选择素材后开始提问')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleClear}
            disabled={messages.length === 0}
            aria-label="清空对话"
            title="清空对话"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-muted bg-paper-dark border border-rule/60 hover:text-ink hover:border-ink-faint transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">清空</span>
          </button>
          <button
            type="button"
            aria-label="对话设置"
            title="对话设置"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
          >
            <Settings size={15} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* 中间消息流：flex-1 min-h-0 overflow-y-auto 防止内容遮挡 */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto"
          aria-live="polite"
          aria-atomic="false"
        >
          {isEmpty ? (
            <div className="min-h-full flex items-center justify-center p-4">
              <ChatEmpty onPickQuestion={handlePickQuestion} scenarioType={scenarioType} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  onRegenerate={handleRegenerate}
                  onEvidenceClick={handleEvidenceClick}
                  onFeedback={handleFeedback}
                  onRememberPreference={handleRememberPreference}
                />
              ))}
              {streaming && (
                <ChatStreamRenderer
                  streamingMessage={streamingMessage}
                  streamingCitations={streamingCitations}
                  isRetrieving={isRetrieving}
                  onStop={abortStream}
                />
              )}
            </div>
          )}
        </div>

        {/* 滚动到最新按钮：距底 > 200px 时显示，底部居中 */}
        {showScrollButton && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            aria-label="滚动到最新消息"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-paper bg-ink/85 border border-rule shadow-lg backdrop-blur-sm hover:bg-ink transition-colors z-10"
          >
            <ArrowDown size={13} strokeWidth={2} />
            <span>最新消息</span>
          </button>
        )}
      </div>

      {/* 底部输入区 */}
      <footer data-cp-input className="shrink-0 border-t border-rule bg-paper">
        <ChatInput
          key={inputNonce}
          defaultValue={inputContent}
          onSend={handleSend}
          onStop={abortStream}
          isStreaming={streaming}
          disabled={!activeConversationId}
        />
      </footer>

      <SourceDetailModal
        source={detailSource}
        onClose={() => setDetailSource(null)}
        highlightText={detailHighlight}
      />
    </div>
  )
}
