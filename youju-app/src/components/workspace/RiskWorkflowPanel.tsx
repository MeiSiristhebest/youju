import { AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Risk, RiskStatus } from '../../types'

interface RiskWorkflowPanelProps {
  risks: Risk[]
  totalCount: number
  unresolvedCount: number
  selectedRiskId: string | null
  onSelectRisk: (risk: Risk) => void
  getRiskStatus: (riskId: string) => RiskStatus
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
}: RiskWorkflowPanelProps) {
  const resolvedCount = totalCount - unresolvedCount
  const progressPercent = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0

  return (
    <div className="w-64 bg-paper border-r border-rule flex flex-col shrink-0 h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-rule">
        <div className="text-[10px] font-mono text-accent tracking-widest uppercase mb-2">
          待处理清单
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-ink-muted">
            已处理 <span className="text-ink font-medium">{resolvedCount}</span> / {totalCount}
          </span>
          <span className="text-[10px] text-success font-mono">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-1.5 bg-paper-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-success to-accent rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {risks.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-success-bg flex items-center justify-center text-success">
              <CheckCircle size={24} strokeWidth={1.5} />
            </div>
            <p className="text-xs font-medium text-ink mb-1">全部处理完毕</p>
            <p className="text-[11px] text-ink-faint">没有待处理的风险</p>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {risks.map((risk) => {
              const status = getRiskStatus(risk.id)
              const isSelected = selectedRiskId === risk.id
              return (
                <button
                  key={risk.id}
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
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded border font-medium',
                            RISK_STATUS_STYLES[status],
                          )}
                        >
                          {RISK_STATUS_LABELS[status]}
                        </span>
                        {risk.dimension && (
                          <span className="text-[9px] text-ink-faint font-mono truncate">
                            {risk.dimension}
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
