import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Minus,
  Plus,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { compareRisks, formatDuration, getLevelOrder } from '../../lib/history'
import { cn } from '../../lib/utils'
import type { Risk, RiskLevel } from '../../types'
import type { HistorySnapshot, RiskDiffItem, RiskDiffResult } from '../../types/history'

interface HistoryDiffPanelProps {
  isOpen: boolean
  snapshotA: HistorySnapshot | null
  snapshotB: HistorySnapshot | null
  onClose: () => void
  onViewSnapshot?: (snapshot: HistorySnapshot) => void
}

function DiffRiskItem({ diffItem, index }: { diffItem: RiskDiffItem; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 80)
    return () => clearTimeout(timer)
  }, [index])

  const risk = diffItem.changeType === 'removed' ? diffItem.riskA : diffItem.riskB
  if (!risk) return null

  const getChangeBadge = () => {
    switch (diffItem.changeType) {
      case 'added':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-bg text-success border border-success/30">
            <Plus size={10} strokeWidth={2} />
            NEW
          </span>
        )
      case 'removed':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-danger-bg text-danger border border-danger/30">
            <Minus size={10} strokeWidth={2} />
            REMOVED
          </span>
        )
      case 'modified':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning-bg text-warning border border-warning/30">
            <Zap size={10} strokeWidth={2} />
            CHANGED
          </span>
        )
      default:
        return null
    }
  }

  const getLevelBadge = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return 'bg-danger-bg text-danger'
      case 'warning':
        return 'bg-warning-bg text-warning'
      case 'info':
        return 'bg-success-bg text-success'
      default:
        return 'bg-paper-dark text-ink-muted'
    }
  }

  const getLevelIcon = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle size={13} strokeWidth={1.5} />
      case 'warning':
        return <Zap size={13} strokeWidth={1.5} />
      case 'info':
        return <CheckCircle size={13} strokeWidth={1.5} />
      default:
        return null
    }
  }

  const getLevelName = (level: string) => {
    switch (level) {
      case 'critical':
        return '严重'
      case 'warning':
        return '警告'
      case 'info':
        return '提示'
      default:
        return level
    }
  }

  return (
    <div
      className={cn(
        'w-full transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        diffItem.changeType === 'added' && 'bg-success-bg/20',
        diffItem.changeType === 'removed' && 'bg-danger-bg/20',
        diffItem.changeType === 'modified' && 'bg-warning-bg/15',
      )}
    >
      <div className="px-4 py-3 hover:bg-paper-dark/30 transition-colors">
        <div className="flex gap-3 items-start">
          <div
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5',
              getLevelBadge(risk.level),
            )}
          >
            {getLevelIcon(risk.level)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    risk.level === 'critical' && 'text-danger',
                    risk.level === 'warning' && 'text-warning',
                    risk.level === 'info' && 'text-success',
                  )}
                >
                  {risk.title}
                </span>
                {getChangeBadge()}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {diffItem.changeType === 'modified' && diffItem.levelChanged && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-warning-bg text-warning">
                    {getLevelOrder(diffItem.oldLevel || '') <
                    getLevelOrder(diffItem.newLevel || '') ? (
                      <ArrowUp size={10} strokeWidth={2} />
                    ) : (
                      <ArrowDown size={10} strokeWidth={2} />
                    )}
                    {getLevelName(diffItem.oldLevel || '')} →{' '}
                    {getLevelName(diffItem.newLevel || '')}
                  </span>
                )}
                {diffItem.changeType === 'modified' && diffItem.confidenceChanged && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-paper-dark text-ink-muted">
                    {diffItem.oldConfidence}% → {diffItem.newConfidence}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-[11px] text-ink-faint mb-1.5 font-mono">
              {risk.type === 'conflict'
                ? '直接矛盾'
                : risk.type === 'promise'
                  ? '承诺未落文字'
                  : risk.type === 'missing'
                    ? '信息缺失'
                    : '信息提示'}
              {risk.dimension && ` · ${risk.dimension}`}
            </div>
            <div className="text-xs text-ink-muted leading-relaxed line-clamp-2">
              {risk.description}
            </div>

            {diffItem.changeType === 'modified' &&
              diffItem.descriptionChanged &&
              diffItem.riskA &&
              diffItem.riskB && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-ink-faint shrink-0 mt-0.5">旧：</span>
                    <p className="text-[11px] text-ink-faint line-through">
                      {diffItem.riskA.description}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-ink-faint shrink-0 mt-0.5">新：</span>
                    <p className="text-[11px] text-ink-muted">{diffItem.riskB.description}</p>
                  </div>
                </div>
              )}

            {risk.evidence && risk.evidence.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEvidence(!showEvidence)
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-accent transition-colors cursor-pointer group"
                >
                  <FileText size={11} strokeWidth={1.5} />
                  <span>证据来源 ({risk.evidence.length})</span>
                  {showEvidence ? (
                    <ChevronUp
                      size={11}
                      strokeWidth={1.5}
                      className="group-hover:text-accent transition-colors"
                    />
                  ) : (
                    <ChevronDown
                      size={11}
                      strokeWidth={1.5}
                      className="group-hover:text-accent transition-colors"
                    />
                  )}
                </button>
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    showEvidence ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0',
                  )}
                >
                  <div className="space-y-1.5">
                    {risk.evidence.map((ev, idx) => (
                      <div key={idx} className="rounded-lg bg-paper/[0.02] border border-rule p-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText
                            size={10}
                            strokeWidth={1.5}
                            className="text-ink-faint shrink-0"
                          />
                          <span className="text-[10px] text-ink-faint truncate">
                            {ev.sourceName}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed italic pl-3 border-l-2 border-rule">
                          &quot;{ev.quote}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HistoryDiffPanel({
  isOpen,
  snapshotA,
  snapshotB,
  onClose,
  onViewSnapshot,
}: HistoryDiffPanelProps) {
  const [diffResult, setDiffResult] = useState<RiskDiffResult | null>(null)
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'added' | 'removed' | 'modified' | 'unchanged'
  >('all')

  useEffect(() => {
    if (snapshotA && snapshotB) {
      const result = compareRisks(snapshotA.result, snapshotB.result)
      setDiffResult(result)
    } else {
      setDiffResult(null)
    }
  }, [snapshotA, snapshotB])

  if (!isOpen) return null

  const filteredItems = diffResult
    ? activeFilter === 'all'
      ? [
          ...diffResult.added,
          ...diffResult.modified,
          ...diffResult.removed,
          ...diffResult.unchanged,
        ]
      : diffResult[activeFilter]
    : []

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[950] bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-4 md:inset-10 lg:inset-16 bg-paper border border-rule rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink">版本对比</span>
            </div>
            {snapshotA && snapshotB && (
              <div className="flex items-center gap-2 text-[11px]">
                <div
                  className="px-2 py-1 rounded bg-paper-dark border border-rule cursor-pointer hover:border-accent/50 transition-colors"
                  onClick={() => onViewSnapshot?.(snapshotA)}
                >
                  <span className="text-ink-faint">A: </span>
                  <span className="text-ink font-medium">{snapshotA.title}</span>
                  <span className="text-ink-faint ml-1 font-mono">
                    ({formatDate(snapshotA.createdAt)})
                  </span>
                </div>
                <span className="text-ink-faint">→</span>
                <div
                  className="px-2 py-1 rounded bg-accent-bg border border-accent-faint cursor-pointer hover:border-accent/50 transition-colors"
                  onClick={() => onViewSnapshot?.(snapshotB)}
                >
                  <span className="text-accent-faint">B: </span>
                  <span className="text-accent font-medium">{snapshotB.title}</span>
                  <span className="text-accent-faint ml-1 font-mono">
                    ({formatDate(snapshotB.createdAt)})
                  </span>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {diffResult && (
          <>
            <div className="px-5 py-3 border-b border-rule bg-paper/[0.02] shrink-0">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    <span className="text-xs text-ink-muted">
                      新增{' '}
                      <span className="text-success font-medium">
                        {diffResult.stats.addedCount}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-danger"></span>
                    <span className="text-xs text-ink-muted">
                      消失{' '}
                      <span className="text-danger font-medium">
                        {diffResult.stats.removedCount}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-warning"></span>
                    <span className="text-xs text-ink-muted">
                      变化{' '}
                      <span className="text-warning font-medium">
                        {diffResult.stats.modifiedCount}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-ink-faint"></span>
                    <span className="text-xs text-ink-muted">
                      不变{' '}
                      <span className="text-ink font-medium">
                        {diffResult.stats.unchangedCount}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-ink-faint font-mono">
                  共 {diffResult.stats.totalA} → {diffResult.stats.totalB} 条风险
                </div>
              </div>

              <div className="flex gap-1.5">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'added', label: '新增' },
                  { key: 'removed', label: '消失' },
                  { key: 'modified', label: '变化' },
                  { key: 'unchanged', label: '不变' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                      activeFilter === filter.key
                        ? 'bg-ink text-paper'
                        : 'text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper-dark border border-rule/60',
                    )}
                    onClick={() => setActiveFilter(filter.key as typeof activeFilter)}
                  >
                    {filter.label}
                    <span className="ml-1 opacity-60">
                      (
                      {filter.key === 'all'
                        ? diffResult.stats.addedCount +
                          diffResult.stats.removedCount +
                          diffResult.stats.modifiedCount +
                          diffResult.stats.unchangedCount
                        : diffResult.stats[`${filter.key}Count` as keyof typeof diffResult.stats]}
                      )
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-3 text-ink-faint border border-rule">
                    <CheckCircle size={20} strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-ink-faint font-medium">该分类下没有风险</p>
                </div>
              ) : (
                <div className="divide-y divide-rule/60">
                  {filteredItems.map((item, index) => (
                    <DiffRiskItem key={item.id} diffItem={item} index={index} />
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-rule bg-paper/[0.02] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 text-[11px] text-ink-faint">
                <span>A 耗时: {formatDuration(snapshotA?.durationMs || 0)}</span>
                <span>B 耗时: {formatDuration(snapshotB?.durationMs || 0)}</span>
                <span>A 材料: {snapshotA?.sourceCount || 0} 份</span>
                <span>B 材料: {snapshotB?.sourceCount || 0} 份</span>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 bg-ink text-paper rounded-md text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity"
                onClick={onClose}
              >
                关闭
              </button>
            </div>
          </>
        )}

        {!diffResult && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mx-auto mb-3 text-ink-faint border border-rule">
                <AlertTriangle size={20} strokeWidth={1.5} />
              </div>
              <p className="text-sm text-ink-muted">请选择两个版本进行对比</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
