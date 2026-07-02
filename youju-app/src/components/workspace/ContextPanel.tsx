import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronLeft,
  FileText,
  Lightbulb,
  Paperclip,
  Sparkles,
  User,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Risk, RiskLevel } from '../../types'

interface ContextPanelProps {
  selectedRisk: Risk | null
  hasResult: boolean
  riskFeedback: Record<string, 'accurate' | 'inaccurate'>
  onClose: () => void
  onGenerateDraft: (risk: Risk) => void
  onFeedback: (riskId: string, feedback: 'accurate' | 'inaccurate') => void
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

export function ContextPanel({
  selectedRisk,
  hasResult,
  riskFeedback,
  onClose,
  onGenerateDraft,
  onFeedback,
}: ContextPanelProps) {
  return (
    <div className="w-72 bg-paper border-l border-rule flex flex-col shrink-0">
      {selectedRisk ? (
        <>
          <div className="px-4 py-3 border-b border-rule">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono text-accent tracking-widest uppercase">
                风险详情
              </div>
              <button
                type="button"
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
                onClick={onClose}
                aria-label="关闭"
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </div>
            <Badge
              variant="ghost"
              className={cn(
                'gap-1.5',
                selectedRisk.level === 'critical'
                  ? 'bg-danger-bg text-danger hover:bg-danger-bg'
                  : selectedRisk.level === 'warning'
                    ? 'bg-warning-bg text-warning hover:bg-warning-bg'
                    : 'bg-success-bg text-success hover:bg-success-bg',
              )}
            >
              {selectedRisk.level === 'critical' ? (
                <AlertTriangle data-icon="inline-start" />
              ) : selectedRisk.level === 'warning' ? (
                <Zap data-icon="inline-start" />
              ) : (
                <CheckCircle data-icon="inline-start" />
              )}
              {RISK_LEVEL_LABELS[selectedRisk.level]}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-ink mb-2 leading-snug font-display tracking-tight">
                {selectedRisk.title}
              </h3>
              <p className="text-xs text-ink-faint leading-relaxed">{selectedRisk.description}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-faint">类型</span>
                <span className="text-[11px] text-ink-muted font-medium">
                  {RISK_TYPE_LABELS[selectedRisk.type] || selectedRisk.type}
                </span>
              </div>
              {selectedRisk.dimension && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-faint">维度</span>
                  <span className="text-[11px] text-ink-muted font-medium">
                    {selectedRisk.dimension}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-faint">涉及材料</span>
                <span className="text-[11px] text-ink-muted font-medium">
                  {selectedRisk.sources?.length || 0} 份
                </span>
              </div>
            </div>

            {selectedRisk.evidence && selectedRisk.evidence.length > 0 && (
              <div>
                <h4 className="text-[11px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
                  <Paperclip size={13} strokeWidth={1.5} />
                  证据 ({selectedRisk.evidence.length})
                </h4>
                <div className="space-y-3">
                  {selectedRisk.evidence.map((ev: any, idx: number) => (
                    <div key={idx} className="pl-3 border-l border-rule">
                      <div className="text-[10px] text-ink-faint mb-1 flex items-center gap-1.5">
                        <FileText size={11} strokeWidth={1.5} />
                        <span className="truncate">{ev.sourceName}</span>
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed italic">
                        "{ev.quote}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[11px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
                <Lightbulb size={13} strokeWidth={1.5} /> 建议动作
              </h4>
              <div className="space-y-1.5">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md text-[11px] bg-ink text-paper cursor-pointer hover:bg-accent transition-colors duration-200 flex items-center gap-2"
                  onClick={() => onGenerateDraft(selectedRisk)}
                >
                  <Sparkles size={12} strokeWidth={1.5} />
                  生成沟通话术
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md text-[11px] text-ink-muted bg-paper-dark/60 cursor-pointer hover:bg-paper-dark hover:text-ink transition-colors duration-200 flex items-center gap-2 border border-rule/60"
                >
                  <CheckCircle size={12} strokeWidth={1.5} />
                  标记为已处理
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
                <User size={13} strokeWidth={1.5} /> 反馈
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-[11px] cursor-pointer transition-colors duration-200 flex items-center justify-center gap-1',
                    riskFeedback[selectedRisk.id] === 'accurate'
                      ? 'bg-success-bg text-success'
                      : 'text-ink-muted bg-paper-dark/60 hover:bg-paper-dark hover:text-ink border border-rule/60',
                  )}
                  onClick={() => onFeedback(selectedRisk.id, 'accurate')}
                >
                  <Check size={11} strokeWidth={1.5} />
                  准确
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-[11px] cursor-pointer transition-colors duration-200 flex items-center justify-center gap-1',
                    riskFeedback[selectedRisk.id] === 'inaccurate'
                      ? 'bg-danger-bg text-danger'
                      : 'text-ink-muted bg-paper-dark/60 hover:bg-paper-dark hover:text-ink border border-rule/60',
                  )}
                  onClick={() => onFeedback(selectedRisk.id, 'inaccurate')}
                >
                  <XCircle size={11} strokeWidth={1.5} />
                  不准
                </button>
              </div>
            </div>
          </div>
        </>
      ) : hasResult ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-3 text-ink-faint border border-rule">
            <ChevronLeft size={20} strokeWidth={1.5} />
          </div>
          <p className="text-xs text-ink-faint font-medium">点击左侧风险查看详情</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-3 text-ink-faint border border-rule">
            <Sparkles size={20} strokeWidth={1.5} />
          </div>
          <p className="text-xs text-ink-faint font-medium">开始分析后查看风险详情</p>
        </div>
      )}
    </div>
  )
}
