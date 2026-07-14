import { ChevronRight, Copy, Download, Edit3, FileText, Plus, RefreshCw, X } from 'lucide-react'
import type { DragEvent, MouseEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUndoableAction } from '../../hooks/useUndoableAction'
import { cn } from '../../lib/utils'
import { taskApi } from '../../services/taskApi'
import { useAnalysisStore, useRiskStore, useSourceStore } from '../../stores'
import { useWorkspaceTabsStore, type WorkspaceTab } from '../../stores/useWorkspaceTabsStore'
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
  onCopyTitle: (tab: WorkspaceTab) => void
  onDuplicate: (tab: WorkspaceTab) => void
  onReload: (tab: WorkspaceTab) => void
  onExportReport: (tab: WorkspaceTab) => void
  onCloseOthers: (id: string) => void
  onCloseToRight: (id: string) => void
  onCloseAll: () => void
  onDragStart: (e: DragEvent, index: number) => void
  onDragOver: (e: DragEvent, index: number) => void
  onDrop: (e: DragEvent, index: number) => void
  onDragEnd: () => void
  onContextMenu: (e: MouseEvent, tabId: string) => void
  onMiddleClickClose: (tab: WorkspaceTab) => void
}

function TabItem({
  tab,
  isActive,
  index,
  onSelect,
  onClose,
  onRename,
  onCopyTitle,
  onDuplicate,
  onReload,
  onExportReport,
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onContextMenu,
  onMiddleClickClose,
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

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
        onMiddleClickClose(tab)
      }
    },
    [tab, onMiddleClickClose],
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
      onMouseUp={handleMouseUp}
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
        title="关闭 (中键点击)"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  )
}

