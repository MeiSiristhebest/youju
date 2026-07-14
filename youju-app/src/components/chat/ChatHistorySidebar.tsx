import { MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useChat } from '../../hooks/useChat'
import { useUndoableAction } from '../../hooks/useUndoableAction'
import { useChatStore } from '../../stores/useChatStore'
import type { Conversation } from '../../types'
import { Button } from '../ui/button'

// 相对时间格式化：刚刚 / N 分钟前 / N 小时前 / 昨天 / N 天前 / 日期
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 截断预览文本（前 30 字）
function truncatePreview(text: string, max = 30): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

// 右键菜单位置状态
interface ContextMenuState {
  x: number
  y: number
  conversationId: string
}

interface ChatHistorySidebarProps {
  className?: string
  taskId?: string
}

// 右键上下文菜单（自定义实现，避免新建 UI 原语）
interface ContextMenuProps {
  state: ContextMenuState
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

function ContextMenu({ state, onRename, onDelete, onClose }: ContextMenuProps) {
  useEffect(() => {
    const close = () => onClose()
    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // 延迟绑定，避免触发菜单的 contextmenu 事件立即关闭
    const id = window.setTimeout(() => {
      window.addEventListener('click', close)
      window.addEventListener('contextmenu', close)
      window.addEventListener('keydown', closeOnEsc)
    }, 0)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('keydown', closeOnEsc)
    }
  }, [onClose])

  return (
    <div
      className="fixed z-50 min-w-40 bg-popover text-popover-foreground rounded-lg border border-rule shadow-lg py-1"
      style={{ left: state.x, top: state.y }}
      role="menu"
      aria-label="会话操作菜单"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer"
        onClick={() => {
          onRename()
          onClose()
        }}
        role="menuitem"
      >
        <Pencil size={13} strokeWidth={1.5} />
        重命名
      </button>
      <button
        type="button"
        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left text-danger hover:bg-danger-bg transition-colors cursor-pointer"
        onClick={() => {
          onDelete()
          onClose()
        }}
        role="menuitem"
      >
        <Trash2 size={13} strokeWidth={1.5} />
        删除
      </button>
    </div>
  )
}

// 单个会话列表项
interface ConversationItemProps {
  conversation: Conversation
  active: boolean
  renaming: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onContextMenu: (e: ReactMouseEvent) => void
  onRenameSubmit: (title: string) => void
  onRenameCancel: () => void
}

function ConversationItem({
  conversation,
  active,
  renaming,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
}: ConversationItemProps) {
  const [draft, setDraft] = useState(conversation.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) {
      setDraft(conversation.title)
      // 异步聚焦以确保 DOM 已渲染
      const id = window.requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
      return () => window.cancelAnimationFrame(id)
    }
  }, [renaming, conversation.title])

  const commitRename = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== conversation.title) {
      onRenameSubmit(trimmed)
    } else {
      onRenameCancel()
    }
  }

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onRenameCancel()
    }
  }

  // 重命名模式：内联输入框
  if (renaming) {
    return (
      <div className="px-2 py-1.5">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          className="w-full px-2 py-1 text-sm bg-paper-dark border border-accent/50 rounded text-ink focus:outline-none focus:border-accent"
          aria-label="重命名会话"
          maxLength={60}
        />
      </div>
    )
  }

  // 显示模式：标题 + 预览 + 时间
  // 注意：Conversation 类型无 lastMessage 字段，会话标题由首条消息生成，等效于消息预览
  return (
    <div
      role="option"
      aria-selected={active}
      tabIndex={0}
      className={cn(
        'group relative px-2.5 py-2 rounded-md cursor-pointer transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        active
          ? 'bg-paper-dark border border-accent/30'
          : 'border border-transparent hover:bg-paper-dark/60',
      )}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* 活跃指示条 */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
      )}

      {/* 标题行 */}
      <div className="text-sm font-medium text-ink truncate mb-0.5">
        {conversation.title || '新对话'}
      </div>

      {/* 预览（标题前 30 字）+ 相对时间 */}
      <div className="flex items-center gap-1.5 text-[11px] text-ink-faint">
        <span className="truncate flex-1 min-w-0">{truncatePreview(conversation.title)}</span>
        <span className="shrink-0 tabular-nums">{formatRelativeTime(conversation.updatedAt)}</span>
      </div>
    </div>
  )
}

