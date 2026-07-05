import { Copy, Download, Edit3, MessageCircle, Plus, X } from 'lucide-react'
import type { DragEvent, MouseEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUndoableAction } from '../../hooks/useUndoableAction'
import { cn } from '../../lib/utils'
import {
  CHAT_TAB_ID,
  useWorkspaceTabsStore,
  type WorkspaceTab,
} from '../../stores/useWorkspaceTabsStore'
import { useToast } from '../common/Toast'

const statusColors = {
  analyzing: 'bg-success',
  completed: 'bg-success',
  failed: 'bg-danger',
  cancelled: 'bg-ink-faint',
  idle: 'bg-ink-faint',
}

const statusPulse = {
  analyzing: true,
  completed: false,
  failed: false,
  cancelled: false,
  idle: false,
}

interface ContextMenuState {
  open: boolean
  tabId: string | null
  x: number
  y: number
}

interface TabItemProps {
  tab: WorkspaceTab
  isActive: boolean
  index: number
  onSelect: (id: string) => void
  onClose: (tab: WorkspaceTab) => void
  onRename: (id: string, name: string) => void
  onCopyShareLink: (tab: WorkspaceTab) => void
  onExportReport: (tab: WorkspaceTab) => void
  onCloseOthers: (id: string) => void
  onCloseAll: () => void
  onDragStart: (e: DragEvent, index: number) => void
  onDragOver: (e: DragEvent, index: number) => void
  onDrop: (e: DragEvent, index: number) => void
  onDragEnd: () => void
  onContextMenu: (e: MouseEvent, tabId: string) => void
}

function TabItem({
  tab,
  isActive,
  index,
  onSelect,
  onClose,
  onRename,
  onCopyShareLink,
  onExportReport,
  onCloseOthers,
  onCloseAll,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onContextMenu,
}: TabItemProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(tab.scenarioName)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      setIsRenaming(true)
      setRenameValue(tab.scenarioName)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    },
    [tab.scenarioName],
  )

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== tab.scenarioName) {
      onRename(tab.id, trimmed)
    }
    setIsRenaming(false)
  }, [renameValue, tab.id, tab.scenarioName, onRename])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRenameSubmit()
      } else if (e.key === 'Escape') {
        setIsRenaming(false)
        setRenameValue(tab.scenarioName)
      }
    },
    [handleRenameSubmit, tab.scenarioName],
  )

  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(tab.scenarioName)
    }
  }, [tab.scenarioName, isRenaming])

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      onContextMenu={(e) => onContextMenu(e, tab.id)}
      onClick={() => onSelect(tab.id)}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'group relative flex items-center gap-2 px-3 h-8 min-w-[140px] max-w-[240px] cursor-pointer select-none border-b-2 transition-all duration-200 shrink-0',
        isActive
          ? 'bg-paper-dark/60 border-accent text-ink'
          : 'border-transparent text-ink-muted hover:bg-paper-dark/40 hover:text-ink',
      )}
    >
      <div className="flex-shrink-0 relative">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            statusColors[tab.status],
            statusPulse[tab.status] && 'animate-pulse',
          )}
        />
      </div>

      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium truncate"
        />
      ) : (
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{tab.scenarioName}</span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose(tab)
        }}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-opacity',
          isActive
            ? 'opacity-100 hover:bg-paper-dark text-ink-muted hover:text-ink'
            : 'opacity-0 group-hover:opacity-100 hover:bg-paper-dark text-ink-muted hover:text-ink',
        )}
        aria-label="关闭标签页"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  )
}

