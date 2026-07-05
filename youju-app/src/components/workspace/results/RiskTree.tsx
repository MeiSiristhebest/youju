import { CheckCircle } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useAnalysisStore } from '../../../stores'
import type { Risk, RiskStatus } from '../../../types'
import { AnimatedRiskItem } from './AnimatedRiskItem'

interface RiskTreeProps {
  onEvidenceClick?: (sourceId: string, quote: string) => void
}

export function RiskTree({ onEvidenceClick }: RiskTreeProps) {
  const result = useAnalysisStore((state) => state.result)
  const dimensions = useAnalysisStore((state) => state.dimensions)
  const selectedRisk = useAnalysisStore((state) => state.selectedRisk)
  const riskStatusFilter = useAnalysisStore((state) => state.riskStatusFilter)
  const getRiskStatus = useAnalysisStore((state) => state.getRiskStatus)

  const setSelectedRisk = useAnalysisStore((state) => state.setSelectedRisk)
  const setRiskStatusFilter = useAnalysisStore((state) => state.setRiskStatusFilter)

  const riskStatusCounts = useMemo(() => {
    const counts = { all: 0, pending: 0, processing: 0, resolved: 0, ignored: 0 }
    const risks = result?.risks || []
    counts.all = risks.length
    risks.forEach((r: Risk) => {
      const status = getRiskStatus(r.id, 'pending')
      if (status in counts) {
        counts[status as keyof typeof counts]++
      }
    })
    return counts
  }, [result, getRiskStatus])

  // 本地计算排序后的风险列表（与 useAnalysis hook 中逻辑保持一致）
  const displayedRisks: Risk[] = (() => {
    const risks = result?.risks || []
    if (dimensions.length === 0) {
      if (riskStatusFilter === 'all') return risks
      return risks.filter((r: Risk) => getRiskStatus(r.id) === riskStatusFilter)
    }
    const dimensionWeightMap = new Map(dimensions.map((d) => [d.name, d.weight]))
    let filtered = [...risks]
    if (riskStatusFilter !== 'all') {
      filtered = filtered.filter((r: Risk) => getRiskStatus(r.id) === riskStatusFilter)
    }
    return filtered.sort((a: Risk, b: Risk) => {
      const weightA = dimensionWeightMap.get(a.dimension || '') || 0
      const weightB = dimensionWeightMap.get(b.dimension || '') || 0
      if (weightB !== weightA) return weightB - weightA
      const levelOrder = { critical: 3, warning: 2, info: 1 }
      return (
        (levelOrder[b.level as keyof typeof levelOrder] || 0) -
        (levelOrder[a.level as keyof typeof levelOrder] || 0)
      )
    })
  })()

  return (
    <>
      <div className="px-4 py-3 border-b border-rule bg-paper/[0.02]">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: '全部', color: 'text-ink' },
            { key: 'pending', label: '待处理', color: 'text-danger' },
            { key: 'processing', label: '处理中', color: 'text-warning' },
            { key: 'resolved', label: '已解决', color: 'text-success' },
            { key: 'ignored', label: '已忽略', color: 'text-ink-faint' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRiskStatusFilter(item.key as RiskStatus | 'all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 flex items-center gap-1.5 border border-rule bg-transparent',
                riskStatusFilter === item.key
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper-dark/60 text-ink-muted hover:text-ink hover:bg-paper-dark border-rule/60',
              )}
            >
              {item.label}
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
                  riskStatusFilter === item.key
                    ? 'bg-paper/20 text-paper'
                    : 'bg-paper text-ink-faint',
                )}
              >
                {riskStatusCounts[item.key as keyof typeof riskStatusCounts]}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div role="list" className="divide-y divide-rule overflow-y-auto flex-1">
        {displayedRisks.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-tertiary-bg flex items-center justify-center text-accent-tertiary">
              <CheckCircle size={28} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-ink mb-1">一切正常</p>
            <p className="text-xs text-ink-faint">没有发现风险或冲突</p>
          </div>
        ) : (
          displayedRisks.map((risk, index) => (
            <AnimatedRiskItem
              key={risk.id}
              risk={risk}
              index={index}
              isSelected={selectedRisk?.id === risk.id}
              onSelect={() => setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)}
              onEvidenceClick={onEvidenceClick}
            />
          ))
        )}
      </div>
    </>
  )
}
