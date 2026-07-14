/**
 * ChatMessage - 单条对话消息组件
 *
 * 功能：
 * - user 消息：右对齐，accent 色背景，圆角气泡，最大宽度 80%
 * - assistant 消息：左对齐，paper 色背景，圆角气泡，最大宽度 80%
 * - assistant 消息下方渲染 citations 引用标签（上标 [1] [2]，accent 色小标签）
 * - hover assistant 消息显示操作栏（绝对定位，右上角）：复制 / 重新生成 / 反馈（👍 / 👎）
 * - 暗色模式自动适配（使用 theme 变量）
 * - 无障碍：ARIA 标签，键盘可操作
 */
import {
  AlertTriangle,
  Brain,
  Check,
  Copy,
  ExternalLink,
  Pencil,
  RefreshCw,
  Reply,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/common/Toast'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import type { ChatCitation, ChatMessage as ChatMessageType, MessageFeedback } from '@/types'
import { MarkdownContent } from './MarkdownContent'

export interface ChatMessageProps {
  message: ChatMessageType
  onRegenerate?: (id: string) => void
  onEvidenceClick?: (sourceId: string, quote: string) => void
  onFeedback?: (id: string, feedback: MessageFeedback) => void
  onRememberPreference?: (content: string) => Promise<void> | void
  onReply?: (message: ChatMessageType) => void
  onEdit?: (message: ChatMessageType) => void
  onDelete?: (id: string) => void
  parentMessage?: ChatMessageType | null
}

const LANGFUSE_HOST = import.meta.env.VITE_LANGFUSE_HOST || 'https://cloud.langfuse.com'

/** 格式化时间戳为 HH:MM */
function formatTime(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleTimeString(language, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/** 引用标签 - 上标样式 [1] [2]，点击触发 onEvidenceClick */
interface CitationTagProps {
  citation: ChatCitation
  index: number
  onClick?: (sourceId: string, quote: string) => void
}

function CitationTag({ citation, index, onClick }: CitationTagProps) {
  const label = `[${index + 1}]`
  const sourceName = citation.sourceName ?? citation.sourceId
  return (
    <button
      type="button"
      onClick={() => onClick?.(citation.sourceId, citation.quote)}
      title={`查看引用：${sourceName}`}
      aria-label={`查看引用 ${label}：${sourceName}`}
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1.5',
        'font-mono text-[11px] font-medium leading-none',
        'border border-accent/30 bg-accent-bg text-accent',
        'transition-colors hover:border-accent hover:bg-accent hover:text-paper',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
      )}
    >
      {label}
    </button>
  )
}

/** 操作栏图标按钮 */
interface ActionButtonProps {
  icon: typeof Copy
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}

function ActionButton({ icon: Icon, label, onClick, active, disabled }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md',
        'text-ink-muted transition-colors',
        'hover:bg-paper-dark hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        active && 'bg-accent-bg text-accent hover:bg-accent-bg hover:text-accent',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-ink-muted',
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.75} />
    </button>
  )
}

/** 头像 */
interface AvatarProps {
  isUser: boolean
  userLabel: string
  assistantLabel: string
}

function Avatar({ isUser, userLabel, assistantLabel }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full',
        'text-xs font-medium leading-none',
        isUser ? 'bg-accent text-paper' : 'border border-rule bg-paper-dark text-ink-muted',
      )}
      aria-hidden="true"
    >
      {isUser ? userLabel : assistantLabel}
    </div>
  )
}