export function ChatHistorySidebar({ className, taskId }: ChatHistorySidebarProps) {
  const {
    conversations,
    activeConversationId,
    createConversation,
    renameConversation,
    deleteConversation,
    selectConversation,
    isCreating,
  } = useChat(taskId)

  // 直接访问 store 的 add/remove，用于删除撤销的乐观更新
  const removeConversation = useChatStore((s) => s.removeConversation)
  const addConversation = useChatStore((s) => s.addConversation)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 删除带 5 秒撤销
  const { execute: executeDelete } = useUndoableAction<Conversation>({
    action: async (conv) => {
      // 5 秒后真正调用 API 删除
      deleteConversation(conv.id)
    },
    undo: async (conv) => {
      // 撤销：恢复到列表
      addConversation(conv)
    },
    message: '会话已删除',
    duration: 5,
  })

  const handleDelete = (conv: Conversation) => {
    // 乐观移除：立即从列表消失
    removeConversation(conv.id)
    if (activeConversationId === conv.id) {
      selectConversation(null)
    }
    // 启动 5 秒撤销倒计时
    executeDelete(conv)
  }

  const handleRename = (id: string, title: string) => {
    renameConversation({ id, title })
    setRenamingId(null)
  }

  const handleContextMenu = (e: ReactMouseEvent, conv: Conversation) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuState({ x: e.clientX, y: e.clientY, conversationId: conv.id })
  }

  // 键盘导航：上下箭头切换会话
  const handleListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')
    if (!items || items.length === 0) return
    const current = document.activeElement as HTMLElement
    const currentIndex = Array.from(items).indexOf(current)
    let nextIndex: number
    if (e.key === 'ArrowDown') {
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
    }
    items[nextIndex]?.focus()
  }

  // 按 updatedAt 降序排列
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  const menuConversation = menuState
    ? conversations.find((c) => c.id === menuState.conversationId)
    : null

  return (
    <aside
      className={cn('flex flex-col h-full bg-paper border-r border-rule shrink-0', className)}
      aria-label="对话历史"
    >
      {/* 顶部：新建对话按钮（深色背景浅色文字） */}
      <div className="p-2.5 border-b border-rule shrink-0">
        <Button
          variant="default"
          size="default"
          className="w-full justify-center gap-1.5"
          onClick={() => createConversation({})}
          disabled={isCreating}
          aria-label="新建对话"
        >
          <Plus size={14} strokeWidth={1.5} />
          <span>新建对话</span>
        </Button>
      </div>

      {/* 会话列表（可滚动） */}
      <div
        ref={listRef}
        role="listbox"
        aria-label="会话列表"
        className="flex-1 min-h-0 overflow-y-auto p-1.5"
        onKeyDown={handleListKeyDown}
      >
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-paper-dark border border-rule flex items-center justify-center mb-3 text-ink-faint">
              <MessageCircle size={20} strokeWidth={1.5} />
            </div>
            <p className="text-sm text-ink-muted font-medium">暂无对话</p>
            <p className="text-xs text-ink-faint mt-1">点击上方新建</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sortedConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                active={conv.id === activeConversationId}
                renaming={renamingId === conv.id}
                onSelect={() => selectConversation(conv.id)}
                onDoubleClick={() => setRenamingId(conv.id)}
                onContextMenu={(e) => handleContextMenu(e, conv)}
                onRenameSubmit={(title) => handleRename(conv.id, title)}
                onRenameCancel={() => setRenamingId(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {menuState && menuConversation && (
        <ContextMenu
          state={menuState}
          onRename={() => setRenamingId(menuConversation.id)}
          onDelete={() => handleDelete(menuConversation)}
          onClose={() => setMenuState(null)}
        />
      )}
    </aside>
  )
}
