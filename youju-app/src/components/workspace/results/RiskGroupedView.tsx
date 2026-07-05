import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Info,
  Layers,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAnalysisStore } from '../../../stores'
import type { Risk, RiskLevel, RiskStatus } from '../../../types'

type GroupByType = 'dimension' | 'type' | 'confidence'
type ConfidenceGroup = 'high' | 'medium' | 'low'

interface RiskGroupedViewProps {
  onEvidenceClick?: (sourceId: string, quote: string) => void
}

interface GroupData {
  key: string
  label: string
  risks: Risk[]
  levelCounts: Record<RiskLevel, number>
}

const _levelOrder: Record<RiskLevel, number> = { critical: 3, warning: 2, info: 1 }

const statusLabelMap: Record<RiskStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  ignored: '已忽略',
}

const typeLabelMap: Record<string, string> = {
  conflict: '直接矛盾',
  promise: '承诺未落文字',
  missing: '信息缺失',
  info: '信息提示',
}

const confidenceGroupLabels: Record<ConfidenceGroup, string> = {
  high: '高置信度 (≥80%)',
  medium: '中置信度 (50%-80%)',
  low: '低置信度 (<50%)',
}

const groupByLabels: Record<GroupByType, string> = {
  dimension: '按维度',
  type: '按类型',
  confidence: '按置信度',
}

function getConfidenceGroup(confidence: number): ConfidenceGroup {
  if (confidence >= 80) return 'high'
  if (confidence >= 50) return 'medium'
  return 'low'
}