export function WorkspaceTabs({ onNewAnalysis }: { onNewAnalysis?: () => void }) {
  const tabs = useWorkspaceTabsStore((state) => state.tabs)
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId)
  const setActiveTab = useWorkspaceTabsStore((state) => state.setActiveTab)
  const closeTab = useWorkspaceTabsStore((state) => state.closeTab)
  const closeTabsToRight = useWorkspaceTabsStore((state) => state.closeTabsToRight)
  const closeOtherTabs = useWorkspaceTabsStore((state) => state.closeOtherTabs)
  const reorderTabs = useWorkspaceTabsStore((state) => state.reorderTabs)
  const renameTab = useWorkspaceTabsStore((state) => state.renameTab)
  const closeAllTabs = useWorkspaceTabsStore((state) => state.closeAllTabs)
  const openTab = useWorkspaceTabsStore((state) => state.openTab)
  const { showToast } = useToast()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    tabId: null,
    x: 0,
    y: 0,
  })
  const menuRef = useRef<HTMLDivElement>(null)

  const { intentAnalysis, currentTaskId, currentTaskTitle, isDemo } = useSourceStore()

  useEffect(() => {
    if (isDemo) return
    if (!intentAnalysis) return
    if (!activeTabId) return

    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab) return

    if (activeTab.scenarioName === '未命名分析' || activeTab.scenarioName === currentTaskTitle) {
      const newTitle = intentAnalysis.scenarioType || '未命名分析'
      if (newTitle !== activeTab.scenarioName) {
        renameTab(activeTabId, newTitle)
        if (currentTaskId === activeTabId) {
          useSourceStore.getState().setCurrentTask({ id: currentTaskId, title: newTitle })
          taskApi.updateTaskTitle(currentTaskId, newTitle).catch(console.error)
        }
      }
    }
  }, [intentAnalysis?.scenarioType, activeTabId])

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

  const handleMiddleClickClose = useCallback(
    (tab: WorkspaceTab) => {
      handleCloseTab(tab)
    },
    [handleCloseTab],
  )

  const handleRenameTab = useCallback(
    async (id: string, name: string) => {
      renameTab(id, name)
      const { isDemo, currentTaskId } = useSourceStore.getState()
      if (!isDemo && currentTaskId === id) {
        try {
          await taskApi.updateTaskTitle(id, name)
          useSourceStore.getState().setCurrentTask({ id, title: name })
        } catch (error) {
          console.error('Failed to update task title:', error)
        }
      }
    },
    [renameTab],
  )

  const handleCopyTitle = useCallback(
    (tab: WorkspaceTab) => {
      navigator.clipboard
        .writeText(tab.scenarioName)
        .then(() => {
          showToast('标题已复制到剪贴板', 'success')
        })
        .catch(() => {
          showToast('复制失败，请手动复制', 'error')
        })
      setContextMenu((prev) => ({ ...prev, open: false }))
    },
    [showToast],
  )

  const handleDuplicate = useCallback(
    (tab: WorkspaceTab) => {
      openTab(tab.scenario, `${tab.scenarioName} (副本)`)
      showToast('已复制标签页', 'success')
      setContextMenu((prev) => ({ ...prev, open: false }))
    },
    [openTab, showToast],
  )

  const handleReload = useCallback((tab: WorkspaceTab) => {
    // 触发重新分析事件
    window.dispatchEvent(new CustomEvent('youju:reanalyze', { detail: { tabId: tab.id } }))
    setContextMenu((prev) => ({ ...prev, open: false }))
  }, [])

  const handleExportReport = useCallback(
    (tab: WorkspaceTab) => {
      if (tab.status !== 'completed') {
        showToast('请先完成分析后再导出', 'error')
        return
      }
      // 触发打开导出菜单事件
      window.dispatchEvent(new CustomEvent('youju:open-export-menu'))
      setContextMenu((prev) => ({ ...prev, open: false }))
    },
    [showToast],
  )

  const handleCloseOthers = useCallback(
    (id: string) => {
      closeOtherTabs(id)
      setActiveTab(id)
      setContextMenu((prev) => ({ ...prev, open: false }))
    },
    [closeOtherTabs, setActiveTab],
  )

  const handleCloseToRight = useCallback(
    (id: string) => {
      closeTabsToRight(id)
      setContextMenu((prev) => ({ ...prev, open: false }))
    },
    [closeTabsToRight],
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
    const menuWidth = 200
    const menuHeight = 320
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8)
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8)
    setContextMenu({
      open: true,
      tabId,
      x,
      y,
    })
  }, [])

  const currentTab = contextMenu.tabId ? tabs.find((t) => t.id === contextMenu.tabId) : null

  const currentTabIndex = currentTab ? tabs.findIndex((t) => t.id === currentTab.id) : -1
  const hasTabsToRight = currentTabIndex >= 0 && currentTabIndex < tabs.length - 1
  const hasOtherTabs = tabs.length > 1

  return (
    <div className="relative flex items-center h-9 bg-paper border-b border-rule px-2 gap-1 overflow-x-auto">
      {tabs.map((tab, index) => (
        <div key={tab.id} data-tab-id={tab.id}>
          <TabItem
            tab={tab}
            isActive={activeTabId === tab.id}
            index={index}
            onSelect={handleSelectTab}
            onClose={handleCloseTab}
            onRename={handleRenameTab}
            onCopyTitle={handleCopyTitle}
            onDuplicate={handleDuplicate}
            onReload={handleReload}
            onExportReport={handleExportReport}
            onCloseOthers={handleCloseOthers}
            onCloseToRight={handleCloseToRight}
            onCloseAll={handleCloseAll}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onContextMenu={handleContextMenu}
            onMiddleClickClose={handleMiddleClickClose}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={onNewAnalysis}
        className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer"
        aria-label="新建标签页"
        title="新建分析"
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>

      {contextMenu.open &&
        currentTab &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-52 bg-paper border border-rule rounded-lg shadow-xl overflow-hidden animate-[fadeIn_0.12s_ease-out] py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="px-3 py-2 border-b border-rule/40">
              <p className="text-[11px] font-medium text-ink-faint truncate">
                {currentTab.scenarioName}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleReload(currentTab)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <RefreshCw size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>重新加载</span>
            </button>
            <div className="h-px bg-rule/60 mx-2" />
            <button
              type="button"
              onClick={handleRenameFromMenu}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <Edit3 size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>重命名</span>
            </button>
            <button
              type="button"
              onClick={() => handleDuplicate(currentTab)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <Copy size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>复制标签页</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopyTitle(currentTab)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <FileText size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>复制标题</span>
            </button>
            <div className="h-px bg-rule/60 mx-2" />
            <button
              type="button"
              onClick={() => handleExportReport(currentTab)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <Download size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>导出报告</span>
            </button>
            <div className="h-px bg-rule/60 mx-2" />
            <button
              type="button"
              onClick={handleCloseFromMenu}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <X size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>关闭标签页</span>
            </button>
            <button
              type="button"
              onClick={() => handleCloseOthers(currentTab.id)}
              disabled={!hasOtherTabs}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer',
                hasOtherTabs
                  ? 'text-ink hover:bg-paper-dark'
                  : 'text-ink-faint cursor-not-allowed opacity-50',
              )}
            >
              <ChevronRight size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>关闭其他标签页</span>
            </button>
            <button
              type="button"
              onClick={() => handleCloseToRight(currentTab.id)}
              disabled={!hasTabsToRight}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer',
                hasTabsToRight
                  ? 'text-ink hover:bg-paper-dark'
                  : 'text-ink-faint cursor-not-allowed opacity-50',
              )}
            >
              <ChevronRight size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>关闭右侧标签页</span>
            </button>
            <button
              type="button"
              onClick={handleCloseAll}
              disabled={tabs.length === 0}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer',
                tabs.length > 0
                  ? 'text-ink hover:bg-paper-dark'
                  : 'text-ink-faint cursor-not-allowed opacity-50',
              )}
            >
              <X size={13} strokeWidth={1.5} className="text-ink-faint" />
              <span>关闭所有标签页</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