export function WorkspaceTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs, renameTab, closeAllTabs } =
    useWorkspaceTabsStore()
  const { showToast } = useToast()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    tabId: null,
    x: 0,
    y: 0,
  })
  const menuRef = useRef<HTMLDivElement>(null)

  const { execute: executeCloseTab } = useUndoableAction<WorkspaceTab>({
    action: (tab) => {
      closeTab(tab.id)
    },
    undo: (tab) => {
      useWorkspaceTabsStore.getState().openTab(tab.scenario, tab.scenarioName)
    },
    message: '标签页已关闭',
    undoLabel: '撤销',
    duration: 5,
  })

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, open: false }))
      }
    }
    if (contextMenu.open) {
      document.addEventListener('mousedown', handleClickOutside as unknown as EventListener)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as unknown as EventListener)
    }
  }, [contextMenu.open])

  const handleSelectTab = useCallback(
    (id: string) => {
      setActiveTab(id)
    },
    [setActiveTab],
  )

  const handleCloseTab = useCallback(
    (tab: WorkspaceTab) => {
      if (tab.status === 'analyzing') {
        showToast('分析将在后台继续', 'info')
      }
      executeCloseTab(tab)
    },
    [executeCloseTab, showToast],
  )

  const handleRenameTab = useCallback(
    (id: string, name: string) => {
      renameTab(id, name)
    },
    [renameTab],
  )

  const handleCopyShareLink = useCallback(
    (tab: WorkspaceTab) => {
      if (tab.status !== 'completed') {
        showToast('请先完成分析后再分享', 'error')
        return
      }
      const shareUrl = `${window.location.origin}/task/${tab.taskId || tab.id}`
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          showToast('分享链接已复制到剪贴板', 'success')
        })
        .catch(() => {
          showToast('复制失败，请手动复制', 'error')
        })
      setContextMenu((prev) => ({ ...prev, open: false }))
    },
    [showToast],
  )

  const handleExportReport = useCallback(
    (tab: WorkspaceTab) => {
      if (tab.status !== 'completed') {
        showToast('请先完成分析后再导出', 'error')
        return
      }
      showToast('导出功能开发中', 'info')
      setContextMenu((prev) => ({ ...prev, open: false }))
    },
    [showToast],
  )

  const handleCloseOthers = useCallback(
    (id: string) => {
      const tabsToClose = tabs.filter((t) => t.id !== id)
      tabsToClose.forEach((tab) => closeTab(tab.id))
      setActiveTab(id)
      setContextMenu((prev) => ({ ...prev, open: false }))
    },
    [tabs, closeTab, setActiveTab],
  )

  const handleCloseAll = useCallback(() => {
    closeAllTabs()
    setContextMenu((prev) => ({ ...prev, open: false }))
  }, [closeAllTabs])

  const handleRenameFromMenu = useCallback(() => {
    if (contextMenu.tabId) {
      const tab = tabs.find((t) => t.id === contextMenu.tabId)
      if (tab) {
        setContextMenu((prev) => ({ ...prev, open: false }))
        setTimeout(() => {
          const tabElement = document.querySelector(`[data-tab-id="${tab.id}"]`)
          if (tabElement) {
            const event = new MouseEvent('dblclick', { bubbles: true })
            tabElement.dispatchEvent(event)
          }
        }, 100)
      }
    }
  }, [contextMenu.tabId, tabs])

  const handleCloseFromMenu = useCallback(() => {
    if (contextMenu.tabId) {
      const tab = tabs.find((t) => t.id === contextMenu.tabId)
      if (tab) {
        handleCloseTab(tab)
      }
    }
    setContextMenu((prev) => ({ ...prev, open: false }))
  }, [contextMenu.tabId, tabs, handleCloseTab])

  const handleNewTab = useCallback(() => {
    showToast('新建分析功能开发中', 'info')
  }, [showToast])

  const handleDragStart = useCallback((e: DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: DragEvent, _index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent, index: number) => {
      e.preventDefault()
      if (dragIndex !== null && dragIndex !== index) {
        reorderTabs(dragIndex, index)
      }
      setDragIndex(null)
    },
    [dragIndex, reorderTabs],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
  }, [])

  const handleContextMenu = useCallback((e: MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({
      open: true,
      tabId,
      x: e.clientX,
      y: e.clientY,
    })
  }, [])

  const currentTab = contextMenu.tabId ? tabs.find((t) => t.id === contextMenu.tabId) : null

  const isChatActive = activeTabId === CHAT_TAB_ID

  return (
    <div className="relative flex items-center h-9 bg-paper border-b border-rule px-2 gap-1 overflow-x-auto">
      {/* 固定"对话"tab：不可关闭、不可拖拽 */}
      <div data-tab-id={CHAT_TAB_ID}>
        <button
          type="button"
          onClick={() => setActiveTab(CHAT_TAB_ID)}
          aria-current={isChatActive ? 'page' : undefined}
          title="AI 对话"
          className={cn(
            'group relative flex items-center gap-2 px-3 h-8 min-w-[100px] max-w-[180px] cursor-pointer select-none border-b-2 transition-all duration-200 shrink-0',
            isChatActive
              ? 'bg-paper-dark/60 border-accent text-ink'
              : 'border-transparent text-ink-muted hover:bg-paper-dark/40 hover:text-ink',
          )}
        >
          <MessageCircle size={14} strokeWidth={1.5} className="shrink-0" />
          <span className="flex-1 min-w-0 text-sm font-medium truncate">对话</span>
        </button>
      </div>

      {tabs.map((tab, index) => (
        <div key={tab.id} data-tab-id={tab.id}>
          <TabItem
            tab={tab}
            isActive={activeTabId === tab.id}
            index={index}
            onSelect={handleSelectTab}
            onClose={handleCloseTab}
            onRename={handleRenameTab}
            onCopyShareLink={handleCopyShareLink}
            onExportReport={handleExportReport}
            onCloseOthers={handleCloseOthers}
            onCloseAll={handleCloseAll}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onContextMenu={handleContextMenu}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={handleNewTab}
        className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer"
        aria-label="新建标签页"
        title="新建分析"
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>

      {contextMenu.open && currentTab && (
        <div
          ref={menuRef}
          className="fixed z-[2000] w-48 bg-paper border border-rule rounded-lg shadow-lg overflow-hidden animate-[fadeIn_0.15s_ease-out]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={() => handleCopyShareLink(currentTab)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          >
            <Copy size={14} strokeWidth={1.5} className="text-ink-faint" />
            <span>复制分享链接</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportReport(currentTab)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          >
            <Download size={14} strokeWidth={1.5} className="text-ink-faint" />
            <span>导出报告</span>
          </button>
          <div className="h-px bg-rule" />
          <button
            type="button"
            onClick={handleRenameFromMenu}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          >
            <Edit3 size={14} strokeWidth={1.5} className="text-ink-faint" />
            <span>重命名</span>
          </button>
          <div className="h-px bg-rule" />
          <button
            type="button"
            onClick={handleCloseFromMenu}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          >
            <X size={14} strokeWidth={1.5} className="text-ink-faint" />
            <span>关闭</span>
          </button>
          <button
            type="button"
            onClick={() => handleCloseOthers(currentTab.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          >
            <span className="w-3.5" />
            <span>关闭其他</span>
          </button>
          <button
            type="button"
            onClick={handleCloseAll}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          >
            <span className="w-3.5" />
            <span>关闭所有</span>
          </button>
        </div>
      )}
    </div>
  )
}
