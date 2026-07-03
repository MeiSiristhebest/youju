import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  DollarSign,
  FileCheck,
  FileText,
  GitBranch,
  Home,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  Paperclip,
  RefreshCw,
  ScrollText,
  Search,
  Sparkles,
  Square,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'
import { SCENARIOS } from '../../constants/workspace'
import type {
  AnalysisDimension,
  AnalyzeResult,
  ChecklistItem,
  Conflict,
  ConflictPair,
  DimensionPriority,
  Evidence,
  IncrementalMeta,
  IncrementalPrediction,
  ReasoningStep,
  Risk,
  RiskAssociation,
  RiskStatus,
  ScenarioType,
  ValidationResult,
} from '../../types'
import { useToast } from '../common/Toast'
import { ConfidenceBar } from '../ui/ConfidenceBar'
import { RiskBadge } from '../ui/RiskBadge'
import { DimensionPanel } from './DimensionPanel'
import { IncrementalDetailPanel } from './IncrementalDetailPanel'

type ResultTab =
  | 'risks'
  | 'checklist'
  | 'aligned'
  | 'entities'
  | 'relations'
  | 'trace'
  | 'dimensions'

interface ResultPanelProps {
  analyzing: boolean
  analysisStep: number
  result: AnalyzeResult | null
  activeTab: ResultTab
  selectedRisk: Risk | null
  checklist: ChecklistItem[]
  dimensions: AnalysisDimension[]
  sortedRisks: Risk[]
  showAddDimensionDialog: boolean
  incrementalMeta?: IncrementalMeta
  incrementalPrediction?: IncrementalPrediction | null
  showIncrementalBanner: boolean
  previousResult: AnalyzeResult | null
  riskStatusFilter: RiskStatus | 'all'
  riskStatusCounts: {
    all: number
    pending: number
    processing: number
    resolved: number
    ignored: number
  }
  onTabChange: (tab: ResultTab) => void
  onSelectRisk: (risk: Risk | null) => void
  onToggleCheck: (id: string) => void
  onGenerateDraft?: (riskType?: string, dimension?: string) => void
  onAnalyze: () => void
  onAnalyzeFull: () => void
  canAnalyze: boolean
  streaming: boolean
  streamProgress: number
  streamError: string | null
  onCancel?: () => void
  onLoadScenario?: (scenarioId: ScenarioType) => void
  onAddSource?: () => void
  hasSources?: boolean
  onEvidenceClick?: (sourceId: string, quote: string) => void
  onToggleDimensionEnabled: (dimensionId: string) => void
  onUpdateDimensionWeight: (dimensionId: string, weight: number) => void
  onMoveDimension: (dimensionId: string, direction: 'up' | 'down') => void
  onAddCustomDimension: (name: string, description: string, priority: DimensionPriority) => void
  onRemoveCustomDimension: (dimensionId: string) => void
  onResetDimensionWeights: () => void
  onShowAddDimensionDialogChange: (show: boolean) => void
  onDismissIncrementalBanner: () => void
  onRiskStatusFilterChange: (filter: RiskStatus | 'all') => void
}

const STEP_LABELS = [
  { name: '场景识别', desc: '分析材料类型和场景', icon: <Target size={16} strokeWidth={1.5} /> },
  { name: '材料解析', desc: '提取关键信息和要素', icon: <FileText size={16} strokeWidth={1.5} /> },
  { name: '维度提取', desc: '识别对比维度', icon: <LayoutGrid size={16} strokeWidth={1.5} /> },
  { name: '要素提取', desc: '提取各维度信息', icon: <Search size={16} strokeWidth={1.5} /> },
  {
    name: '冲突检测',
    desc: '检测不一致和风险',
    icon: <AlertTriangle size={16} strokeWidth={1.5} />,
  },
  { name: '结果校验', desc: '自我验证和修正', icon: <CheckCircle size={16} strokeWidth={1.5} /> },
  { name: '报告生成', desc: '生成最终分析报告', icon: <FileCheck size={16} strokeWidth={1.5} /> },
]

function TypewriterText({ text, delay = 50 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    setDisplayText('')
    let index = 0
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
      }
    }, delay)
    return () => clearInterval(timer)
  }, [text, delay])

  return (
    <span>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  )
}

