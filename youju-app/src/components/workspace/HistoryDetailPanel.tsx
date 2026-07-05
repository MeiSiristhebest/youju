import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Home,
  PenLine,
  RotateCcw,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { SCENARIOS } from '../../constants/workspace'
import { formatDuration } from '../../lib/history'
import { cn } from '../../lib/utils'
import type { HistorySnapshot } from '../../types/history'

interface HistoryDetailPanelProps {
  isOpen: boolean
  snapshot: HistorySnapshot | null
  onClose: () => void
  onRestore?: (snapshot: HistorySnapshot) => void
  onCompareWithCurrent?: (snapshot: HistorySnapshot) => void
}

const getScenarioIcon = (scenarioType: string) => {
  switch (scenarioType) {
    case 'job':
      return <Briefcase size={16} strokeWidth={1.5} />
    case 'rent':
      return <Home size={16} strokeWidth={1.5} />
    case 'homework':
      return <BookOpen size={16} strokeWidth={1.5} />
    default:
      return <PenLine size={16} strokeWidth={1.5} />
  }
}

const getScenarioName = (scenarioType: string) => {
  const scenario = SCENARIOS.find((s) => s.id === scenarioType)
  return scenario?.name || '自定义分析'
}

const getLevelBadge = (level: string) => {
  switch (level) {
    case 'critical':
      return 'bg-danger-bg text-danger'
    case 'warning':
      return 'bg-warning-bg text-warning'
    case 'info':
      return 'bg-success-bg text-success'
    default:
      return 'bg-paper-dark text-ink-muted'
  }
}

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'critical':
      return <AlertTriangle size={12} strokeWidth={1.5} />
    case 'warning':
      return <Zap size={12} strokeWidth={1.5} />
    case 'info':
      return <CheckCircle size={12} strokeWidth={1.5} />
    default:
      return null
  }
}

