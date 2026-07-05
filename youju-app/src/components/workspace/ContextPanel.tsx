import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Lightbulb,
  Maximize2,
  Paperclip,
  Sparkles,
  TrendingUp,
  User,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { cn } from '@/lib/utils'
import { useAnalysisStore } from '../../stores'
import type { Evidence, Risk, RiskLevel, RiskStatus } from '../../types'
import { AiInlineEditor } from './AiInlineEditor'
import { ContextPanelSkeleton } from './ContextPanelSkeleton'
import { WorkspaceEmpty } from './WorkspaceEmpty'

interface ContextPanelProps {
  selectedRisk: Risk | null
  hasResult: boolean
  riskFeedback: Record<string, 'accurate' | 'inaccurate'>
  onClose: () => void
  onGenerateDraft: (risk: Risk) => void
  onFeedback: (riskId: string, feedback: 'accurate' | 'inaccurate') => void
  onEvidenceClick?: (sourceId: string, quote: string) => void
  riskStatus: RiskStatus
  onStatusChange: (riskId: string, status: RiskStatus) => void
  notes: string | null
  notesUpdatedAt: string | null
  onNotesChange: (riskId: string, notes: string) => void
  onOpenRiskDetail?: (risk: Risk) => void
  onCollapse?: () => void
  isLoading?: boolean
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

export function ContextPanel({
  selectedRisk,
  hasResult,
  riskFeedback,
  onClose,
  onGenerateDraft,
  onFeedback,
  onEvidenceClick,
  riskStatus,
  onStatusChange,
  notes,
  notesUpdatedAt,
  onNotesChange,
  onOpenRiskDetail,
  onCollapse,
  isLoading = false,
}: ContextPanelProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [notesText, setNotesText] = useState(notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [showAiEditor, setShowAiEditor] = useState(false)
  const updateRiskDescription = useAnalysisStore((s) => s.updateRiskDescription)
  const aiEditorTargetRiskId = useAnalysisStore((s) => s.aiEditorTargetRiskId)
  const setAiEditorTargetRiskId = useAnalysisStore((s) => s.setAiEditorTargetRiskId)

  useEffect(() => {
    if (aiEditorTargetRiskId && selectedRisk && aiEditorTargetRiskId === selectedRisk.id) {
      setShowAiEditor(true)
      setAiEditorTargetRiskId(null)
    }
  }, [aiEditorTargetRiskId, selectedRisk, setAiEditorTargetRiskId])

  const handleNotesChange = (value: string) => {
    setNotesText(value)
    setIsSaving(true)
    clearTimeout((window as any)._notesSaveTimer)
    ;(window as any)._notesSaveTimer = setTimeout(() => {
      if (selectedRisk) {
        onNotesChange(selectedRisk.id, value)
        setIsSaving(false)
      }
    }, 800)
  }

  useEffect(() => {
    setNotesText(notes || '')
    setShowStatusMenu(false)
    setShowAiEditor(false)
  }, [selectedRisk?.id, notes])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedRisk) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        const target = e.target as HTMLElement
        const isInInput =
          target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        if (isInInput) return
        e.preventDefault()
        setShowAiEditor(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedRisk])