export function RiskGroupedView({ onEvidenceClick }: RiskGroupedViewProps) {
  const result = useAnalysisStore((state) => state.result)
  const selectedRisk = useAnalysisStore((state) => state.selectedRisk)
  const setSelectedRisk = useAnalysisStore((state) => state.setSelectedRisk)
  const getRiskStatus = useAnalysisStore((state) => state.getRiskStatus)

  const [groupBy, setGroupBy] = useState<GroupByType>('dimension')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showGroupMenu, setShowGroupMenu] = useState(false)

  const risks = result?.risks || []

  const groups = useMemo<GroupData[]>(() => {
    const groupMap = new Map<string, GroupData>()

    risks.forEach((risk) => {
      let groupKey: string
      let groupLabel: string

      switch (groupBy) {
        case 'dimension':
          groupKey = risk.dimension || '未分类'
          groupLabel = risk.dimension || '未分类'
          break
        case 'type':
          groupKey = risk.type || 'unknown'
          groupLabel = typeLabelMap[risk.type] || risk.type || '未知类型'
          break
        case 'confidence': {
          const confGroup = getConfidenceGroup(risk.confidence || 0)
          groupKey = confGroup
          groupLabel = confidenceGroupLabels[confGroup]
          break
        }
        default:
          groupKey = 'default'
          groupLabel = '默认'
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          risks: [],
          levelCounts: { critical: 0, warning: 0, info: 0 },
        })
      }

      const group = groupMap.get(groupKey)!
      group.risks.push(risk)
      group.levelCounts[risk.level]++
    })

    const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
      if (groupBy === 'confidence') {
        const order: Record<ConfidenceGroup, number> = { high: 0, medium: 1, low: 2 }
        return (order[a.key as ConfidenceGroup] ?? 99) - (order[b.key as ConfidenceGroup] ?? 99)
      }
      return b.risks.length - a.risks.length
    })

    return sortedGroups
  }, [risks, groupBy])

  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([groups[0].key]))
    }
  }, [groups, expandedGroups.size])

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedGroups(new Set(groups.map((g) => g.key)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const handleRiskClick = (risk: Risk) => {
    setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)
  }

  const LevelDot = ({ level }: { level: RiskLevel }) => (
    <div
      className={cn(
        'w-2 h-2 rounded-full shrink-0',
        level === 'critical' && 'bg-danger',
        level === 'warning' && 'bg-warning',
        level === 'info' && 'bg-info',
      )}
    />
  )

  const LevelIcon = ({ level }: { level: RiskLevel }) => {
    if (level === 'critical')
      return <AlertTriangle size={13} strokeWidth={1.5} className="text-danger" />
    if (level === 'warning') return <Zap size={13} strokeWidth={1.5} className="text-warning" />
    return <Info size={13} strokeWidth={1.5} className="text-info" />
  }

  const StatusIcon = ({ status }: { status: RiskStatus }) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={12} strokeWidth={1.5} className="text-success" />
      case 'processing':
        return <Clock size={12} strokeWidth={1.5} className="text-warning" />
      case 'ignored':
        return <CheckCircle size={12} strokeWidth={1.5} className="text-ink-faint" />
      default:
        return <AlertTriangle size={12} strokeWidth={1.5} className="text-danger" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-rule bg-paper-dark/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={14} strokeWidth={1.5} className="text-ink-faint" />
          <span className="text-[11px] font-medium text-ink-muted">分组视图</span>
          <span className="text-[10px] text-ink-faint font-mono">
            {risks.length} 个风险 · {groups.length} 个分组
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={expandAll}
            className="px-2 py-1 rounded text-[10px] bg-paper border border-rule text-ink-muted hover:text-ink hover:bg-paper-dark cursor-pointer transition-colors"
          >
            全部展开
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2 py-1 rounded text-[10px] bg-paper border border-rule text-ink-muted hover:text-ink hover:bg-paper-dark cursor-pointer transition-colors"
          >
            全部收起
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowGroupMenu(!showGroupMenu)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] bg-accent-bg/40 text-accent border border-accent/10 hover:bg-accent-bg/60 cursor-pointer transition-colors"
            >
              <Filter size={11} strokeWidth={1.5} />
              {groupByLabels[groupBy]}
              <ChevronDown size={10} strokeWidth={1.5} />
            </button>
            {showGroupMenu && (
              <div className="absolute right-0 top-full mt-1 bg-paper border border-rule rounded-lg shadow-lg z-20 min-w-[120px] overflow-hidden">
                {(Object.keys(groupByLabels) as GroupByType[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setGroupBy(key)
                      setShowGroupMenu(false)
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-[11px] cursor-pointer transition-colors',
                      groupBy === key
                        ? 'bg-accent-bg/40 text-accent'
                        : 'text-ink-muted hover:bg-paper-dark hover:text-ink',
                    )}
                  >
                    {groupByLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-tertiary-bg flex items-center justify-center text-accent-tertiary">
              <CheckCircle size={28} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-ink mb-1">一切正常</p>
            <p className="text-xs text-ink-faint">没有发现风险或冲突</p>
          </div>
        ) : (
          <div className="divide-y divide-rule/60">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.key)
              return (
                <div key={group.key} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-paper-dark/20 hover:bg-paper-dark/40 cursor-pointer transition-colors text-left w-full"
                  >
                    {isExpanded ? (
                      <ChevronDown
                        size={14}
                        strokeWidth={1.5}
                        className="text-ink-faint shrink-0"
                      />
                    ) : (
                      <ChevronRight
                        size={14}
                        strokeWidth={1.5}
                        className="text-ink-faint shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink truncate">{group.label}</span>
                      <span className="text-[10px] text-ink-faint font-mono px-1.5 py-0.5 bg-paper rounded border border-rule/60">
                        {group.risks.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {group.levelCounts.critical > 0 && (
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                          <span className="text-[9px] text-danger font-mono">
                            {group.levelCounts.critical}
                          </span>
                        </div>
                      )}
                      {group.levelCounts.warning > 0 && (
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                          <span className="text-[9px] text-warning font-mono">
                            {group.levelCounts.warning}
                          </span>
                        </div>
                      )}
                      {group.levelCounts.info > 0 && (
                        <div className="flex items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-info" />
                          <span className="text-[9px] text-info font-mono">
                            {group.levelCounts.info}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-rule/40 bg-paper/30">
                      {group.risks.map((risk) => {
                        const status = getRiskStatus(risk.id, 'pending')
                        const isSelected = selectedRisk?.id === risk.id

                        return (
                          <div
                            key={risk.id}
                            role="listitem"
                            onClick={() => handleRiskClick(risk)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleRiskClick(risk)
                              }
                            }}
                            className={cn(
                              'flex items-center pl-10 pr-4 py-2 cursor-pointer transition-colors duration-150 group relative',
                              isSelected && 'bg-accent-bg/30',
                              !isSelected && 'hover:bg-paper-dark/40',
                            )}
                          >
                            {isSelected && (
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />
                            )}

                            <div className="flex-1 min-w-0 flex items-center gap-2.5">
                              <LevelDot level={risk.level} />
                              <LevelIcon level={risk.level} />
                              <span
                                className={cn(
                                  'text-xs font-medium truncate',
                                  risk.level === 'critical' && 'text-danger',
                                  risk.level === 'warning' && 'text-warning',
                                  risk.level === 'info' && 'text-info',
                                )}
                              >
                                {risk.title}
                              </span>
                            </div>

                            <div className="w-24 shrink-0">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-paper border border-rule/60 text-ink-muted">
                                {typeLabelMap[risk.type] || risk.type}
                              </span>
                            </div>

                            <div className="w-20 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1 bg-rule rounded-full overflow-hidden max-w-[60px]">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      (risk.confidence || 0) >= 80 && 'bg-success',
                                      (risk.confidence || 0) >= 50 &&
                                        (risk.confidence || 0) < 80 &&
                                        'bg-warning',
                                      (risk.confidence || 0) < 50 && 'bg-danger',
                                    )}
                                    style={{ width: `${risk.confidence || 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-ink-faint font-mono w-8">
                                  {risk.confidence || 0}%
                                </span>
                              </div>
                            </div>

                            <div className="w-20 shrink-0 flex items-center gap-1.5">
                              <StatusIcon status={status} />
                              <span
                                className={cn(
                                  'text-[10px]',
                                  status === 'resolved' && 'text-success',
                                  status === 'processing' && 'text-warning',
                                  status === 'pending' && 'text-danger',
                                  status === 'ignored' && 'text-ink-faint',
                                )}
                              >
                                {statusLabelMap[status]}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
