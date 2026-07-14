import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Info,
  RefreshCw,
  Tag,
  Zap,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { getRiskTypeLabel } from '@/constants/riskLabels'
import { cn, formatDimensionName } from '@/lib/utils'
import { useAnalysisStore } from '../../../stores'
import type { Risk, RiskLevel, RiskStatus } from '../../../types'
import { useToast } from '../../common/Toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'

type SortField = 'confidence' | 'level' | 'type' | 'dimension' | 'status'
type SortDirection = 'asc' | 'desc'

interface RiskListViewProps {
  onEvidenceClick?: (sourceId: string, quote: string) => void
}

const levelOrder: Record<RiskLevel, number> = { critical: 3, warning: 2, info: 1 }

const statusLabelMap: Record<RiskStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  ignored: '已忽略',
}

export function RiskListView({ onEvidenceClick }: RiskListViewProps) {
  const result = useAnalysisStore((state) => state.result)
  const selectedRisk = useAnalysisStore((state) => state.selectedRisk)
  const setSelectedRisk = useAnalysisStore((state) => state.setSelectedRisk)
  const getRiskStatus = useAnalysisStore((state) => state.getRiskStatus)
  const setRiskStatus = useAnalysisStore((state) => state.setRiskStatus)
  const scenarioType = useAnalysisStore((state) => state.result?.scenario?.type)
  const { showToast } = useToast()

  const [sortField, setSortField] = useState<SortField>('confidence')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedIndex = useRef<number | null>(null)

  const risks = result?.risks || []

  const sortedRisks = useMemo(() => {
    const sorted = [...risks]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'confidence':
          cmp = (a.confidence || 0) - (b.confidence || 0)
          break
        case 'level':
          cmp = levelOrder[a.level] - levelOrder[b.level]
          break
        case 'type':
          cmp = (a.type || '').localeCompare(b.type || '')
          break
        case 'dimension':
          cmp = (a.dimension || '').localeCompare(b.dimension || '')
          break
        case 'status':
          cmp = getRiskStatus(a.id).localeCompare(getRiskStatus(b.id))
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [risks, sortField, sortDirection, getRiskStatus])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleBatchSetStatus = (status: RiskStatus) => {
    const ids = Array.from(selectedIds)
    ids.forEach((id) => setRiskStatus(id, status))
    showToast(`已标记 ${ids.length} 项为 ${statusLabelMap[status]}`, 'success')
  }

  const handleBatchExport = () => {
    const selectedRisks = risks.filter((r) => selectedIds.has(r.id))
    const exportData = selectedRisks.map((risk) => ({
      ...risk,
      status: getRiskStatus(risk.id, 'pending'),
    }))
    const jsonStr = JSON.stringify(exportData, null, 2)
    navigator.clipboard
      .writeText(jsonStr)
      .then(() => {
        showToast(`已导出 ${selectedRisks.length} 项到剪贴板`, 'success')
      })
      .catch(() => {
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `risks_${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast(`已导出 ${selectedRisks.length} 项`, 'success')
      })
  }

  const handleBatchReanalyze = () => {
    showToast('功能开发中，敬请期待', 'info')
  }

  const handleRowClick = (risk: Risk, index: number, e: React.MouseEvent) => {
    const isMultiSelect = e.ctrlKey || e.metaKey
    const isRangeSelect = e.shiftKey && lastClickedIndex.current !== null

    if (isRangeSelect) {
      const start = Math.min(lastClickedIndex.current!, index)
      const end = Math.max(lastClickedIndex.current!, index)
      const rangeIds = new Set(selectedIds)
      for (let i = start; i <= end; i++) {
        rangeIds.add(sortedRisks[i].id)
      }
      setSelectedIds(rangeIds)
    } else if (isMultiSelect) {
      const newSelected = new Set(selectedIds)
      if (newSelected.has(risk.id)) {
        newSelected.delete(risk.id)
      } else {
        newSelected.add(risk.id)
      }
      setSelectedIds(newSelected)
      lastClickedIndex.current = index
    } else {
      setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)
      setSelectedIds(new Set([risk.id]))
      lastClickedIndex.current = index
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp size={12} className="text-ink" />
    ) : (
      <ChevronDown size={12} className="text-ink" />
    )
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
    <div className="flex flex-col flex-1 overflow-hidden">
      {selectedIds.size > 0 && (
        <div className="px-4 py-2.5 border-b border-rule bg-accent-bg/30 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink">
              已选择 <span className="text-accent font-mono">{selectedIds.size}</span> 项
            </span>
            <button
              type="button"
              className="text-[11px] text-ink-muted hover:text-ink underline underline-offset-2 cursor-pointer transition-colors"
              onClick={() => setSelectedIds(new Set())}
            >
              取消选择
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger className="px-2.5 py-1 rounded text-[11px] bg-paper border border-rule text-ink-muted hover:text-ink hover:bg-paper-dark cursor-pointer transition-colors inline-flex items-center gap-1.5 outline-none">
                <Tag size={12} strokeWidth={1.5} />
                标记状态
                <ChevronDown size={10} strokeWidth={1.5} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {(Object.keys(statusLabelMap) as RiskStatus[]).map((status) => (
                  <DropdownMenuItem key={status} onClick={() => handleBatchSetStatus(status)}>
                    <span className="text-xs">{statusLabelMap[status]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              className="px-2.5 py-1 rounded text-[11px] bg-paper border border-rule text-ink-muted hover:text-ink hover:bg-paper-dark cursor-pointer transition-colors inline-flex items-center gap-1.5"
              onClick={handleBatchExport}
            >
              <Download size={12} strokeWidth={1.5} />
              批量导出
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded text-[11px] bg-paper border border-rule text-ink-muted hover:text-ink hover:bg-paper-dark cursor-pointer transition-colors inline-flex items-center gap-1.5"
              onClick={handleBatchReanalyze}
            >
              <RefreshCw size={12} strokeWidth={1.5} />
              重新分析
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center px-4 py-2 border-b border-rule bg-paper-dark/30 shrink-0">
        <div
          className="w-8 flex items-center justify-center cursor-pointer"
          onClick={() => {
            if (selectedIds.size === sortedRisks.length) {
              setSelectedIds(new Set())
            } else {
              setSelectedIds(new Set(sortedRisks.map((r) => r.id)))
            }
          }}
        >
          <input
            type="checkbox"
            checked={selectedIds.size === sortedRisks.length && sortedRisks.length > 0}
            onChange={() => {}}
            className="w-3.5 h-3.5 rounded border-rule text-accent focus:ring-accent"
          />
        </div>
        <div
          className="flex-1 min-w-0 flex items-center gap-1.5 cursor-pointer hover:text-ink text-ink-muted text-[11px] font-medium select-none"
          onClick={() => handleSort('level')}
        >
          风险
          <SortIcon field="level" />
        </div>
        <div
          className="w-24 flex items-center gap-1.5 cursor-pointer hover:text-ink text-ink-muted text-[11px] font-medium select-none shrink-0"
          onClick={() => handleSort('type')}
        >
          类型
          <SortIcon field="type" />
        </div>
        <div
          className="w-20 flex items-center gap-1.5 cursor-pointer hover:text-ink text-ink-muted text-[11px] font-medium select-none shrink-0"
          onClick={() => handleSort('confidence')}
        >
          置信度
          <SortIcon field="confidence" />
        </div>
        <div
          className="w-24 flex items-center gap-1.5 cursor-pointer hover:text-ink text-ink-muted text-[11px] font-medium select-none shrink-0"
          onClick={() => handleSort('dimension')}
        >
          维度
          <SortIcon field="dimension" />
        </div>
        <div
          className="w-20 flex items-center gap-1.5 cursor-pointer hover:text-ink text-ink-muted text-[11px] font-medium select-none shrink-0"
          onClick={() => handleSort('status')}
        >
          状态
          <SortIcon field="status" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {sortedRisks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-accent-tertiary-bg flex items-center justify-center text-accent-tertiary">
              <CheckCircle size={28} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-ink mb-1">一切正常</p>
            <p className="text-xs text-ink-faint">没有发现风险或冲突</p>
          </div>
        ) : (
          <div role="list" className="divide-y divide-rule/60">
            {sortedRisks.map((risk, index) => {
              const status = getRiskStatus(risk.id, 'pending')
              const isSelected = selectedRisk?.id === risk.id
              const isMultiSelected = selectedIds.has(risk.id)

              return (
                <div
                  key={risk.id}
                  role="listitem"
                  onClick={(e) => handleRowClick(risk, index, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)
                      setSelectedIds(new Set([risk.id]))
                    }
                  }}
                  className={cn(
                    'flex items-center px-4 py-2 cursor-pointer transition-colors duration-150 group relative',
                    isSelected && 'bg-accent-bg/30',
                    isMultiSelected && !isSelected && 'bg-paper-dark/50',
                    !isSelected && !isMultiSelected && 'hover:bg-paper-dark/40',
                  )}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />}

                  <div className="w-8 flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      checked={isMultiSelected}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded border-rule text-accent focus:ring-accent"
                    />
                  </div>

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
                      {getRiskTypeLabel(risk.type, scenarioType)}
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

                  <div className="w-24 shrink-0">
                    {risk.dimension ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-accent-bg/40 text-accent border border-accent/10">
                        {formatDimensionName(risk.dimension)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink-faint">—</span>
                    )}
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
    </div>
  )
}
