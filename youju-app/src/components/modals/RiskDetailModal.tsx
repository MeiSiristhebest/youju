import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  Lightbulb,
  Paperclip,
  Sparkles,
  TrendingUp,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { cn } from '@/lib/utils'
import type { Evidence, Risk, RiskLevel, RiskStatus } from '../../types'

interface RiskDetailModalProps {
  risk: Risk | null
  onClose: () => void
  onFeedback: (riskId: string, feedback: 'accurate' | 'inaccurate') => void
  onEvidenceClick?: (sourceId: string, quote: string) => void
  riskStatus: RiskStatus
  onStatusChange: (riskId: string, status: RiskStatus) => void
  notes: string | null
  notesUpdatedAt: string | null
  onNotesChange: (riskId: string, notes: string) => void
}

const RISK_TYPE_LABELS: Record<string, string> = {
  conflict: '直接矛盾',
  promise: '承诺未落文字',
  missing: '信息缺失',
  info: '信息提示',
}

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
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

export function RiskDetailModal({
  risk,
  onClose,
  onFeedback,
  onEvidenceClick,
  riskStatus,
  onStatusChange,
  notes,
  notesUpdatedAt,
  onNotesChange,
}: RiskDetailModalProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [notesText, setNotesText] = useState(notes || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!risk) return
    setNotesText(notes || '')
    setShowStatusMenu(false)
  }, [risk?.id, notes])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleNotesChange = (value: string) => {
    setNotesText(value)
    setIsSaving(true)
    clearTimeout((window as any)._notesSaveTimer)
    ;(window as any)._notesSaveTimer = setTimeout(() => {
      if (risk) {
        onNotesChange(risk.id, value)
        setIsSaving(false)
      }
    }, 800)
  }

  if (!risk) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 md:p-8">
      <div className="bg-paper border border-rule rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs font-mono text-accent tracking-widest uppercase mb-1">
              风险详情
            </div>
            <h2 className="text-lg font-semibold text-ink font-display">{risk.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onFeedback(risk.id, 'accurate')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-success bg-success-bg border border-success/30 hover:bg-success-bg/80 transition-colors"
              title="标记为准确"
            >
              <CheckCircle size={14} strokeWidth={1.5} />
              <span className="hidden sm:inline">准确</span>
            </button>
            <button
              type="button"
              onClick={() => onFeedback(risk.id, 'inaccurate')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-danger bg-danger-bg border border-danger/30 hover:bg-danger-bg/80 transition-colors"
              title="标记为不准确"
            >
              <XCircle size={14} strokeWidth={1.5} />
              <span className="hidden sm:inline">不准确</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
              aria-label="关闭"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-rule bg-paper-dark/30 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant="ghost"
              className={cn(
                'gap-1.5',
                risk.level === 'critical'
                  ? 'bg-danger-bg text-danger hover:bg-danger-bg'
                  : risk.level === 'warning'
                    ? 'bg-warning-bg text-warning hover:bg-warning-bg'
                    : 'bg-success-bg text-success hover:bg-success-bg',
              )}
            >
              {risk.level === 'critical' ? (
                <AlertTriangle data-icon="inline-start" />
              ) : risk.level === 'warning' ? (
                <Zap data-icon="inline-start" />
              ) : (
                <CheckCircle data-icon="inline-start" />
              )}
              {RISK_LEVEL_LABELS[risk.level]}
            </Badge>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border cursor-pointer transition-colors',
                  RISK_STATUS_STYLES[riskStatus],
                )}
              >
                {RISK_STATUS_LABELS[riskStatus]}
                <ChevronDown size={12} />
              </button>
              {showStatusMenu && (
                <div className="absolute top-full right-0 mt-1 py-1 bg-paper border border-rule rounded-lg shadow-lg z-10 min-w-[120px]">
                  {(['pending', 'processing', 'resolved', 'ignored'] as RiskStatus[]).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          onStatusChange(risk.id, status)
                          setShowStatusMenu(false)
                        }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors flex items-center gap-2',
                          riskStatus === status
                            ? 'bg-accent-bg text-accent'
                            : 'text-ink-muted hover:bg-paper-dark hover:text-ink',
                        )}
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            status === 'pending'
                              ? 'bg-danger'
                              : status === 'processing'
                                ? 'bg-warning'
                                : status === 'resolved'
                                  ? 'bg-success'
                                  : 'bg-ink-faint',
                          )}
                        />
                        {RISK_STATUS_LABELS[status]}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles size={12} className="text-accent" />
              {RISK_TYPE_LABELS[risk.type] || risk.type}
            </Badge>
            {risk.isNew && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold text-white bg-danger rounded-md shadow-sm">
                NEW
              </span>
            )}
            {risk.levelChange?.upgraded && (
              <span
                className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 text-xs font-bold text-white bg-warning rounded-md shadow-sm"
                title={`${RISK_LEVEL_LABELS[risk.levelChange.from]} → ${RISK_LEVEL_LABELS[risk.levelChange.to]}`}
              >
                <TrendingUp size={12} />
                程度升级
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-ink mb-3 font-display">{risk.title}</h3>
            <p className="text-sm text-ink-muted leading-relaxed">{risk.description}</p>
            {risk.levelChange?.upgraded && (
              <div className="mt-3 p-3 rounded-md bg-warning-bg/50 border border-warning/20">
                <div className="flex items-center gap-2 text-xs text-warning font-medium">
                  <TrendingUp size={14} />
                  <span>
                    风险程度从「{RISK_LEVEL_LABELS[risk.levelChange.from]}」升级为「
                    {RISK_LEVEL_LABELS[risk.levelChange.to]}」
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-paper-dark/30 rounded-xl">
            <div>
              <span className="text-xs text-ink-faint">类型</span>
              <p className="text-sm text-ink font-medium mt-1">
                {RISK_TYPE_LABELS[risk.type] || risk.type}
              </p>
            </div>
            {risk.dimension && (
              <div>
                <span className="text-xs text-ink-faint">维度</span>
                <p className="text-sm text-ink font-medium mt-1">{risk.dimension}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-ink-faint">涉及材料</span>
              <p className="text-sm text-ink font-medium mt-1">{risk.sources?.length || 0} 份</p>
            </div>
            {risk.confidence !== undefined && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-faint">置信度</span>
                  <span
                    className={cn(
                      'text-sm font-mono font-medium',
                      risk.confidence >= 80
                        ? 'text-success'
                        : risk.confidence >= 50
                          ? 'text-warning'
                          : 'text-danger',
                    )}
                  >
                    {risk.confidence}%
                  </span>
                </div>
                <ConfidenceBar confidence={risk.confidence} showLabel={false} fullWidth />
              </div>
            )}
          </div>

          {risk.evidence && risk.evidence.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
                <Paperclip size={16} strokeWidth={1.5} />
                证据来源 ({risk.evidence.length})
              </h4>
              <div className="space-y-3">
                {risk.evidence.map((ev: Evidence, idx: number) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-xl border bg-paper/[0.02] p-4 transition-all duration-200',
                      onEvidenceClick && ev.sourceId
                        ? 'cursor-pointer hover:border-accent/40 hover:bg-accent-bg/20'
                        : 'border-rule',
                    )}
                    onClick={() => {
                      if (onEvidenceClick && ev.sourceId) {
                        onEvidenceClick(ev.sourceId, ev.quote)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} strokeWidth={1.5} className="text-ink-faint shrink-0" />
                        <span className="text-xs text-ink-faint truncate">{ev.sourceName}</span>
                      </div>
                      {ev.confidence !== undefined && (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded shrink-0 font-medium',
                            ev.confidence >= 80
                              ? 'bg-success-bg text-success'
                              : ev.confidence >= 50
                                ? 'bg-warning-bg text-warning'
                                : 'bg-danger-bg text-danger',
                          )}
                        >
                          {ev.confidence}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted leading-relaxed italic pl-3 border-l-2 border-accent/40">
                      "
                      {ev.highlightedText ? (
                        <>
                          {ev.quote
                            .split(ev.highlightedText)
                            .map((part: string, i: number, arr: string[]) => (
                              <span key={i}>
                                {part}
                                {i < arr.length - 1 && (
                                  <mark className="bg-accent/20 text-accent px-0.5 rounded font-medium not-italic">
                                    {ev.highlightedText}
                                  </mark>
                                )}
                              </span>
                            ))}
                        </>
                      ) : (
                        ev.quote
                      )}
                      "
                    </p>
                    {onEvidenceClick && ev.sourceId && (
                      <div className="mt-2 flex items-center justify-end">
                        <span className="text-xs text-accent font-medium">查看原文 →</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <Lightbulb size={16} strokeWidth={1.5} />
              备注
            </h4>
            <textarea
              value={notesText}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full h-24 px-4 py-3 text-sm text-ink leading-relaxed resize-none focus:outline-none focus:border-accent/50 bg-paper border border-rule rounded-xl font-body"
              placeholder="添加备注..."
            />
            {isSaving && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                <Clock size={12} className="animate-spin" />
                <span>保存中...</span>
              </div>
            )}
            {notesUpdatedAt && !isSaving && (
              <div className="mt-2 text-xs text-ink-faint">上次更新: {notesUpdatedAt}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
