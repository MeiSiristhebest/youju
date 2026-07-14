import { useGSAP } from '@gsap/react'
import { AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'
import { useRef } from 'react'
import { cn, formatDimensionName } from '@/lib/utils'
import { gsap } from '../../lib/gsap'
import type { Risk, RiskStatus } from '../../types'
import { RiskWorkflowSkeleton } from './RiskWorkflowSkeleton'
import { WorkspaceEmpty } from './WorkspaceEmpty'

interface RiskWorkflowPanelProps {
  risks: Risk[]
  totalCount: number
  unresolvedCount: number
  selectedRiskId: string | null
  onSelectRisk: (risk: Risk) => void
  getRiskStatus: (riskId: string) => RiskStatus
  isLoading?: boolean
  variant?: 'sidebar' | 'drawer'
  showHeader?: boolean
}

const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  ignored: '已忽略',
}

const RISK_STATUS_STYLES: Record<RiskStatus, string> = {
  pending: 'bg-danger-bg text-danger border-danger/30',
  processing: 'bg-warning-bg text-warning border-warning/30',
  resolved: 'bg-success-bg text-success border-success/30',
  ignored: 'bg-paper-dark text-ink-faint border-rule',
}

export function RiskWorkflowPanel({
  risks,
  totalCount,
  unresolvedCount,
  selectedRiskId,
  onSelectRisk,
  getRiskStatus,
  isLoading = false,
  variant = 'sidebar',
  showHeader = true,
}: RiskWorkflowPanelProps) {
  const resolvedCount = totalCount - unresolvedCount
  const progressPercent = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0
  const listRef = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useGSAP(
    () => {
      const isMobile = window.matchMedia('(max-width: 768px)').matches
      if (isMobile || hasAnimated.current || risks.length === 0) return

      hasAnimated.current = true

      gsap.from('[data-risk-item]', {
        y: 12,
        opacity: 0,
        stagger: 0.06,
        duration: 0.4,
        ease: 'power3.out',
        delay: 0.45,
      })
    },
    { scope: listRef, dependencies: [risks.length] },
  )

  return isLoading ? (
    <RiskWorkflowSkeleton />
  ) : (
    <div
      className={cn(
        'bg-paper flex flex-col shrink-0 h-full overflow-hidden',
        variant === 'sidebar' && 'w-64 border-r border-rule animate-[fadeIn_0.2s_ease-out]',
        variant === 'drawer' && 'w-full h-full',
      )}
    >
      {showHeader && (
        <div className="px-4 py-3 border-b border-rule">
          <div className="text-base font-medium text-ink font-display tracking-tight mb-2">
            待处理清单
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-muted">
              已处理 <span className="text-ink font-medium">{resolvedCount}</span> / {totalCount}
            </span>
            <span className="text-[10px] text-success font-mono">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-paper-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-accent rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {risks.length === 0 ? (
          <WorkspaceEmpty
            type="risk"
            title="全部处理完毕"
            description="没有待处理的风险"
            className="py-12"
          />
        ) : (
          <div className="divide-y divide-rule">
            {risks.map((risk) => {
              const status = getRiskStatus(risk.id)
              const isSelected = selectedRiskId === risk.id
              return (
                <button
                  key={risk.id}
                  data-risk-item
                  type="button"
                  onClick={() => onSelectRisk(risk)}
                  className={cn(
                    'w-full text-left px-4 py-3 transition-all duration-200 cursor-pointer',
                    isSelected ? 'bg-accent-bg/50' : 'hover:bg-paper-dark/50',
                  )}
                >
                  <div className="flex gap-2.5 items-start">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                        risk.level === 'critical'
                          ? 'bg-danger-bg text-danger'
                          : risk.level === 'warning'
                            ? 'bg-warning-bg text-warning'
                            : 'bg-success-bg text-success',
                      )}
                    >
                      {risk.level === 'critical' ? (
                        <AlertTriangle size={10} strokeWidth={1.5} />
                      ) : risk.level === 'warning' ? (
                        <Zap size={10} strokeWidth={1.5} />
                      ) : (
                        <CheckCircle size={10} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-ink leading-snug line-clamp-2 mb-1">
                        {risk.title}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded border font-medium shrink-0',
                            RISK_STATUS_STYLES[status],
                          )}
                        >
                          {RISK_STATUS_LABELS[status]}
                        </span>
                        {risk.dimension && (
                          <span className="text-[9px] text-ink-faint truncate min-w-0">
                            {formatDimensionName(risk.dimension)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-rule bg-paper/[0.02]">
        <div className="flex items-center gap-1.5 text-[10px] text-ink-faint">
          <Clock size={11} strokeWidth={1.5} />
          <span>按严重程度排序</span>
        </div>
      </div>
    </div>
  )
}