const getLevelName = (level: string) => {
  switch (level) {
    case 'critical':
      return '严重'
    case 'warning':
      return '警告'
    case 'info':
      return '提示'
    default:
      return level
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function HistoryDetailPanel({
  isOpen,
  snapshot,
  onClose,
  onRestore,
  onCompareWithCurrent,
}: HistoryDetailPanelProps) {
  const [showConfirmRestore, setShowConfirmRestore] = useState(false)
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'checklist'>('overview')

  if (!isOpen || !snapshot) return null

  const { result } = snapshot
  const risks = result.risks || []
  const checklist = result.checklist || []
  const summary = result.summary || {
    critical: 0,
    warning: 0,
    info: 0,
    total: risks.length,
  }

  const handleRestoreConfirm = () => {
    if (onRestore) {
      onRestore(snapshot)
    }
    setShowConfirmRestore(false)
    onClose()
  }

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[950] bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (showConfirmRestore) {
            setShowConfirmRestore(false)
          } else {
            onClose()
          }
        }
      }}
    >
      <div className="absolute inset-4 md:inset-10 lg:inset-16 bg-paper border border-rule rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-paper-dark border border-rule flex items-center justify-center text-ink-muted">
              {getScenarioIcon(snapshot.scenarioType)}
            </div>
            <div>
              <div className="text-sm font-medium text-ink">{snapshot.title}</div>
              <div className="text-[11px] text-ink-faint flex items-center gap-2">
                <span>{getScenarioName(snapshot.scenarioType)}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={10} strokeWidth={1.5} />
                  {formatDate(snapshot.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onCompareWithCurrent && (
              <button
                type="button"
                className="px-3 py-1.5 text-[11px] bg-paper-dark text-ink-muted border border-rule/60 rounded-md cursor-pointer hover:bg-paper-dark hover:text-ink transition-colors"
                onClick={() => onCompareWithCurrent(snapshot)}
              >
                与当前对比
              </button>
            )}
            {onRestore && (
              <button
                type="button"
                className="px-3 py-1.5 text-[11px] bg-success-bg text-success border border-success/30 rounded-md cursor-pointer hover:bg-success-bg/80 transition-colors flex items-center gap-1.5"
                onClick={() => setShowConfirmRestore(true)}
              >
                <RotateCcw size={12} strokeWidth={1.5} />
                恢复此版本
              </button>
            )}
            <button
              type="button"
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
              onClick={onClose}
              aria-label="关闭"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="px-5 py-2 border-b border-rule bg-paper/[0.02] flex gap-1 shrink-0">
          {[
            { key: 'overview', label: '概览' },
            { key: 'risks', label: `风险 (${summary.total})` },
            { key: 'checklist', label: `检查清单 (${checklist.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                'px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors',
                activeTab === tab.key
                  ? 'bg-ink text-paper'
                  : 'text-ink-muted bg-transparent hover:text-ink hover:bg-paper-dark/60',
              )}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-paper-dark/50 border border-rule rounded-lg p-3">
                  <div className="text-[10px] text-ink-faint mb-1">严重风险</div>
                  <div className="text-xl font-semibold text-danger">{summary.critical}</div>
                </div>
                <div className="bg-paper-dark/50 border border-rule rounded-lg p-3">
                  <div className="text-[10px] text-ink-faint mb-1">警告风险</div>
                  <div className="text-xl font-semibold text-warning">{summary.warning}</div>
                </div>
                <div className="bg-paper-dark/50 border border-rule rounded-lg p-3">
                  <div className="text-[10px] text-ink-faint mb-1">提示风险</div>
                  <div className="text-xl font-semibold text-success">{summary.info}</div>
                </div>
                <div className="bg-paper-dark/50 border border-rule rounded-lg p-3">
                  <div className="text-[10px] text-ink-faint mb-1">风险总计</div>
                  <div className="text-xl font-semibold text-ink">{summary.total}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-paper-dark/30 border border-rule rounded-lg p-4">
                  <h4 className="text-xs font-medium text-ink mb-3">基本信息</h4>
                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-ink-faint">场景类型</span>
                      <span className="text-ink">{getScenarioName(snapshot.scenarioType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-faint">创建时间</span>
                      <span className="text-ink font-mono">{formatDate(snapshot.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-faint">分析耗时</span>
                      <span className="text-ink font-mono">
                        {formatDuration(snapshot.durationMs)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-faint">材料数量</span>
                      <span className="text-ink">{snapshot.sourceCount} 份</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-faint">风险总数</span>
                      <span className="text-ink">{summary.total} 条</span>
                    </div>
                    {result.meta?.model && (
                      <div className="flex justify-between">
                        <span className="text-ink-faint">使用模型</span>
                        <span className="text-ink font-mono text-[10px]">{result.meta.model}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-paper-dark/30 border border-rule rounded-lg p-4">
                  <h4 className="text-xs font-medium text-ink mb-3">风险分布</h4>
                  <div className="space-y-2.5">
                    {['critical', 'warning', 'info'].map((level) => {
                      const count = summary[level as keyof typeof summary] || 0
                      const percent = summary.total > 0 ? (count / summary.total) * 100 : 0
                      return (
                        <div key={level}>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-ink-faint flex items-center gap-1">
                              {getLevelIcon(level)}
                              {getLevelName(level)}
                            </span>
                            <span className="text-ink-muted">{count} 条</span>
                          </div>
                          <div className="h-1.5 bg-paper rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                level === 'critical' && 'bg-danger',
                                level === 'warning' && 'bg-warning',
                                level === 'info' && 'bg-success',
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {result.dimensions && result.dimensions.length > 0 && (
                <div className="bg-paper-dark/30 border border-rule rounded-lg p-4">
                  <h4 className="text-xs font-medium text-ink mb-3">分析维度</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.dimensions.map((dim, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-[10px] bg-paper border border-rule rounded-md text-ink-muted"
                      >
                        {dim.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'risks' && (
            <div className="divide-y divide-rule/60">
              {risks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-3 text-ink-faint border border-rule">
                    <CheckCircle size={20} strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-ink-faint font-medium">暂无风险</p>
                </div>
              ) : (
                risks.map((risk) => (
                  <div key={risk.id} className="px-5 py-3 hover:bg-paper-dark/30 transition-colors">
                    <div
                      className="flex gap-3 items-start cursor-pointer"
                      onClick={() => setExpandedRiskId(expandedRiskId === risk.id ? null : risk.id)}
                    >
                      <div
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                          getLevelBadge(risk.level),
                        )}
                      >
                        {getLevelIcon(risk.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              risk.level === 'critical' && 'text-danger',
                              risk.level === 'warning' && 'text-warning',
                              risk.level === 'info' && 'text-success',
                            )}
                          >
                            {risk.title}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {risk.confidence !== undefined && (
                              <span className="text-[10px] font-mono text-ink-faint">
                                {risk.confidence}%
                              </span>
                            )}
                            {expandedRiskId === risk.id ? (
                              <ChevronUp size={12} strokeWidth={1.5} className="text-ink-faint" />
                            ) : (
                              <ChevronDown size={12} strokeWidth={1.5} className="text-ink-faint" />
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] text-ink-faint mb-1.5 font-mono">
                          {risk.type === 'conflict'
                            ? '直接矛盾'
                            : risk.type === 'promise'
                              ? '承诺未落文字'
                              : risk.type === 'missing'
                                ? '信息缺失'
                                : '信息提示'}
                          {risk.dimension && ` · ${risk.dimension}`}
                        </div>
                        <div className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">
                          {risk.description}
                        </div>

                        {expandedRiskId === risk.id &&
                          risk.evidence &&
                          risk.evidence.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-rule/60">
                              <div className="text-[10px] text-ink-faint mb-2 flex items-center gap-1">
                                <FileText size={10} strokeWidth={1.5} />
                                证据来源 ({risk.evidence.length})
                              </div>
                              <div className="space-y-2">
                                {risk.evidence.map((ev, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-lg bg-paper/[0.02] border border-rule p-2.5"
                                  >
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <FileText
                                        size={9}
                                        strokeWidth={1.5}
                                        className="text-ink-faint shrink-0"
                                      />
                                      <span className="text-[10px] text-ink-faint truncate">
                                        {ev.sourceName}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-ink-muted leading-relaxed italic pl-3 border-l-2 border-rule">
                                      &quot;{ev.quote}&quot;
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="p-5 space-y-2">
              {checklist.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-3 text-ink-faint border border-rule">
                    <CheckCircle size={20} strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-ink-faint font-medium">暂无检查清单</p>
                </div>
              ) : (
                checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 p-3 bg-paper-dark/30 border border-rule rounded-lg"
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center',
                        item.checked ? 'bg-success border-success' : 'border-rule bg-paper-dark',
                      )}
                    >
                      {item.checked && (
                        <CheckCircle size={10} strokeWidth={3} className="text-paper" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-xs font-medium',
                          item.checked ? 'text-ink-faint line-through' : 'text-ink',
                        )}
                      >
                        {item.text}
                      </div>
                      {(item.riskType || item.dimension) && (
                        <div className="text-[10px] text-ink-faint mt-1 flex items-center gap-2">
                          {item.riskType && <span>{item.riskType}</span>}
                          {item.riskType && item.dimension && <span>·</span>}
                          {item.dimension && <span>{item.dimension}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {showConfirmRestore && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-paper border border-rule rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning-bg/50 flex items-center justify-center text-warning">
                  <RotateCcw size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink">确认恢复此版本？</h3>
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    当前工作区的内容将被替换为该历史版本
                  </p>
                </div>
              </div>
              <div className="bg-paper-dark/50 border border-rule rounded-lg p-3 mb-4">
                <div className="text-[11px] text-ink-muted mb-1">版本信息</div>
                <div className="text-xs text-ink font-medium mb-1">{snapshot.title}</div>
                <div className="text-[10px] text-ink-faint font-mono">
                  {formatDate(snapshot.createdAt)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 px-3 py-2 text-[11px] bg-paper-dark text-ink-muted border border-rule/60 rounded-md cursor-pointer hover:bg-paper-dark hover:text-ink transition-colors"
                  onClick={() => setShowConfirmRestore(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="flex-1 px-3 py-2 text-[11px] bg-success text-paper rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handleRestoreConfirm}
                >
                  确认恢复
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