export function ChatMessage({
  message,
  onRegenerate,
  onEvidenceClick,
  onFeedback,
  onRememberPreference,
  onReply,
  onEdit,
  onDelete,
  parentMessage,
}: ChatMessageProps) {
  const { showToast } = useToast()
  const { t, language } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [remembering, setRemembering] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const userLabel = t('chat.userLabel')
  const assistantLabel = t('chat.assistantLabel')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      showToast('已复制到剪贴板', 'success')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('复制失败，请手动选择文本', 'error')
    }
  }

  const handleFeedback = (feedback: 'positive' | 'negative') => {
    // 再次点击同反馈则取消
    const next: MessageFeedback = message.feedback === feedback ? null : feedback
    onFeedback?.(message.id, next)
  }

  const handleViewTrace = () => {
    if (!message.langfuseTraceId) return
    const url = `${LANGFUSE_HOST}/trace/${message.langfuseTraceId}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleRemember = async () => {
    if (!onRememberPreference || remembering) return
    setRemembering(true)
    try {
      await onRememberPreference(message.content)
      showToast('已记住该偏好', 'success')
    } catch {
      showToast('记忆保存失败，请稍后重试', 'error')
    } finally {
      setRemembering(false)
    }
  }

  const handleReply = () => {
    onReply?.(message)
  }

  const handleEdit = () => {
    onEdit?.(message)
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.(message.id)
      showToast('消息已删除', 'success')
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setContextMenuOpen(true)
  }

  const closeContextMenu = () => {
    setContextMenuOpen(false)
  }

  useEffect(() => {
    if (contextMenuOpen) {
      const handleClickOutside = () => closeContextMenu()
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenuOpen])

  const handleContextMenuAction = (action: string) => {
    closeContextMenu()
    switch (action) {
      case 'reply':
        handleReply()
        break
      case 'edit':
        handleEdit()
        break
      case 'delete':
        handleDelete()
        break
      case 'copy':
        handleCopy()
        break
      case 'regenerate':
        onRegenerate?.(message.id)
        break
      case 'feedback-positive':
        handleFeedback('positive')
        break
      case 'feedback-negative':
        handleFeedback('negative')
        break
    }
  }

  const citations = message.citations ?? []
  const hasCitations = isAssistant && citations.length > 0

  return (
    <div
      className={cn('group/message flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}
      data-role={message.role}
      data-message-id={message.id}
      onContextMenu={handleContextMenu}
    >
      <Avatar isUser={isUser} userLabel={userLabel} assistantLabel={assistantLabel} />

      <div
        className={cn('flex max-w-[80%] flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}
      >
        {/* 引用的父消息 */}
        {parentMessage && (
          <div
            className={cn(
              'max-w-full rounded-lg px-3 py-2 text-xs border',
              isUser
                ? 'bg-accent/10 border-accent/30 text-paper/80'
                : 'bg-paper-dark/60 border-rule/50 text-ink-muted',
            )}
          >
            <div className="flex items-center gap-1 mb-1">
              <Reply size={10} strokeWidth={2} />
              <span className={cn('font-medium', isUser ? 'text-paper/90' : 'text-ink-faint')}>
                {parentMessage.role === 'user' ? userLabel : assistantLabel}
              </span>
            </div>
            <div className="whitespace-pre-wrap break-words line-clamp-2">
              {parentMessage.content}
            </div>
          </div>
        )}

        <div
          className={cn(
            'relative rounded-2xl px-4 py-2.5 text-base leading-relaxed shadow-sm',
            'transition-shadow hover:shadow-md',
            isUser
              ? 'rounded-tr-sm bg-accent text-paper'
              : 'rounded-tl-sm border border-rule/60 bg-paper-dark text-ink',
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <MarkdownContent content={message.content} />
          )}

          {/* Citations - assistant 消息下方 */}
          {hasCitations && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-rule/50 pt-2">
              <span className="text-xs text-ink-faint">引用：</span>
              {citations.map((c, i) => (
                <CitationTag
                  key={`${c.chunkId}-${i}`}
                  citation={c}
                  index={i}
                  onClick={onEvidenceClick}
                />
              ))}
            </div>
          )}

          {/* 无引用回答警告条 - assistant 消息且无 citations 时显示 */}
          {isAssistant && !hasCitations && message.content && (
            <div className="mt-2.5 flex items-center gap-2 border-t border-warning/30 bg-warning-bg/30 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="size-3.5 shrink-0 text-warning" strokeWidth={1.75} />
              <span className="flex-1 text-xs text-warning">
                此回答未引用任何文档片段，可能不够准确
              </span>
              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message.id)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-warning hover:bg-warning/15 transition-colors"
                  aria-label="重新检索并回答"
                >
                  <RefreshCw className="size-3" strokeWidth={1.75} />
                  重新检索并回答
                </button>
              )}
            </div>
          )}

          {/* Hover 操作栏 - assistant 消息 */}
          {isAssistant && (
            <div
              className={cn(
                'absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg border border-rule/60 bg-paper p-0.5 shadow-md',
                'opacity-0 transition-opacity duration-150',
                'group-hover/message:opacity-100 focus-within:opacity-100',
              )}
              role="toolbar"
              aria-label="消息操作"
            >
              <ActionButton icon={Reply} label="回复" onClick={handleReply} disabled={!onReply} />
              <ActionButton
                icon={copied ? Check : Copy}
                label={copied ? '已复制' : '复制'}
                onClick={handleCopy}
              />
              <ActionButton
                icon={RefreshCw}
                label="重新生成"
                onClick={() => onRegenerate?.(message.id)}
                disabled={!onRegenerate}
              />
              <ActionButton
                icon={ThumbsUp}
                label="赞同"
                onClick={() => handleFeedback('positive')}
                active={message.feedback === 'positive'}
              />
              <ActionButton
                icon={ThumbsDown}
                label="反对"
                onClick={() => handleFeedback('negative')}
                active={message.feedback === 'negative'}
              />
              {message.langfuseTraceId && (
                <ActionButton icon={ExternalLink} label="查看 trace" onClick={handleViewTrace} />
              )}
            </div>
          )}

          {/* Hover 操作栏 - user 消息 */}
          {isUser && (
            <div
              className={cn(
                'absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg border border-rule/60 bg-paper p-0.5 shadow-md',
                'opacity-0 transition-opacity duration-150',
                'group-hover/message:opacity-100 focus-within:opacity-100',
              )}
              role="toolbar"
              aria-label="消息操作"
            >
              <ActionButton icon={Reply} label="回复" onClick={handleReply} disabled={!onReply} />
              <ActionButton icon={Pencil} label="编辑" onClick={handleEdit} disabled={!onEdit} />
              <ActionButton
                icon={confirmDelete ? Check : Trash2}
                label={confirmDelete ? '确认删除' : '删除'}
                onClick={handleDelete}
                disabled={!onDelete}
                active={confirmDelete}
              />
              {onRememberPreference && (
                <ActionButton
                  icon={Brain}
                  label={remembering ? '保存中…' : '记住这个偏好'}
                  onClick={handleRemember}
                  disabled={remembering}
                />
              )}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <time dateTime={message.createdAt} className="px-1 text-xs text-ink-faint">
          {formatTime(message.createdAt, language)}
        </time>
      </div>

      {/* 右键菜单 */}
      {contextMenuOpen && (
        <div
          className="fixed z-50 w-48 bg-paper border border-rule rounded-lg shadow-xl py-1"
          style={{
            left: Math.min(contextMenuPosition.x, window.innerWidth - 200),
            top: Math.min(contextMenuPosition.y, window.innerHeight - 250),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onReply && (
            <button
              type="button"
              onClick={() => handleContextMenuAction('reply')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-paper-dark transition-colors"
            >
              <Reply size={14} strokeWidth={1.5} />
              {t('chat.reply')}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleContextMenuAction('copy')}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-paper-dark transition-colors"
          >
            <Copy size={14} strokeWidth={1.5} />
            {t('chat.copy')}
          </button>
          {isUser && onEdit && (
            <button
              type="button"
              onClick={() => handleContextMenuAction('edit')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-paper-dark transition-colors"
            >
              <Pencil size={14} strokeWidth={1.5} />
              {t('chat.edit')}
            </button>
          )}
          {isAssistant && onRegenerate && (
            <button
              type="button"
              onClick={() => handleContextMenuAction('regenerate')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-paper-dark transition-colors"
            >
              <RefreshCw size={14} strokeWidth={1.5} />
              {t('chat.regenerate')}
            </button>
          )}
          {onFeedback && (
            <>
              <div className="h-px bg-rule/60 my-1" />
              <button
                type="button"
                onClick={() => handleContextMenuAction('feedback-positive')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                  message.feedback === 'positive'
                    ? 'bg-accent-bg/40 text-accent'
                    : 'text-ink hover:bg-paper-dark',
                )}
              >
                <ThumbsUp size={14} strokeWidth={1.5} />
                {t('chat.agree')}
              </button>
              <button
                type="button"
                onClick={() => handleContextMenuAction('feedback-negative')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                  message.feedback === 'negative'
                    ? 'bg-accent-bg/40 text-accent'
                    : 'text-ink hover:bg-paper-dark',
                )}
              >
                <ThumbsDown size={14} strokeWidth={1.5} />
                {t('chat.disagree')}
              </button>
            </>
          )}
          {isUser && onDelete && (
            <>
              <div className="h-px bg-rule/60 my-1" />
              <button
                type="button"
                onClick={() => handleContextMenuAction('delete')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                  confirmDelete ? 'bg-danger/10 text-danger' : 'text-danger hover:bg-danger/10',
                )}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                {confirmDelete ? t('chat.confirmDelete') : t('chat.delete')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