  return isLoading ? (
    <ContextPanelSkeleton />
  ) : (
    <div className="w-full bg-paper flex flex-col shrink-0 h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      {selectedRisk ? (
        <>
          <div className="px-4 py-3 border-b border-rule">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono text-accent tracking-widest uppercase">
                风险详情
              </div>
              <div className="flex items-center gap-1">
                {onOpenRiskDetail && (
                  <button
                    type="button"
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
                    onClick={() => onOpenRiskDetail(selectedRisk)}
                    aria-label="放大查看"
                    title="放大查看"
                  >
                    <Maximize2 size={13} strokeWidth={1.5} />
                  </button>
                )}
                {onCollapse && (
                  <button
                    type="button"
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
                    onClick={onCollapse}
                    aria-label="折叠面板"
                    title="折叠面板"
                  >
                    <ChevronRight size={13} strokeWidth={1.5} />
                  </button>
                )}
                <button
                  type="button"
                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
                  onClick={onClose}
                  aria-label="关闭"
                >
                  <X size={13} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border cursor-pointer transition-colors',
                    RISK_STATUS_STYLES[riskStatus],
                  )}
                >
                  {RISK_STATUS_LABELS[riskStatus]}
                  <ChevronDown size={10} />
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full right-0 mt-1 py-1 bg-paper border border-rule rounded-lg shadow-lg z-10 min-w-[100px]">
                    {(['pending', 'processing', 'resolved', 'ignored'] as RiskStatus[]).map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            onStatusChange(selectedRisk.id, status)
                            setShowStatusMenu(false)
                          }}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-[11px] cursor-pointer transition-colors flex items-center gap-2',
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
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {selectedRisk.isNew && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold text-white bg-danger rounded-md border border-danger/20">
                    NEW
                  </span>
                )}
                {selectedRisk.levelChange?.upgraded && (
                  <span
                    className="inline-flex items-center justify-center gap-1 px-2 py-0.5 text-[10px] font-bold text-white bg-warning rounded-md border border-warning/20"
                    title={`${RISK_LEVEL_LABELS[selectedRisk.levelChange.from]} → ${RISK_LEVEL_LABELS[selectedRisk.levelChange.to]}`}
                  >
                    <TrendingUp size={10} />
                    程度升级
                  </span>
                )}
              </div>
              <h3 className="text-lg font-medium text-ink mb-2 leading-snug font-display tracking-tight">
                {selectedRisk.title}
              </h3>
              <div className="relative group">
                <p className="text-xs text-ink-faint leading-relaxed">{selectedRisk.description}</p>
                <button
                  type="button"
                  onClick={() => setShowAiEditor(!showAiEditor)}
                  className={cn(
                    'absolute -top-1 right-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all cursor-pointer',
                    showAiEditor
                      ? 'opacity-100 bg-accent text-paper'
                      : 'opacity-0 group-hover:opacity-100 bg-paper-dark text-ink-muted hover:text-accent border border-rule/60',
                  )}
                  title="AI 重写 (Cmd+K)"
                >
                  <Sparkles size={10} />
                  AI 重写
                </button>
              </div>
              {showAiEditor && (
                <AiInlineEditor
                  originalText={selectedRisk.description}
                  riskId={selectedRisk.id}
                  size="sm"
                  onConfirm={(newText, instruction) => {
                    updateRiskDescription(selectedRisk.id, newText, instruction)
                    setShowAiEditor(false)
                  }}
                  onClose={() => setShowAiEditor(false)}
                />
              )}
              {selectedRisk.levelChange?.upgraded && (
                <div className="mt-2 p-2 rounded-md bg-warning-bg/50 border border-warning/20">
                  <div className="flex items-center gap-1.5 text-[10px] text-warning font-medium">
                    <TrendingUp size={10} />
                    <span>
                      风险程度从「{RISK_LEVEL_LABELS[selectedRisk.levelChange.from]}」升级为「
                      {RISK_LEVEL_LABELS[selectedRisk.levelChange.to]}」
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
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
              {selectedRisk.confidence !== undefined && (
                <div className="pt-1.5 border-t border-rule/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-ink-faint">置信度</span>
                    <span
                      className={cn(
                        'text-[11px] font-mono font-medium',
                        selectedRisk.confidence >= 80
                          ? 'text-success'
                          : selectedRisk.confidence >= 50
                            ? 'text-warning'
                            : 'text-danger',
                      )}
                    >
                      {selectedRisk.confidence}%
                    </span>
                  </div>
                  <ConfidenceBar confidence={selectedRisk.confidence} showLabel={false} fullWidth />
                </div>
              )}
            </div>

            {selectedRisk.evidence && selectedRisk.evidence.length > 0 && (
              <div>
                <h4 className="text-[11px] font-semibold text-ink mb-2.5 flex items-center gap-1.5">
                  <Paperclip size={13} strokeWidth={1.5} />
                  证据来源 ({selectedRisk.evidence.length})
                </h4>
                <div className="space-y-2.5">
                  {selectedRisk.evidence.map((ev: Evidence, idx: number) => (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-lg border bg-paper/[0.02] p-2.5 transition-all duration-200',
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
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText
                            size={11}
                            strokeWidth={1.5}
                            className="text-ink-faint shrink-0"
                          />
                          <span className="text-[10px] text-ink-faint truncate">
                            {ev.sourceName}
                          </span>
                        </div>
                        {ev.confidence !== undefined && (
                          <span
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium',
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
                      <p className="text-[11px] text-ink-muted leading-relaxed italic pl-2 border-l-2 border-accent/40">
                        "
                        {ev.highlightedText
                          ? ev.quote
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
                              ))
                          : ev.quote}
                        "
                      </p>
                      {onEvidenceClick && ev.sourceId && (
                        <div className="mt-1.5 flex items-center justify-end">
                          <span className="text-[9px] text-accent font-medium">查看原文 →</span>
                        </div>
                      )}
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
                  onClick={() => onStatusChange(selectedRisk.id, 'resolved')}
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

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-[11px] font-semibold text-ink flex items-center gap-1.5">
                  <FileText size={13} strokeWidth={1.5} /> 备注
                </h4>
                <div className="flex items-center gap-1">
                  {isSaving && (
                    <span className="text-[9px] text-ink-faint font-mono">保存中...</span>
                  )}
                  {notesUpdatedAt && !isSaving && (
                    <span className="text-[9px] text-ink-faint font-mono flex items-center gap-1">
                      <Clock size={9} />
                      {new Date(notesUpdatedAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
              <textarea
                value={notesText}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="添加处理备注、跟进记录..."
                className="w-full h-28 px-3 py-2 text-[11px] text-ink bg-paper-dark/60 border border-rule/60 rounded-md resize-none focus:outline-none focus:border-accent/50 focus:bg-paper-dark transition-colors placeholder:text-ink-faint"
              />
            </div>
          </div>
        </>
      ) : hasResult ? (
        <WorkspaceEmpty type="context" />
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
