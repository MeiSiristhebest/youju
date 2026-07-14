import { AlertTriangle, CheckCircle, Clock, Info, LayoutGrid, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getRiskTypeLabel } from '@/constants/riskLabels'
import { cn, formatDimensionName } from '@/lib/utils'
import { useAnalysisStore } from '../../../stores'
import type { Risk, RiskLevel, RiskStatus } from '../../../types'
import { useToast } from '../../common/Toast'

interface RiskKanbanViewProps {
  onEvidenceClick?: (sourceId: string, quote: string) => void
}

const statusColumns: Array<{
  id: RiskStatus
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = [
  {
    id: 'pending',
    label: '待处理',
    color: 'text-danger',
    bgColor: 'bg-danger-bg/30',
    borderColor: 'border-danger/20',
  },
  {
    id: 'processing',
    label: '处理中',
    color: 'text-warning',
    bgColor: 'bg-warning-bg/30',
    borderColor: 'border-warning/20',
  },
  {
    id: 'resolved',
    label: '已解决',
    color: 'text-success',
    bgColor: 'bg-success-bg/30',
    borderColor: 'border-success/20',
  },
  {
    id: 'ignored',
    label: '已忽略',
    color: 'text-ink-faint',
    bgColor: 'bg-paper-dark/30',
    borderColor: 'border-rule/60',
  },
]

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
    return <AlertTriangle size={13} strokeWidth={1.5} className="text-danger shrink-0" />
  if (level === 'warning')
    return <Zap size={13} strokeWidth={1.5} className="text-warning shrink-0" />
  return <Info size={13} strokeWidth={1.5} className="text-info shrink-0" />
}

const StatusHeaderIcon = ({ status }: { status: RiskStatus }) => {
  switch (status) {
    case 'resolved':
      return <CheckCircle size={14} strokeWidth={1.5} className="text-success" />
    case 'processing':
      return <Clock size={14} strokeWidth={1.5} className="text-warning" />
    case 'ignored':
      return <CheckCircle size={14} strokeWidth={1.5} className="text-ink-faint" />
    default:
      return <AlertTriangle size={14} strokeWidth={1.5} className="text-danger" />
  }
}

interface KanbanCardProps {
  risk: Risk
  isSelected: boolean
  isDragging: boolean
  draggable: boolean
  scenarioType?: string
  onDragStart: (e: React.DragEvent, risk: Risk) => void
  onDragEnd: () => void
  onClick: (risk: Risk) => void
}

function KanbanCard({
  risk,
  isSelected,
  isDragging,
  draggable,
  scenarioType,
  onDragStart,
  onDragEnd,
  onClick,
}: KanbanCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart(e, risk) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={() => onClick(risk)}
      className={cn(
        'p-3 rounded-lg border transition-all duration-200 bg-paper hover:shadow-md hover:border-rule group',
        draggable && 'cursor-grab active:cursor-grabbing',
        !draggable && 'cursor-pointer',
        isSelected && 'border-accent bg-accent-bg/20 shadow-sm',
        !isSelected && 'border-rule/60',
        isDragging && 'opacity-50 scale-95',
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <LevelDot level={risk.level} />
        <LevelIcon level={risk.level} />
        <span
          className={cn(
            'text-xs font-medium leading-snug flex-1',
            risk.level === 'critical' && 'text-danger',
            risk.level === 'warning' && 'text-warning',
            risk.level === 'info' && 'text-info',
          )}
        >
          {risk.title}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-paper-dark border border-rule/60 text-ink-muted">
          {getRiskTypeLabel(risk.type, scenarioType)}
        </span>
        {risk.confidence !== undefined && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-paper-dark border border-rule/60 text-ink-muted font-mono">
            {risk.confidence}%
          </span>
        )}
      </div>

      {risk.dimension && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-accent-bg/40 text-accent border border-accent/10">
          {formatDimensionName(risk.dimension)}
        </span>
      )}
    </div>
  )
}

