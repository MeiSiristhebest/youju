import { BookOpen, Briefcase, Clock, FileText, Home, PenLine, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SCENARIOS } from '../../constants/workspace'
import type { TaskRecord } from '../../types'

const PAGE_SIZE = 20

interface HistoryPanelProps {
  isOpen: boolean
  tasks: TaskRecord[]
  onClose: () => void
  onSelectTask: (task: TaskRecord) => void
  onDeleteTask: (taskId: string) => void
}

const getScenarioIcon = (scenarioType: string) => {
  switch (scenarioType) {
    case 'job':
      return <Briefcase size={14} strokeWidth={1.5} />
    case 'rent':
      return <Home size={14} strokeWidth={1.5} />
    case 'homework':
      return <BookOpen size={14} strokeWidth={1.5} />
    default:
      return <PenLine size={14} strokeWidth={1.5} />
  }
}

const getScenarioName = (scenarioType: string) => {
  const scenario = SCENARIOS.find((s) => s.id === scenarioType)
  return scenario?.name || '自定义分析'
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString()
}

export function HistoryPanel({
  isOpen,
  tasks,
  onClose,
  onSelectTask,
  onDeleteTask,
}: HistoryPanelProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // 列表数据变化时重置分批计数
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [tasks])

  // 无限滚动：观察哨兵元素进入视口时加载下一批
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, tasks.length))
  }, [tasks.length])

  useEffect(() => {
    if (!isOpen) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '100px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isOpen, loadMore])

  if (!isOpen) return null

  const visibleTasks = tasks.slice(0, visibleCount)
  const hasMore = visibleCount < tasks.length

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-80 bg-paper border-r border-rule shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} strokeWidth={1.5} className="text-ink-muted" />
            <span className="text-sm font-medium text-ink">历史记录</span>
          </div>
          <button
            type="button"
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-3 text-ink-faint border border-rule">
                <Clock size={20} strokeWidth={1.5} />
              </div>
              <p className="text-xs text-ink-faint font-medium">暂无历史记录</p>
              <p className="text-[11px] text-ink-faint mt-1">完成分析后会自动保存记录</p>
            </div>
          ) : (
            <div className="divide-y divide-rule/60">
              {visibleTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 hover:bg-paper-dark/50 cursor-pointer transition-colors group"
                  onClick={() => onSelectTask(task)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-paper-dark border border-rule flex items-center justify-center text-ink-muted shrink-0">
                      {getScenarioIcon(task.scenarioType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate mb-0.5">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-faint">
                        <span className="truncate">{getScenarioName(task.scenarioType)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <FileText size={10} strokeWidth={1.5} />
                          {task.sourceCount} 份材料
                        </span>
                      </div>
                      <div className="text-[10px] text-ink-faint mt-1 font-mono">
                        {formatDate(task.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger-bg transition-all duration-200 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteTask(task.id)
                      }}
                      aria-label="删除"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="py-3 text-center">
                  <span className="text-[11px] text-ink-faint">加载更多…</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
