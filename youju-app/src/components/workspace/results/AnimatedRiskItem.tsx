import { AlertTriangle, CheckCircle, Copy, TrendingUp, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn, formatDimensionName } from '@/lib/utils'
import type { Risk } from '../../../types'
import { useToast } from '../../common/Toast'

interface AnimatedRiskItemProps {
  risk: Risk
  index: number
  isSelected: boolean
  onSelect: () => void
  onEvidenceClick?: (sourceId: string, quote: string) => void
}

export function AnimatedRiskItem({
  risk,
  index,
  isSelected,
  onSelect,
  onEvidenceClick,
}: AnimatedRiskItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 150)
    return () => clearTimeout(timer)
  }, [index])

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 80) return { text: '高', color: 'text-success', bg: 'bg-success-bg' }
    if (confidence >= 50) return { text: '中', color: 'text-warning', bg: 'bg-warning-bg' }
    return { text: '低', color: 'text-danger', bg: 'bg-danger-bg' }
  }

  const toggleEvidence = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowEvidence(!showEvidence)
  }

  const handleCopyRisk = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const levelText =
      risk.level === 'critical' ? '严重风险' : risk.level === 'warning' ? '待确认风险' : '信息提示'
    const typeText =
      risk.type === 'conflict'
        ? '直接矛盾'
        : risk.type === 'promise'
          ? '承诺未落文字'
          : risk.type === 'missing'
            ? '信息缺失'
            : '信息提示'

    let text = `【${levelText}】${risk.title}\n`
    text += `类型：${typeText}`
    if (risk.dimension) text += ` · ${formatDimensionName(risk.dimension)}`
    text += '\n'
    text += `说明：${risk.description}\n`

    if (risk.evidence && risk.evidence.length > 0) {
      text += '\n证据：\n'
      risk.evidence.forEach((ev, idx) => {
        text += `${idx + 1}. [${ev.sourceName}] "${ev.quote}"\n`
      })
    } else if (risk.sources && risk.sources.length > 0) {
      text += `来源：${risk.sources.join('、')}\n`
    }

    try {
      await navigator.clipboard.writeText(text)
      showToast('风险信息已复制到剪贴板', 'success')
    } catch (_err) {
      showToast('复制失败，请手动复制', 'error')
    }
  }

  const confidenceInfo = getConfidenceLevel(risk.confidence || 0)

  return (
    <div role="listitem" className="contents">
      <div
        className={cn(
          'w-full transition-all duration-300',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelect()
            }
          }}
          aria-expanded={isSelected}
          aria-label={`${risk.level === 'critical' ? '严重' : risk.level === 'warning' ? '警告' : '提示'}风险：${risk.title}。类型：${risk.type === 'conflict' ? '直接矛盾' : risk.type === 'promise' ? '未兑现承诺' : risk.type === 'missing' ? '系统性缺失' : risk.type}`}
          className={cn(
            'w-full text-left px-4 py-3 transition-all duration-300 cursor-pointer border-b border-rule/50',
            isSelected ? 'bg-paper-dark' : 'hover:bg-paper-dark/50',
          )}
        >
          <div className="flex gap-3 items-start">
            <div
              className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300',
                risk.level === 'critical'
                  ? 'bg-danger-bg text-danger'
                  : risk.level === 'warning'
                    ? 'bg-warning-bg text-warning'
                    : 'bg-success-bg text-success',
                isVisible ? 'scale-100' : 'scale-0',
              )}
              aria-hidden="true"
            >
              {risk.level === 'critical' ? (
                <AlertTriangle size={13} strokeWidth={1.5} />
              ) : risk.level === 'warning' ? (
                <Zap size={13} strokeWidth={1.5} />
              ) : (
                <CheckCircle size={13} strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1 min-w-0 relative">
              {(risk.isNew || risk.levelChange) && (
                <div className="absolute -top-1 -right-1 flex gap-1">
                  {risk.isNew && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold text-danger-foreground bg-danger rounded-md shadow-sm animate-pulse">
                      NEW
                    </span>
                  )}
                  {risk.levelChange?.upgraded && (
                    <span
                      className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-warning-foreground bg-warning rounded-md shadow-sm"
                      title={`${risk.levelChange.from} → ${risk.levelChange.to}`}
                    >
                      <TrendingUp size={9} />
                    </span>
                  )}
                </div>
              )}
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  risk.level === 'critical'
                    ? 'text-danger'
                    : risk.level === 'warning'
                      ? 'text-warning'
                      : 'text-success',
                )}
              >
                {risk.title}
              </div>
              <div className="text-xs text-ink-muted line-clamp-2 mb-2">{risk.description}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-paper border border-rule text-ink-muted">
                  {risk.type === 'conflict'
                    ? '直接矛盾'
                    : risk.type === 'promise'
                      ? '承诺未落文字'
                      : '信息缺失'}
                </span>
                {risk.dimension && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-accent-bg/30 text-accent border border-accent/10">
                    {formatDimensionName(risk.dimension)}
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border border-rule/30',
                    confidenceInfo.bg,
                    confidenceInfo.color,
                  )}
                >
                  置信度 {confidenceInfo.text} ({risk.confidence}%)
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end self-stretch justify-between shrink-0">
              <button
                type="button"
                onClick={handleCopyRisk}
                title="复制风险信息"
                className="w-7 h-7 bg-transparent border border-rule rounded-lg flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper transition-all duration-200"
              >
                <Copy size={12} strokeWidth={1.5} />
              </button>
              {risk.evidence && risk.evidence.length > 0 && (
                <button
                  type="button"
                  onClick={toggleEvidence}
                  className="text-[10px] font-medium text-accent bg-transparent border-none cursor-pointer hover:underline py-1"
                >
                  {showEvidence ? '隐藏证据' : `查看证据 (${risk.evidence.length})`}
                </button>
              )}
            </div>
          </div>

          {showEvidence && risk.evidence && risk.evidence.length > 0 && (
            <div className="mt-3 pl-9 pr-2 py-2 border-t border-rule/30 space-y-2">
              {risk.evidence.map((ev, idx) => (
                <div
                  key={`${ev.sourceName}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    onEvidenceClick?.(ev.sourceId || '', ev.highlightedText || ev.quote)
                  }
                  className="p-2 rounded bg-paper/50 hover:bg-accent-bg/20 border border-rule/30 hover:border-accent/20 cursor-pointer text-[11px] text-ink-muted transition-colors duration-200"
                >
                  <div className="flex justify-between font-medium text-ink-faint mb-1">
                    <span>
                      {ev.sourceName} (
                      {ev.sourceType === 'chat'
                        ? '聊天'
                        : ev.sourceType === 'doc'
                          ? '文档'
                          : '网页'}
                      )
                    </span>
                    <span className="text-accent opacity-0 hover:opacity-100 transition-opacity">
                      点击定位材料
                    </span>
                  </div>
                  <div className="italic text-ink-muted leading-relaxed">"{ev.quote}"</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