export function RiskKanbanView({ onEvidenceClick }: RiskKanbanViewProps) {
  const result = useAnalysisStore((state) => state.result)
  const selectedRisk = useAnalysisStore((state) => state.selectedRisk)
  const setSelectedRisk = useAnalysisStore((state) => state.setSelectedRisk)
  const getRiskStatus = useAnalysisStore((state) => state.getRiskStatus)
  const setRiskStatus = useAnalysisStore((state) => state.setRiskStatus)
  const scenarioType = useAnalysisStore((state) => state.result?.scenario?.type)
  const { showToast } = useToast()

  const [draggedRisk, setDraggedRisk] = useState<Risk | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<RiskStatus | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const risks = result?.risks || []

  const risksByStatus = useMemo(() => {
    const grouped: Record<RiskStatus, Risk[]> = {
      pending: [],
      processing: [],
      resolved: [],
      ignored: [],
    }
    risks.forEach((risk) => {
      const status = getRiskStatus(risk.id, 'pending')
      grouped[status].push(risk)
    })
    return grouped
  }, [risks, getRiskStatus])

  const handleDragStart = (e: React.DragEvent, risk: Risk) => {
    setDraggedRisk(risk)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', risk.id)
  }

  const handleDragEnd = () => {
    setDraggedRisk(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, status: RiskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== status) {
      setDragOverColumn(status)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetStatus: RiskStatus) => {
    e.preventDefault()
    if (!draggedRisk) return

    const currentStatus = getRiskStatus(draggedRisk.id, 'pending')
    if (currentStatus === targetStatus) {
      setDraggedRisk(null)
      setDragOverColumn(null)
      return
    }

    setRiskStatus(draggedRisk.id, targetStatus)
    showToast(
      `已更新 1 项状态为「${statusColumns.find((c) => c.id === targetStatus)?.label}」`,
      'success',
    )

    setDraggedRisk(null)
    setDragOverColumn(null)
  }

  const handleCardClick = (risk: Risk) => {
    setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)
  }

  const totalCount = risks.length

  return (
    <div className="flex flex-col flex-1">
      {totalCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 mb-4 rounded-full bg-accent-tertiary-bg flex items-center justify-center text-accent-tertiary">
            <CheckCircle size={28} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-ink mb-1">一切正常</p>
          <p className="text-xs text-ink-faint">没有发现风险或冲突</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-4 h-full min-w-max">
            {statusColumns.map((column) => {
              const columnRisks = risksByStatus[column.id]
              const isDragOver =
                dragOverColumn === column.id && draggedRisk?.id
                  ? getRiskStatus(draggedRisk.id, 'pending') !== column.id
                  : false

              return (
                <div
                  key={column.id}
                  className={cn(
                    'flex flex-col w-72 shrink-0 rounded-xl border transition-all duration-200',
                    column.bgColor,
                    column.borderColor,
                    isDragOver && 'ring-2 ring-accent/50 border-accent/50',
                  )}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className="px-3 py-2.5 border-b border-rule/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <StatusHeaderIcon status={column.id} />
                      <span className={cn('text-xs font-semibold', column.color)}>
                        {column.label}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-paper border border-rule/60',
                        column.id === 'ignored' ? 'text-ink-muted' : column.color,
                      )}
                    >
                      {columnRisks.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {columnRisks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <LayoutGrid size={20} strokeWidth={1.5} className="text-ink-faint mb-2" />
                        <p className="text-[11px] text-ink-faint">暂无风险</p>
                      </div>
                    ) : (
                      columnRisks.map((risk) => (
                        <KanbanCard
                          key={risk.id}
                          risk={risk}
                          isSelected={selectedRisk?.id === risk.id}
                          isDragging={draggedRisk?.id === risk.id}
                          draggable={!isMobile}
                          scenarioType={scenarioType}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onClick={handleCardClick}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
