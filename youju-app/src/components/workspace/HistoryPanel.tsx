import {
  BookOpen,
  Briefcase,
  CheckCircle,
  Clock,
  FileText,
  GitCompare,
  Home,
  PenLine,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEMO_HISTORY_SNAPSHOTS } from '../../constants/demoData'
import { SCENARIOS } from '../../constants/workspace'
import { historyStorage } from '../../lib/history'
import type { HistorySnapshot, TaskRecord } from '../../types'

const PAGE_SIZE = 20

interface HistoryPanelProps {
  isOpen: boolean
  tasks: TaskRecord[]
  isDemo?: boolean
  onClose: () => void
  onSelectTask: (task: TaskRecord) => void
  onSelectSnapshot?: (snapshot: HistorySnapshot) => void
  onDeleteTask: (taskId: string) => void
  onDeleteSnapshot?: (snapshotId: string) => void
  onCompare?: (snapshotA: HistorySnapshot, snapshotB: HistorySnapshot) => void
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
  isDemo = false,
  onClose,
  onSelectTask,
  onSelectSnapshot,
  onDeleteTask,
  onDeleteSnapshot,
  onCompare,
}: HistoryPanelProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedA, setSelectedA] = useState<string | null>(null)
  const [selectedB, setSelectedB] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([])
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isDemo) {
      setSnapshots(DEMO_HISTORY_SNAPSHOTS as HistorySnapshot[])
    } else {
      setSnapshots(historyStorage.getSnapshots())
    }
  }, [isDemo])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setCompareMode(false)
    setSelectedA(null)
    setSelectedB(null)
  }, [isOpen, snapshots.length])

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, snapshots.length))
  }, [snapshots.length])

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

  const handleItemClick = (snapshot: HistorySnapshot) => {
    if (compareMode) {
      if (!selectedA) {
        setSelectedA(snapshot.id)
      } else if (selectedA === snapshot.id) {
        setSelectedA(null)
      } else if (!selectedB) {
        setSelectedB(snapshot.id)
      } else if (selectedB === snapshot.id) {
        setSelectedB(null)
      } else {
        setSelectedA(snapshot.id)
        setSelectedB(null)
      }
    } else {
      if (onSelectSnapshot) {
        onSelectSnapshot(snapshot)
      } else {
        const task: TaskRecord = {
          id: snapshot.id,
          title: snapshot.title,
          scenarioType: snapshot.scenarioType,
          sourceCount: snapshot.sourceCount,
          createdAt: snapshot.createdAt,
        }
        onSelectTask(task)
      }
      onClose()
    }
  }

  const handleCompare = () => {
    if (!selectedA || !selectedB || !onCompare) return
    const snapA = snapshots.find((s) => s.id === selectedA)
    const snapB = snapshots.find((s) => s.id === selectedB)
    if (snapA && snapB) {
      onCompare(snapA, snapB)
      setCompareMode(false)
      setSelectedA(null)
      setSelectedB(null)
    }
  }

  const handleDelete = (snapshot: HistorySnapshot, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDemo) {
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshot.id))
    } else {
      historyStorage.deleteSnapshot(snapshot.id)
      setSnapshots(historyStorage.getSnapshots())
    }
    if (onDeleteSnapshot) {
      onDeleteSnapshot(snapshot.id)
    }
    if (selectedA === snapshot.id) setSelectedA(null)
    if (selectedB === snapshot.id) setSelectedB(null)
  }

  const exitCompareMode = () => {
    setCompareMode(false)
    setSelectedA(null)
    setSelectedB(null)
  }

  if (!isOpen) return null

  const visibleSnapshots = snapshots.slice(0, visibleCount)
  const hasMore = visibleCount < snapshots.length

  const getItemClass = (snapshot: HistorySnapshot) => {
    const isA = selectedA === snapshot.id
    const isB = selectedB === snapshot.id
    if (isA) return 'border-l-4 border-l-ink bg-paper-dark/80'
    if (isB) return 'border-l-4 border-l-accent bg-paper-dark/80'
    return 'border-l-4 border-l-transparent hover:bg-paper-dark/50'
  }

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (compareMode) {
            exitCompareMode()
          } else {
            onClose()
          }
        }
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-80 bg-paper border-r border-rule shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} strokeWidth={1.5} className="text-ink-muted" />
            <span className="text-sm font-medium text-ink">
              {compareMode ? '选择对比版本' : '历史记录'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {compareMode ? (
              <button
                type="button"
                className="px-2 py-1 text-[11px] bg-accent text-paper rounded-md cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCompare}
                disabled={!selectedA || !selectedB}
              >
                对比
              </button>
            ) : (
              <button
                type="button"
                className="w-7 h-7 rounded-md flex items-center justify-center text-ink-muted border border-rule/60 bg-paper-dark/60 hover:bg-paper-dark hover:text-ink transition-colors duration-200 cursor-pointer"
                onClick={() => setCompareMode(true)}
                title="对比模式"
                aria-label="对比模式"
              >
                <GitCompare size={13} strokeWidth={1.5} />
              </button>
            )}
            <button
              type="button"
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200 ml-1"
              onClick={() => {
                if (compareMode) {
                  exitCompareMode()
                } else {
                  onClose()
                }
              }}
              aria-label="关闭"
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {compareMode && (
          <div className="px-4 py-2.5 border-b border-rule bg-paper/[0.02]">
            <div className="flex items-center gap-2 text-[11px]">
              <div
                className={`flex-1 px-2 py-1.5 rounded border ${
                  selectedA
                    ? 'bg-paper-dark border-ink/50 text-ink'
                    : 'bg-paper-dark/50 border-dashed border-rule text-ink-faint'
                }`}
              >
                <span className="font-mono mr-1">A</span>
                {(() => {
                  const snap = snapshots.find((s) => s.id === selectedA)
                  if (!snap) return '请选择第一个版本'
                  return snap.title.length > 12 ? snap.title.substring(0, 12) + '…' : snap.title
                })()}
              </div>
              <span className="text-ink-faint">→</span>
              <div
                className={`flex-1 px-2 py-1.5 rounded border ${
                  selectedB
                    ? 'bg-accent-bg border-accent/50 text-accent'
                    : 'bg-paper-dark/50 border-dashed border-rule text-ink-faint'
                }`}
              >
                <span className="font-mono mr-1">B</span>
                {(() => {
                  const snap = snapshots.find((s) => s.id === selectedB)
                  if (!snap) return '请选择第二个版本'
                  return snap.title.length > 12 ? snap.title.substring(0, 12) + '…' : snap.title
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-3 text-ink-faint border border-rule">
                <Clock size={20} strokeWidth={1.5} />
              </div>
              <p className="text-xs text-ink-faint font-medium">暂无历史记录</p>
              <p className="text-[11px] text-ink-faint mt-1">完成分析后会自动保存记录</p>
            </div>
          ) : (
            <div className="divide-y divide-rule/60">
              {visibleSnapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className={`p-3 cursor-pointer transition-colors group ${getItemClass(snapshot)}`}
                  onClick={() => handleItemClick(snapshot)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-paper-dark border border-rule flex items-center justify-center text-ink-muted shrink-0">
                      {getScenarioIcon(snapshot.scenarioType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate mb-0.5">
                        {snapshot.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-faint">
                        <span className="truncate">{getScenarioName(snapshot.scenarioType)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <FileText size={10} strokeWidth={1.5} />
                          {snapshot.sourceCount} 份材料
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <AlertTriangleStub />
                          {snapshot.result.summary?.total || snapshot.result.risks?.length || 0}{' '}
                          风险
                        </span>
                      </div>
                      <div className="text-[10px] text-ink-faint mt-1 font-mono">
                        {formatDate(snapshot.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {compareMode && (selectedA === snapshot.id || selectedB === snapshot.id) && (
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-success bg-success-bg/50">
                          <CheckCircle size={12} strokeWidth={2} />
                        </div>
                      )}
                      {!compareMode && onCompare && (
                        <button
                          type="button"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint opacity-0 group-hover:opacity-100 hover:text-accent hover:bg-accent-bg/50 transition-all duration-200 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCompareMode(true)
                            setSelectedA(snapshot.id)
                            setSelectedB(null)
                          }}
                          aria-label="对比"
                          title="选择对比"
                        >
                          <GitCompare size={12} strokeWidth={1.5} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger-bg transition-all duration-200 shrink-0"
                        onClick={(e) => handleDelete(snapshot, e)}
                        aria-label="删除"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
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

function AlertTriangleStub() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