function AnimatedRiskItem({
  risk,
  index,
  isSelected,
  onSelect,
  onEvidenceClick,
}: {
  risk: Risk
  index: number
  isSelected: boolean
  onSelect: () => void
  onEvidenceClick?: (sourceId: string, quote: string) => void
}) {
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
    if (risk.dimension) text += ` · ${risk.dimension}`
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
    } catch (err) {
      showToast('复制失败，请手动复制', 'error')
    }
  }

  return (
    <div role="listitem" className="contents">
      <div
        className={cn(
          'w-full transition-all duration-300',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
      >
        <button
          key={risk.id}
          type="button"
          onClick={onSelect}
          aria-expanded={isSelected}
          aria-label={`${risk.level === 'critical' ? '严重' : risk.level === 'warning' ? '警告' : '提示'}风险：${risk.title}。类型：${risk.type === 'conflict' ? '直接矛盾' : risk.type === 'promise' ? '未兑现承诺' : risk.type === 'missing' ? '系统性缺失' : risk.type}`}
          className={cn(
            'w-full text-left px-4 py-3 transition-all duration-300 cursor-pointer',
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
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold text-white bg-danger rounded-md shadow-sm animate-pulse">
                      NEW
                    </span>
                  )}
                  {risk.levelChange?.upgraded && (
                    <span
                      className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-white bg-warning rounded-md shadow-sm"
                      title={`${risk.levelChange.from === 'critical' ? '严重' : risk.levelChange.from === 'warning' ? '警告' : '提示'} → ${risk.levelChange.to === 'critical' ? '严重' : risk.levelChange.to === 'warning' ? '警告' : '提示'}`}
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
              {risk.levelChange && (
                <div
                  className={cn(
                    'text-[10px] font-medium mb-1 flex items-center gap-0.5',
                    risk.levelChange.upgraded ? 'text-warning' : 'text-ink-faint',
                  )}
                  title={`${risk.levelChange.from === 'critical' ? '严重' : risk.levelChange.from === 'warning' ? '警告' : '提示'} → ${risk.levelChange.to === 'critical' ? '严重' : risk.levelChange.to === 'warning' ? '警告' : '提示'}`}
                >
                  {risk.levelChange.upgraded ? (
                    <TrendingUp size={10} />
                  ) : (
                    <TrendingDown size={10} />
                  )}
                  <span className="font-mono">
                    {risk.levelChange.from === 'critical'
                      ? '严重'
                      : risk.levelChange.from === 'warning'
                        ? '警告'
                        : '提示'}
                    {' → '}
                    {risk.levelChange.to === 'critical'
                      ? '严重'
                      : risk.levelChange.to === 'warning'
                        ? '警告'
                        : '提示'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="text-[11px] text-ink-faint font-mono truncate">
                  {risk.type === 'conflict'
                    ? '直接矛盾'
                    : risk.type === 'promise'
                      ? '承诺未落文字'
                      : risk.type === 'missing'
                        ? '信息缺失'
                        : '信息提示'}
                  {risk.dimension && ` · ${risk.dimension}`}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <RiskBadge level={risk.level} title={risk.title} />
                  {risk.confidence !== undefined && (
                    <div className="flex items-center gap-1">
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          risk.confidence >= 80
                            ? 'bg-success'
                            : risk.confidence >= 50
                              ? 'bg-warning'
                              : 'bg-danger',
                        )}
                      />
                      <span
                        className={cn(
                          'text-[10px] font-mono font-medium',
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
                  )}
                </div>
              </div>
              <div className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                {risk.description}
              </div>
            </div>
          </div>
        </button>

        <div className="px-4 pb-3 flex items-center gap-2">
          {risk.evidence && risk.evidence.length > 0 && (
            <button
              type="button"
              onClick={toggleEvidence}
              className="flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-accent transition-colors cursor-pointer group"
            >
              <Paperclip size={11} strokeWidth={1.5} />
              <span>证据来源 ({risk.evidence.length})</span>
              {showEvidence ? (
                <ChevronUp
                  size={11}
                  strokeWidth={1.5}
                  className="group-hover:text-accent transition-colors"
                />
              ) : (
                <ChevronDown
                  size={11}
                  strokeWidth={1.5}
                  className="group-hover:text-accent transition-colors"
                />
              )}
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleCopyRisk}
            className="flex items-center gap-1 text-[11px] text-ink-faint hover:text-accent transition-colors cursor-pointer group"
            title="复制风险信息"
          >
            <Copy size={11} strokeWidth={1.5} />
            <span>复制</span>
          </button>
        </div>

        {risk.evidence && risk.evidence.length > 0 && (
          <div className="px-4 pb-3">
            <div
              className={cn(
                'overflow-hidden transition-all duration-300 ease-in-out',
                showEvidence ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <div className="space-y-2 pt-2.5">
                {risk.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg bg-paper/[0.02] border border-rule p-2.5 hover:border-accent/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText size={11} strokeWidth={1.5} className="text-ink-faint shrink-0" />
                        <span className="text-[10px] text-ink-faint truncate">{ev.sourceName}</span>
                      </div>
                      {ev.confidence !== undefined && (
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded shrink-0',
                            getConfidenceLevel(ev.confidence).bg,
                            getConfidenceLevel(ev.confidence).color,
                          )}
                        >
                          {ev.confidence}%
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[11px] text-ink-muted leading-relaxed italic pl-3 border-l-2 border-rule cursor-pointer hover:border-accent/50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onEvidenceClick && ev.sourceId) {
                          onEvidenceClick(ev.sourceId, ev.quote)
                        }
                      }}
                    >
                      "{ev.quote}"
                    </p>
                    {onEvidenceClick && ev.sourceId && (
                      <div className="mt-1.5 text-right">
                        <span className="text-[9px] text-accent opacity-0 hover:opacity-100 transition-opacity">
                          点击跳转 →
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReasoningStepCard({ step, index }: { step: ReasoningStep; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasDetails = step.details || step.content

  const getStatusColor = () => {
    if (step.status === 'completed') return 'bg-success text-success-bg'
    if (step.status === 'current') return 'bg-accent text-paper animate-pulse'
    if (step.status === 'pending') return 'bg-paper-dark text-ink-faint'
    return 'bg-accent-bg text-accent'
  }

  return (
    <div className="relative pb-3.5 last:pb-0">
      <div
        className={cn(
          'absolute -left-5 top-2 w-[9px] h-[9px] rounded-full z-10 border-2 border-paper',
          step.status === 'completed'
            ? 'bg-success'
            : step.status === 'current'
              ? 'bg-accent'
              : 'bg-paper-dark',
        )}
      />

      <div
        className={cn(
          'rounded-lg transition-all duration-300 overflow-hidden',
          isExpanded
            ? 'bg-paper/[0.03] border border-accent/20'
            : 'bg-paper/[0.02] border border-rule hover:border-accent/30',
        )}
      >
        <button
          type="button"
          onClick={() => hasDetails && setIsExpanded(!isExpanded)}
          className={cn(
            'w-full text-left p-3 flex items-start gap-2.5',
            hasDetails ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          <div
            className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5',
              getStatusColor(),
            )}
          >
            {step.status === 'completed' ? <Check size={10} strokeWidth={2} /> : index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-ink truncate">
                {step.title || step.name || step.step || `步骤 ${index + 1}`}
              </div>
              {hasDetails && (
                <div className="flex items-center gap-2 shrink-0">
                  {step.durationMs !== undefined && (
                    <span className="text-[10px] text-ink-faint font-mono">
                      {step.durationMs}ms
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp size={12} strokeWidth={1.5} className="text-ink-faint" />
                  ) : (
                    <ChevronDown size={12} strokeWidth={1.5} className="text-ink-faint" />
                  )}
                </div>
              )}
            </div>
            {(step.description || step.result) && (
              <p className="text-[11px] text-ink-faint leading-relaxed mt-1">
                {step.description || step.result}
              </p>
            )}
          </div>
        </button>

        {hasDetails && (
          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <div className="px-3 pb-3 pl-10">
              <div className="pt-2 border-t border-rule/60">
                <pre className="text-[11px] text-ink-muted leading-relaxed whitespace-pre-wrap font-mono bg-black/20 rounded-md p-2.5 overflow-x-auto">
                  {step.details || step.content}
                </pre>
                {step.tokenUsage !== undefined && (
                  <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint">
                    <span>Token 消耗</span>
                    <span className="font-mono">{step.tokenUsage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ResultPanel({
  analyzing,
  analysisStep,
  result,
  activeTab,
  selectedRisk,
  checklist,
  dimensions,
  sortedRisks,
  showAddDimensionDialog,
  incrementalMeta,
  incrementalPrediction,
  showIncrementalBanner,
  previousResult,
  riskStatusFilter,
  riskStatusCounts,
  onTabChange,
  onSelectRisk,
  onToggleCheck,
  onGenerateDraft,
  onAnalyze,
  onAnalyzeFull,
  canAnalyze,
  streaming,
  streamProgress,
  streamError,
  onCancel,
  onLoadScenario,
  onAddSource,
  hasSources = false,
  onEvidenceClick,
  onToggleDimensionEnabled,
  onUpdateDimensionWeight,
  onMoveDimension,
  onAddCustomDimension,
  onRemoveCustomDimension,
  onResetDimensionWeights,
  onShowAddDimensionDialogChange,
  onDismissIncrementalBanner,
  onRiskStatusFilterChange,
}: ResultPanelProps) {
  const currentStep = STEP_LABELS[analysisStep - 1]
  const [showProgressDetail, setShowProgressDetail] = useState(true)
  const [showIncrementalDetail, setShowIncrementalDetail] = useState(false)

  const resultShortcuts = useMemo(
    () => [
      {
        key: '1',
        description: '切换到风险清单',
        group: '结果面板',
        enabled: !!result,
        handler: () => onTabChange('risks'),
      },
      {
        key: '2',
        description: '切换到检查清单',
        group: '结果面板',
        enabled: !!result,
        handler: () => onTabChange('checklist'),
      },
      {
        key: '3',
        description: '切换到统一版本',
        group: '结果面板',
        enabled: !!result,
        handler: () => onTabChange('aligned'),
      },
      {
        key: '4',
        description: '切换到关键要素',
        group: '结果面板',
        enabled: !!result,
        handler: () => onTabChange('entities'),
      },
      {
        key: '5',
        description: '切换到风险关联',
        group: '结果面板',
        enabled: !!result,
        handler: () => onTabChange('relations'),
      },
      {
        key: '6',
        description: '切换到AI思考',
        group: '结果面板',
        enabled: !!result,
        handler: () => onTabChange('trace'),
      },
      {
        key: 'j',
        description: '下一个风险',
        group: '结果面板',
        enabled: !!result && activeTab === 'risks' && sortedRisks.length > 0,
        handler: () => {
          if (sortedRisks.length === 0) return
          const currentIndex = selectedRisk
            ? sortedRisks.findIndex((r) => r.id === selectedRisk.id)
            : -1
          const nextIndex = currentIndex < sortedRisks.length - 1 ? currentIndex + 1 : 0
          onSelectRisk(sortedRisks[nextIndex])
        },
      },
      {
        key: 'k',
        description: '上一个风险',
        group: '结果面板',
        enabled: !!result && activeTab === 'risks' && sortedRisks.length > 0,
        handler: () => {
          if (sortedRisks.length === 0) return
          const currentIndex = selectedRisk
            ? sortedRisks.findIndex((r) => r.id === selectedRisk.id)
            : 0
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedRisks.length - 1
          onSelectRisk(sortedRisks[prevIndex])
        },
      },
      {
        key: ' ',
        description: '展开/收起当前风险',
        group: '结果面板',
        enabled: !!result && activeTab === 'risks' && !!selectedRisk,
        preventDefault: true,
        handler: () => {
          if (selectedRisk) {
            onSelectRisk(null)
          } else if (sortedRisks.length > 0) {
            onSelectRisk(sortedRisks[0])
          }
        },
      },
    ],
    [result, activeTab, sortedRisks, selectedRisk, onTabChange, onSelectRisk],
  )

  useKeyboardShortcuts({ shortcuts: resultShortcuts, enabled: !!result && !analyzing })

  return (
    <div id="tour-result-panel" className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
      {analyzing ? (
        <div className="flex-1 flex flex-col p-6 min-h-0">
          {streamError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-danger-bg/30 flex items-center justify-center text-danger">
                <AlertTriangle size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">分析失败</h3>
              <p className="text-sm text-danger mb-6 max-w-xs">{streamError}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onAnalyze}
                  className="px-4 py-2 bg-accent text-paper rounded-md text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <RefreshCw size={14} strokeWidth={1.5} />
                  重试分析
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 bg-paper-dark text-ink-muted rounded-md text-xs font-medium cursor-pointer hover:text-ink transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3 px-4 py-2 bg-accent-bg rounded-full border border-accent-faint">
                  <div className="w-8 h-8 rounded-full bg-accent text-paper flex items-center justify-center animate-pulse">
                    {currentStep?.icon || <Sparkles size={16} strokeWidth={1.5} />}
                  </div>
                  <span className="text-sm font-medium text-accent">AI 正在分析中</span>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-2 rounded-lg text-ink-faint hover:text-danger hover:bg-danger-bg/30 cursor-pointer transition-colors"
                  title="取消分析"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {incrementalPrediction?.isIncremental && (
                  <div className="mb-4 p-3 rounded-lg bg-accent-bg/50 border border-accent-faint">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-accent text-paper flex items-center justify-center">
                        <Sparkles size={12} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-accent">增量分析预测</div>
                        <div className="text-[10px] text-ink-faint">基于上一次结果进行增量分析</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-paper/50 rounded-md p-2 text-center">
                        <div className="text-sm font-semibold text-danger">
                          {incrementalPrediction.estimatedNewRiskCount}
                        </div>
                        <div className="text-[9px] text-ink-faint">预计新增风险</div>
                      </div>
                      <div className="bg-paper/50 rounded-md p-2 text-center">
                        <div className="text-sm font-semibold text-warning">
                          {incrementalPrediction.estimatedAffectedDimensions}
                        </div>
                        <div className="text-[9px] text-ink-faint">预计影响维度</div>
                      </div>
                    </div>
                    {(incrementalPrediction.estimatedTimeSavingPercent ?? 0) > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-success">
                        <TrendingDown size={10} />
                        <span>
                          预计节省 {incrementalPrediction.estimatedTimeSavingPercent}% 时间
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div
                  id="progress-detail-panel"
                  className={cn(
                    'flex-1 min-h-0 transition-all duration-500 overflow-hidden',
                    showProgressDetail ? 'opacity-100' : 'max-h-0 opacity-0',
                  )}
                >
                  <div className="space-y-3 overflow-y-auto h-full pr-1">
                    {STEP_LABELS.map((step, idx) => {
                      const isCompleted = idx < analysisStep - 1
                      const isCurrent = idx === analysisStep - 1
                      const isPending = idx >= analysisStep

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                            isCurrent ? 'bg-accent-bg border border-accent-faint shadow-sm' : '',
                            isCompleted ? 'opacity-80' : '',
                            isPending ? 'opacity-50' : '',
                          )}
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                              isCompleted ? 'bg-success-bg text-success' : '',
                              isCurrent ? 'bg-accent text-paper animate-pulse' : '',
                              isPending ? 'bg-paper-dark text-ink-faint' : '',
                            )}
                          >
                            {isCompleted ? <Check size={15} strokeWidth={2} /> : step.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div
                                className={cn(
                                  'text-sm font-medium transition-colors truncate',
                                  isCurrent ? 'text-accent' : '',
                                  isCompleted ? 'text-success' : '',
                                  isPending ? 'text-ink-faint' : '',
                                )}
                              >
                                {isCurrent ? (
                                  <TypewriterText text={step.name} delay={30} />
                                ) : (
                                  step.name
                                )}
                              </div>
                              {isCurrent && (
                                <div className="text-xs text-accent font-mono ml-2 shrink-0">
                                  {Math.round(streamProgress)}%
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-ink-faint mt-0.5">
                              {isCurrent ? (
                                <TypewriterText text={step.desc} delay={20} />
                              ) : (
                                step.desc
                              )}
                            </div>
                            {isCurrent && (
                              <div className="w-full h-1.5 mt-2 bg-paper-dark rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-accent rounded-full transition-[width] duration-500 ease-out"
                                  style={{
                                    width: `${((streamProgress % (100 / STEP_LABELS.length)) / (100 / STEP_LABELS.length)) * 100}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          {isCurrent && (
                            <div className="w-2 h-2 bg-accent rounded-full animate-bounce shrink-0"></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="shrink-0 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-ink-faint font-mono">
                      步骤 {analysisStep} / {STEP_LABELS.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowProgressDetail(!showProgressDetail)}
                      aria-expanded={showProgressDetail}
                      aria-controls="progress-detail-panel"
                      className="text-xs text-ink-faint hover:text-accent transition-colors cursor-pointer"
                    >
                      {showProgressDetail ? '收起详情' : '展开详情'}
                    </button>
                  </div>
                  <div className="w-full h-3 bg-paper-dark rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent-tertiary rounded-full transition-[width] duration-500 ease-out relative overflow-hidden"
                      style={{ width: `${streamProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                    </div>
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white/30 rounded-full transition-[left] duration-500 ease-out"
                      style={{ left: `${streamProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs font-mono">
                    <span className="text-ink-faint">
                      {streamProgress < 100 ? '分析中...' : '即将完成'}
                    </span>
                    <span className="text-accent font-medium">{Math.round(streamProgress)}%</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : result ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {result.incrementalMeta?.isIncremental && showIncrementalBanner && (
            <div className="px-4 py-3 bg-gradient-to-r from-accent-bg/80 to-accent-tertiary-bg/50 border-b border-accent-faint shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-paper">
                      <Zap size={10} />
                      增量分析
                    </span>
                    <span className="text-[11px] text-ink-faint">
                      基于上一次结果，新增了{' '}
                      {(result.incrementalMeta.newSourceCount || 0) -
                        (result.incrementalMeta.previousSourceCount || 0)}{' '}
                      份材料
                    </span>
                  </div>
                  <div className="text-xs font-medium text-ink mb-1">
                    本次增量分析：新增{' '}
                    <span className="text-danger font-semibold">
                      {result.incrementalMeta.newRiskCount || 0}
                    </span>{' '}
                    条风险，更新{' '}
                    <span className="text-warning font-semibold">
                      {result.incrementalMeta.updatedRiskCount || 0}
                    </span>{' '}
                    条，耗时{' '}
                    <span className="font-mono">
                      {result.incrementalMeta.durationMs
                        ? (result.incrementalMeta.durationMs / 1000).toFixed(1)
                        : '0'}
                      s
                    </span>
                  </div>
                  {result.incrementalMeta.prediction?.accuracy !== undefined && (
                    <div className="text-[11px] text-ink-faint">
                      预测准确率：
                      <span className="text-success font-medium">
                        {result.incrementalMeta.prediction.accuracy}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowIncrementalDetail(!showIncrementalDetail)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-paper-dark/80 text-ink-muted hover:text-ink hover:bg-paper-dark border border-rule/60 cursor-pointer transition-colors"
                  >
                    {showIncrementalDetail ? '收起详情' : '查看详情'}
                  </button>
                  <button
                    type="button"
                    onClick={onAnalyzeFull}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-warning-bg/80 text-warning hover:bg-warning-bg border border-warning/20 cursor-pointer transition-colors"
                    title="重新进行完整分析"
                  >
                    <RefreshCw size={10} className="inline mr-1" />
                    重新完整分析
                  </button>
                  <button
                    type="button"
                    onClick={onDismissIncrementalBanner}
                    className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-paper-dark cursor-pointer transition-colors"
                    aria-label="关闭横幅"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  showIncrementalDetail ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0',
                )}
              >
                <div className="p-3 rounded-lg bg-paper/50 border border-rule/60">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-danger">
                        {result.incrementalMeta.newRiskCount || 0}
                      </div>
                      <div className="text-[10px] text-ink-faint">新增风险</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-warning">
                        {result.incrementalMeta.updatedRiskCount || 0}
                      </div>
                      <div className="text-[10px] text-ink-faint">程度变化</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-success">
                        {result.risks.length -
                          (result.incrementalMeta.newRiskCount || 0) -
                          (result.incrementalMeta.updatedRiskCount || 0)}
                      </div>
                      <div className="text-[10px] text-ink-faint">保持不变</div>
                    </div>
                  </div>
                  {result.incrementalMeta.prediction && (
                    <div className="pt-3 border-t border-rule/50">
                      <div className="text-[11px] font-medium text-ink mb-2">预测 vs 实际</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-ink-faint">新增风险预测</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-ink-muted">
                              预计 {result.incrementalMeta.prediction.estimatedNewRiskCount} 条
                            </span>
                            <span className="text-[10px] text-ink-faint">→</span>
                            <span className="text-[10px] font-medium text-danger">
                              实际 {result.incrementalMeta.newRiskCount || 0} 条
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-ink-faint">影响维度预测</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-ink-muted">
                              预计 {result.incrementalMeta.prediction.estimatedAffectedDimensions}{' '}
                              个
                            </span>
                            <span className="text-[10px] text-ink-faint">→</span>
                            <span className="text-[10px] font-medium text-warning">
                              实际 {result.incrementalMeta.prediction.estimatedAffectedDimensions}{' '}
                              个
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-rule/30">
                          <span className="text-[10px] text-ink-faint">预测准确率</span>
                          <span className="text-[11px] font-semibold text-success">
                            {result.incrementalMeta.prediction.accuracy || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 标签页导航 */}
          <div className="px-4 py-2.5 border-b border-rule flex items-center gap-1 shrink-0 flex-wrap">
            {[
              { key: 'risks', label: '风险清单' },
              { key: 'checklist', label: '检查清单' },
              { key: 'aligned', label: '统一版本' },
              { key: 'dimensions', label: '维度管理' },
              { key: 'entities', label: '关键要素' },
              { key: 'relations', label: '风险关联' },
              { key: 'trace', label: 'AI 思考' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'bg-ink text-paper'
                    : 'text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper-dark border border-rule/60'
                }`}
                onClick={() => onTabChange(tab.key as ResultTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 标签页内容 */}
          <div className="flex-1 overflow-y-auto">
            {/* 风险清单视图 */}
            {activeTab === 'risks' && (
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
                        onClick={() => onRiskStatusFilterChange(item.key as RiskStatus | 'all')}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-200 flex items-center gap-1.5',
                          riskStatusFilter === item.key
                            ? 'bg-ink text-paper'
                            : 'bg-paper-dark/60 text-ink-muted hover:text-ink hover:bg-paper-dark border border-rule/60',
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
                <div role="list" className="divide-y divide-rule">
                  {sortedRisks.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-tertiary-bg flex items-center justify-center text-accent-tertiary">
                        <CheckCircle size={28} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-ink mb-1">一切正常</p>
                      <p className="text-xs text-ink-faint">没有发现风险或冲突</p>
                    </div>
                  ) : (
                    sortedRisks.map((risk, index) => (
                      <AnimatedRiskItem
                        key={risk.id}
                        risk={risk}
                        index={index}
                        isSelected={selectedRisk?.id === risk.id}
                        onSelect={() => onSelectRisk(selectedRisk?.id === risk.id ? null : risk)}
                        onEvidenceClick={onEvidenceClick}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {/* 检查清单视图 */}
            {activeTab === 'checklist' && (
              <div>
                <div className="px-4 py-3 border-b border-rule bg-paper/[0.02]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-muted">
                      已完成{' '}
                      <span className="text-ink font-medium">
                        {checklist.filter((item) => item.checked).length}
                      </span>{' '}
                      / 共 {checklist.length} 项
                    </span>
                    <div className="w-24 h-1.5 bg-paper-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-[width] duration-300"
                        style={{
                          width: `${checklist.length > 0 ? (checklist.filter((item) => item.checked).length / checklist.length) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-rule">
                  {checklist.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
                        <CheckSquare size={28} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-ink mb-1">暂无检查项</p>
                      <p className="text-xs text-ink-faint">检查清单将在分析后生成</p>
                    </div>
                  ) : (
                    checklist.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'px-4 py-3 flex items-start gap-3 transition-all duration-200',
                          item.checked ? 'opacity-60' : '',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleCheck(item.id)}
                          className={cn(
                            'shrink-0 mt-0.5 cursor-pointer transition-colors duration-200',
                            item.checked ? 'text-accent' : 'text-ink-faint hover:text-ink-muted',
                          )}
                        >
                          {item.checked ? (
                            <CheckSquare size={18} strokeWidth={1.5} />
                          ) : (
                            <Square size={18} strokeWidth={1.5} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              'text-xs leading-relaxed mb-1.5',
                              item.checked ? 'line-through text-ink-faint' : 'text-ink',
                            )}
                          >
                            {item.text}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.riskType && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-danger-bg/50 text-danger border border-danger/20">
                                {item.riskType === 'conflict'
                                  ? '直接矛盾'
                                  : item.riskType === 'promise'
                                    ? '承诺未落文字'
                                    : item.riskType === 'missing'
                                      ? '信息缺失'
                                      : '信息提示'}
                              </span>
                            )}
                            {item.dimension && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-paper-dark text-ink-muted border border-rule/60">
                                {item.dimension}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.hasDraft && onGenerateDraft && (
                          <button
                            type="button"
                            onClick={() => onGenerateDraft(item.riskType, item.dimension)}
                            className="shrink-0 mt-0.5 p-1 rounded-md text-ink-faint hover:text-accent hover:bg-accent-bg/50 cursor-pointer transition-all duration-200"
                            title="生成话术"
                          >
                            <MessageSquare size={15} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 统一版本视图 */}
            {activeTab === 'aligned' && (
              <div className="p-4">
                {result.alignedVersion ? (
                  <div className="rounded-lg border-l-4 border-accent bg-accent-bg/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-accent-bg text-accent flex items-center justify-center">
                        <FileCheck size={15} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-ink">统一版本参照</h4>
                        <p className="text-[11px] text-ink-faint">基于多材料交叉验证后的共识版本</p>
                      </div>
                    </div>
                    <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                      {result.alignedVersion}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
                      <FileCheck size={28} strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-ink mb-1">暂无统一版本</p>
                    <p className="text-xs text-ink-faint">统一版本将在分析后生成</p>
                  </div>
                )}
              </div>
            )}

            {/* 维度管理视图 */}
            {activeTab === 'dimensions' && (
              <DimensionPanel
                dimensions={dimensions}
                onToggleEnabled={onToggleDimensionEnabled}
                onUpdateWeight={onUpdateDimensionWeight}
                onMoveDimension={onMoveDimension}
                onAddCustomDimension={onAddCustomDimension}
                onRemoveCustomDimension={onRemoveCustomDimension}
                onResetWeights={onResetDimensionWeights}
                showAddDialog={showAddDimensionDialog}
                onShowAddDialogChange={onShowAddDimensionDialogChange}
              />
            )}

            {/* 关键要素视图 */}
            {activeTab === 'entities' && result.extractedEntities && (
              <div className="p-4 space-y-5">
                {result.extractedEntities.dates && result.extractedEntities.dates.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                      <Calendar size={13} strokeWidth={1.5} className="text-accent" />
                      日期
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {result.extractedEntities.dates.map((entity, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-rule bg-paper/[0.02] p-3"
                        >
                          <div className="relative">
                            <span className="text-[10px] text-ink-faint font-mono absolute top-0 right-0">
                              {entity.source}
                            </span>
                            <div className="text-xs text-ink font-medium pr-12">{entity.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.extractedEntities.amounts &&
                  result.extractedEntities.amounts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                        <DollarSign size={13} strokeWidth={1.5} className="text-success" />
                        金额
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {result.extractedEntities.amounts.map((entity, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-rule bg-paper/[0.02] p-3"
                          >
                            <div className="relative">
                              <span className="text-[10px] text-ink-faint font-mono absolute top-0 right-0">
                                {entity.source}
                              </span>
                              <div className="text-xs text-ink font-medium pr-12">
                                {entity.value}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {result.extractedEntities.terms && result.extractedEntities.terms.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                      <ScrollText size={13} strokeWidth={1.5} className="text-warning" />
                      条款
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {result.extractedEntities.terms.map((entity, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-rule bg-paper/[0.02] p-3"
                        >
                          <div className="relative">
                            <span className="text-[10px] text-ink-faint font-mono absolute top-0 right-0">
                              {entity.source}
                            </span>
                            <div className="text-xs text-ink font-medium pr-12">{entity.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.extractedEntities.promises &&
                  result.extractedEntities.promises.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                        <MessageCircle
                          size={13}
                          strokeWidth={1.5}
                          className="text-accent-tertiary"
                        />
                        承诺
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {result.extractedEntities.promises.map((entity, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-rule bg-paper/[0.02] p-3"
                          >
                            <div className="relative">
                              <span className="text-[10px] text-ink-faint font-mono absolute top-0 right-0">
                                {entity.source}
                              </span>
                              <div className="text-xs text-ink font-medium pr-12">
                                {entity.value}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {(!result.extractedEntities.dates || result.extractedEntities.dates.length === 0) &&
                  (!result.extractedEntities.amounts ||
                    result.extractedEntities.amounts.length === 0) &&
                  (!result.extractedEntities.terms ||
                    result.extractedEntities.terms.length === 0) &&
                  (!result.extractedEntities.promises ||
                    result.extractedEntities.promises.length === 0) && (
                    <div className="text-center py-16 px-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-ink mb-1">暂无关键要素</p>
                      <p className="text-xs text-ink-faint">关键要素将在分析后提取</p>
                    </div>
                  )}
              </div>
            )}

            {/* 风险关联视图 */}
            {activeTab === 'relations' && result.riskRelations && (
              <div className="p-4 space-y-5">
                {/* 冲突风险对 */}
                {result.riskRelations.conflictPairs &&
                  result.riskRelations.conflictPairs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                        <AlertTriangle size={13} strokeWidth={1.5} className="text-danger" />
                        冲突风险对
                      </h4>
                      <div className="space-y-2">
                        {result.riskRelations.conflictPairs.map(
                          (pair: ConflictPair, idx: number) => {
                            const risk1 = result.risks.find((r) => r.id === pair.risk1Id)
                            const risk2 = result.risks.find((r) => r.id === pair.risk2Id)
                            if (!risk1 || !risk2) return null
                            return (
                              <div
                                key={idx}
                                className="rounded-lg border border-danger/20 bg-danger-bg/30 p-3"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    role="button"
                                    tabIndex={-1}
                                    className="px-2 py-1 rounded-md text-[11px] bg-danger-bg text-danger cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => onSelectRisk(risk1)}
                                  >
                                    {risk1.title.length > 10
                                      ? `${risk1.title.substring(0, 10)}…`
                                      : risk1.title}
                                  </span>
                                  <div className="text-danger text-xs">⇄</div>
                                  <span
                                    role="button"
                                    tabIndex={-1}
                                    className="px-2 py-1 rounded-md text-[11px] bg-danger-bg text-danger cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => onSelectRisk(risk2)}
                                  >
                                    {risk2.title.length > 10
                                      ? `${risk2.title.substring(0, 10)}…`
                                      : risk2.title}
                                  </span>
                                </div>
                                <p className="text-[11px] text-ink-faint leading-relaxed">
                                  {pair.reason}
                                </p>
                              </div>
                            )
                          },
                        )}
                      </div>
                    </div>
                  )}

                {/* 按材料查看风险 */}
                <div>
                  <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                    <FileText size={13} strokeWidth={1.5} className="text-ink-faint" />
                    按材料查看风险
                  </h4>
                  <div className="space-y-2.5">
                    {result.riskRelations.associations.map((assoc: RiskAssociation) => (
                      <div
                        key={assoc.sourceName}
                        className="rounded-lg border border-rule bg-paper/[0.02] p-3"
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <FileText size={13} strokeWidth={1.5} className="text-ink-faint" />
                            <span className="text-xs font-medium text-ink">{assoc.sourceName}</span>
                          </div>
                          <span className="text-[10px] text-ink-faint font-mono px-1.5 py-0.5 bg-paper-dark rounded">
                            {assoc.riskCount} 个风险
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {assoc.riskIds.map((riskId: string) => {
                            const risk = result.risks.find((r) => r.id === riskId)
                            if (!risk) return null
                            return (
                              <span
                                key={riskId}
                                role="button"
                                tabIndex={-1}
                                className={`px-2 py-1 rounded-md text-[11px] cursor-pointer hover:opacity-80 transition-opacity ${
                                  risk.level === 'critical'
                                    ? 'bg-danger-bg text-danger'
                                    : risk.level === 'warning'
                                      ? 'bg-warning-bg text-warning'
                                      : 'bg-success-bg text-success'
                                }`}
                                onClick={() => onSelectRisk(risk)}
                              >
                                {risk.title.length > 12
                                  ? `${risk.title.substring(0, 12)}…`
                                  : risk.title}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 风险关联网络 */}
                {result.riskRelations.relatedRiskIds &&
                  Object.keys(result.riskRelations.relatedRiskIds).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                        <GitBranch size={13} strokeWidth={1.5} className="text-ink-faint" />
                        风险关联网络
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(result.riskRelations.relatedRiskIds).map(
                          ([riskId, relatedIds]: [string, string[]]) => {
                            const risk = result.risks.find((r) => r.id === riskId)
                            if (!risk || relatedIds.length === 0) return null
                            return (
                              <div
                                key={riskId}
                                className="rounded-lg border border-rule bg-paper/[0.02] p-2.5"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span
                                    role="button"
                                    tabIndex={-1}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                                      risk.level === 'critical'
                                        ? 'bg-danger-bg text-danger'
                                        : risk.level === 'warning'
                                          ? 'bg-warning-bg text-warning'
                                          : 'bg-success-bg text-success'
                                    }`}
                                    onClick={() => onSelectRisk(risk)}
                                  >
                                    {risk.title.length > 10
                                      ? `${risk.title.substring(0, 10)}…`
                                      : risk.title}
                                  </span>
                                  <span className="text-[10px] text-ink-faint">关联风险</span>
                                </div>
                                <div className="flex flex-wrap gap-1 pl-1">
                                  {relatedIds.map((relId: string) => {
                                    const relRisk = result.risks.find((r) => r.id === relId)
                                    if (!relRisk) return null
                                    return (
                                      <span
                                        key={relId}
                                        role="button"
                                        tabIndex={-1}
                                        className="px-1.5 py-0.5 rounded text-[10px] bg-paper-dark text-ink-muted cursor-pointer hover:text-ink transition-colors border border-rule/60"
                                        onClick={() => onSelectRisk(relRisk)}
                                      >
                                        {relRisk.title.length > 8
                                          ? `${relRisk.title.substring(0, 8)}…`
                                          : relRisk.title}
                                      </span>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          },
                        )}
                      </div>
                    </div>
                  )}

                {/* 证据链验证结果 */}
                {result.riskRelations.validationResults &&
                  result.riskRelations.validationResults.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
                        <ScrollText size={13} strokeWidth={1.5} className="text-accent" />
                        证据链验证结果
                      </h4>
                      <div className="space-y-2.5">
                        {result.riskRelations.validationResults?.map(
                          (validation: ValidationResult) => {
                            const risk = result.risks.find((r) => r.id === validation.riskId)
                            if (!risk) return null
                            return (
                              <div
                                key={validation.riskId}
                                className="rounded-lg border border-rule bg-paper/[0.02] p-3"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      role="button"
                                      tabIndex={-1}
                                      className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                                        risk.level === 'critical'
                                          ? 'bg-danger-bg text-danger'
                                          : risk.level === 'warning'
                                            ? 'bg-warning-bg text-warning'
                                            : 'bg-success-bg text-success'
                                      }`}
                                      onClick={() => onSelectRisk(risk)}
                                    >
                                      {risk.title.length > 15
                                        ? `${risk.title.substring(0, 15)}…`
                                        : risk.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-ink-faint">
                                      证据: {validation.evidenceCount}/{risk.sources.length}
                                    </span>
                                    {validation.confidence !== undefined && (
                                      <ConfidenceBar confidence={validation.confidence} size="sm" />
                                    )}
                                  </div>
                                </div>
                                {validation.missingSources &&
                                  validation.missingSources.length > 0 && (
                                    <div className="text-[10px] text-warning mb-1.5">
                                      <span className="font-medium">缺失证据来源：</span>
                                      {validation.missingSources.join(', ')}
                                    </div>
                                  )}
                                {validation.conflicts && validation.conflicts.length > 0 && (
                                  <div className="space-y-1">
                                    {validation.conflicts.map((conflict: Conflict, idx: number) => (
                                      <div
                                        key={idx}
                                        className="text-[10px] text-danger-bg bg-danger-bg/20 rounded px-2 py-1"
                                      >
                                        <span className="font-medium">
                                          冲突[{conflict.dimension}]
                                        </span>
                                        <span className="ml-1">
                                          {conflict.conflictingSources.join(' vs ')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          },
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* AI 思考视图 */}
            {activeTab === 'trace' && result.reasoningTrace && (
              <div className="space-y-2.5 p-4">
                {incrementalMeta?.isIncremental && (
                  <IncrementalDetailPanel meta={incrementalMeta} />
                )}

                <div className="mb-4 flex items-center gap-2.5 px-1">
                  <div className="w-8 h-8 rounded-full bg-accent-tertiary-bg text-accent-tertiary flex items-center justify-center">
                    <Sparkles size={15} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink">AI 思考过程</div>
                    <div className="text-[11px] text-ink-faint">
                      共 {result.reasoningTrace.length} 个步骤，点击展开查看详情
                    </div>
                  </div>
                </div>

                <div className="relative pl-5">
                  <div className="absolute left-[11px] top-1 bottom-1 w-px bg-rule" />
                  {result.reasoningTrace?.map((step: ReasoningStep, idx: number) => (
                    <ReasoningStepCard key={idx} step={step} index={idx} />
                  ))}
                </div>

                {result.debugInfo && (
                  <div className="mt-5 rounded-lg border border-rule bg-paper/[0.02] overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-rule flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">开发者调试信息</span>
                    </div>
                    <div className="p-3.5 space-y-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-ink-faint">模型</span>
                        <span className="text-ink-faint font-mono">{result.debugInfo.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint">Prompt Tokens</span>
                        <span className="text-ink-faint font-mono">
                          {result.debugInfo.tokenPrompt}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint">Completion Tokens</span>
                        <span className="text-ink-faint font-mono">
                          {result.debugInfo.tokenCompletion}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint">Total Tokens</span>
                        <span className="text-ink-faint font-mono">
                          {result.debugInfo.tokenTotal}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : hasSources ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 mb-5 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
            <Search size={28} strokeWidth={1.5} />
          </div>
          <div className="text-[10px] font-mono text-accent tracking-widest uppercase mb-2">
            准备开始
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2 font-display tracking-tight">
            准备好分析了吗？
          </h3>
          <p className="text-xs text-ink-faint mb-6 max-w-sm leading-relaxed">
            点击"开始分析"，AI 将自动识别冲突、缺失和风险
          </p>
          <button
            type="button"
            className="px-5 py-2.5 bg-ink text-paper rounded-full text-xs font-medium cursor-pointer border-none hover:bg-accent transition-colors duration-200 group"
            onClick={onAnalyze}
          >
            开始分析
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="w-full max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent-tertiary text-paper shadow-lg shadow-accent/20">
                <Sparkles size={28} strokeWidth={1.5} />
              </div>
              <div className="text-[10px] font-mono text-accent tracking-widest uppercase mb-2">
                欢迎使用有据
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-2 font-display tracking-tight">
                3 步开始你的分析
              </h2>
              <p className="text-xs text-ink-faint max-w-sm mx-auto leading-relaxed">
                多源证据交叉验证，帮你从碎片化信息中梳理事实、识别冲突
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                {
                  step: 1,
                  icon: <Upload size={18} strokeWidth={1.5} />,
                  title: '上传材料',
                  desc: '聊天记录、文档、网页、截图，支持多种格式',
                  color: 'bg-accent-bg text-accent border-accent-faint',
                },
                {
                  step: 2,
                  icon: <Zap size={18} strokeWidth={1.5} />,
                  title: 'AI 自动分析',
                  desc: '智能识别冲突、承诺缺失和潜在风险',
                  color: 'bg-warning-bg text-warning border-warning/20',
                },
                {
                  step: 3,
                  icon: <CheckCircle size={18} strokeWidth={1.5} />,
                  title: '查看结论',
                  desc: '每条结论都可溯源，证据链清晰可见',
                  color: 'bg-success-bg text-success border-success/20',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-paper-dark/40 border border-rule/50 hover:border-rule transition-all duration-300"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border',
                      item.color,
                    )}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-ink-faint">0{item.step}</span>
                      <h4 className="text-sm font-medium text-ink">{item.title}</h4>
                    </div>
                    <p className="text-xs text-ink-faint leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button
                type="button"
                onClick={() => onLoadScenario?.('job')}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-accent to-accent-tertiary text-paper rounded-xl text-sm font-medium cursor-pointer border-none hover:opacity-90 transition-all duration-200 shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} strokeWidth={1.5} />
                快速体验
              </button>
              <button
                type="button"
                onClick={onAddSource}
                className="flex-1 px-4 py-3 bg-paper-dark text-ink rounded-xl text-sm font-medium cursor-pointer border border-rule hover:bg-ink hover:text-paper transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Upload size={16} strokeWidth={1.5} />
                自己上传材料
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-rule/60" />
                <span className="text-[10px] font-mono text-ink-faint tracking-wider uppercase">
                  场景模板
                </span>
                <div className="flex-1 h-px bg-rule/60" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {SCENARIOS.filter((s) => s.id !== 'custom' && s.id !== 'purchase').map(
                  (scenario) => {
                    const Icon =
                      scenario.icon === 'briefcase'
                        ? Briefcase
                        : scenario.icon === 'home'
                          ? Home
                          : BookOpen
                    return (
                      <button
                        key={scenario.id}
                        type="button"
                        onClick={() => onLoadScenario?.(scenario.id as ScenarioType)}
                        className="group p-3 sm:p-4 rounded-xl bg-paper-dark/30 border border-rule/50 hover:border-accent/50 hover:bg-accent-bg/20 cursor-pointer transition-all duration-200 text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-paper-dark border border-rule/60 flex items-center justify-center text-ink-muted group-hover:text-accent group-hover:bg-accent-bg group-hover:border-accent-faint transition-all duration-200 mb-2">
                          <Icon size={16} strokeWidth={1.5} />
                        </div>
                        <h5 className="text-xs font-medium text-ink mb-1 truncate">
                          {scenario.name}
                        </h5>
                        <p className="text-[10px] text-ink-faint line-clamp-2 leading-relaxed">
                          {scenario.description}
                        </p>
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
