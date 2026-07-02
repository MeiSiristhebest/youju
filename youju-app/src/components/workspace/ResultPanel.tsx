import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  DollarSign,
  FileCheck,
  FileText,
  GitBranch,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  ScrollText,
  Search,
  Sparkles,
  Square,
  Target,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AnalyzeResult, ChecklistItem, IncrementalMeta, Risk } from '../../types'
import { ConfidenceBar } from '../ui/ConfidenceBar'
import { RiskBadge } from '../ui/RiskBadge'
import { IncrementalDetailPanel } from './IncrementalDetailPanel'

type ResultTab = 'risks' | 'checklist' | 'aligned' | 'entities' | 'relations' | 'trace'

interface ResultPanelProps {
  analyzing: boolean
  analysisStep: number
  result: AnalyzeResult | null
  activeTab: ResultTab
  selectedRisk: Risk | null
  checklist: ChecklistItem[]
  incrementalMeta?: IncrementalMeta
  onTabChange: (tab: ResultTab) => void
  onSelectRisk: (risk: Risk | null) => void
  onToggleCheck: (id: string) => void
  onGenerateDraft?: (riskType?: string, dimension?: string) => void
  onAnalyze: () => void
  canAnalyze: boolean
  streaming: boolean
  streamProgress: number
  streamError: string | null
  onCancel?: () => void
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
}: {
  risk: Risk
  index: number
  isSelected: boolean
  onSelect: () => void
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 150)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <div role="listitem" className="contents">
      <button
        key={risk.id}
        type="button"
        onClick={onSelect}
        aria-expanded={isSelected}
        aria-label={`${risk.level === 'critical' ? '严重' : risk.level === 'warning' ? '警告' : '提示'}风险：${risk.title}。类型：${risk.type === 'conflict' ? '直接矛盾' : risk.type === 'promise' ? '未兑现承诺' : risk.type === 'missing' ? '系统性缺失' : risk.type}`}
        className={cn(
          'w-full text-left px-4 py-3 transition-all duration-300 cursor-pointer',
          isSelected ? 'bg-paper-dark' : 'hover:bg-paper-dark/50',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 gap-2">
              <div
                className={cn(
                  'text-sm font-medium',
                  risk.level === 'critical'
                    ? 'text-danger'
                    : risk.level === 'warning'
                      ? 'text-warning'
                      : 'text-success',
                )}
              >
                {risk.title}
              </div>
              {/* 色盲友好的风险等级徽章：颜色 + 形状 + 文字三重区分 */}
              <RiskBadge level={risk.level} title={risk.title} className="shrink-0" />
              {risk.confidence !== undefined && (
                <div className="shrink-0 ml-2">
                  <ConfidenceBar confidence={risk.confidence} size="sm" />
                </div>
              )}
            </div>
            <div className="text-[11px] text-ink-faint mb-1.5 font-mono">
              {risk.type === 'conflict'
                ? '直接矛盾'
                : risk.type === 'promise'
                  ? '承诺未落文字'
                  : risk.type === 'missing'
                    ? '信息缺失'
                    : '信息提示'}
              {risk.dimension && ` · ${risk.dimension}`}
            </div>
            <div className="text-xs text-ink-muted leading-relaxed line-clamp-2">
              {risk.description}
            </div>
          </div>
        </div>
      </button>
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
  incrementalMeta,
  onTabChange,
  onSelectRisk,
  onToggleCheck,
  onGenerateDraft,
  onAnalyze,
  canAnalyze,
  streaming,
  streamProgress,
  streamError,
  onCancel,
}: ResultPanelProps) {
  const currentStep = STEP_LABELS[analysisStep - 1]
  const [showProgressDetail, setShowProgressDetail] = useState(true)

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {analyzing ? (
        <div className="flex-1 flex flex-col p-6">
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
              <div className="flex items-center justify-between mb-8">
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

              <div
                id="progress-detail-panel"
                className={cn(
                  'transition-all duration-500 overflow-hidden',
                  showProgressDetail ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0',
                )}
              >
                <div className="space-y-3 mb-6">
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
                            {isCurrent ? <TypewriterText text={step.desc} delay={20} /> : step.desc}
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

              <div className="mt-auto">
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
            </>
          )}
        </div>
      ) : result ? (
        <>
          {/* 标签页导航 */}
          <div className="px-4 py-2.5 border-b border-rule flex items-center gap-1 shrink-0">
            {[
              { key: 'risks', label: '风险清单' },
              { key: 'checklist', label: '检查清单' },
              { key: 'aligned', label: '统一版本' },
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
              <div role="list" className="divide-y divide-rule">
                {result.risks.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-tertiary-bg flex items-center justify-center text-accent-tertiary">
                      <CheckCircle size={28} strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-ink mb-1">一切正常</p>
                    <p className="text-xs text-ink-faint">没有发现风险或冲突</p>
                  </div>
                ) : (
                  result.risks.map((risk, index) => (
                    <AnimatedRiskItem
                      key={risk.id}
                      risk={risk}
                      index={index}
                      isSelected={selectedRisk?.id === risk.id}
                      onSelect={() => onSelectRisk(selectedRisk?.id === risk.id ? null : risk)}
                    />
                  ))
                )}
              </div>
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
                        {result.riskRelations.conflictPairs.map((pair: any, idx: number) => {
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
                        })}
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
                    {result.riskRelations.associations.map((assoc: any) => (
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
                          ([riskId, relatedIds]: any) => {
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
                        {result.riskRelations.validationResults.map((validation: any) => {
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
                                  {validation.conflicts.map((conflict: any, idx: number) => (
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
                        })}
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
                {result.reasoningTrace.map((step: any, idx: number) => (
                  <div key={idx} className="rounded-lg bg-paper/[0.02] border border-rule p-3.5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-5 h-5 rounded-full bg-accent-bg text-accent flex items-center justify-center text-[11px] font-medium">
                        {idx + 1}
                      </div>
                      <div className="text-xs font-medium text-ink">
                        {step.title || step.name || step.step || `步骤 ${idx + 1}`}
                      </div>
                    </div>
                    {(step.description || step.result) && (
                      <p className="text-xs text-ink-faint pl-7.5 leading-relaxed">
                        {step.description || step.result}
                      </p>
                    )}
                    {step.content && (
                      <div className="mt-2 pl-7.5">
                        <pre className="text-[11px] text-ink-faint bg-black/30 p-2.5 rounded-md overflow-x-auto whitespace-pre-wrap">
                          {step.content}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}

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
        </>
      ) : (
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
            添加材料后点击"开始分析"，AI 将自动识别冲突、缺失和风险
          </p>
          <button
            type="button"
            className="px-5 py-2.5 bg-ink text-paper rounded-full text-xs font-medium cursor-pointer border-none hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 group"
            onClick={onAnalyze}
            disabled={!canAnalyze}
          >
            {!canAnalyze ? '请先添加材料' : '开始分析'}
          </button>
        </div>
      )}
    </div>
  )
}
