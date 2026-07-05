import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  Link2Off,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { AnalyzeResult, SharedReport } from '../types'

interface SharePageProps {
  sharedReport: SharedReport | null
  result: AnalyzeResult | null
  error: string
  loading: boolean
}

interface RiskComment {
  id: string
  riskId: string
  author: string
  content: string
  evidenceAnchor?: string
  createdAt: string
}

const COMMENT_STORAGE_KEY = 'youju_share_comments'

function loadComments(shareId: string): Record<string, RiskComment[]> {
  try {
    const raw = localStorage.getItem(`${COMMENT_STORAGE_KEY}_${shareId}`)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveComments(shareId: string, comments: Record<string, RiskComment[]>) {
  try {
    localStorage.setItem(`${COMMENT_STORAGE_KEY}_${shareId}`, JSON.stringify(comments))
  } catch {
    // ignore quota errors
  }
}

export function SharePage({ sharedReport, result, error, loading }: SharePageProps) {
  const [activeCommentRiskId, setActiveCommentRiskId] = useState<string | null>(null)
  const [commentsByRisk, setCommentsByRisk] = useState<Record<string, RiskComment[]>>({})
  const [commentInput, setCommentInput] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [selectedEvidence, setSelectedEvidence] = useState<string | undefined>(undefined)

  const shareId = useMemo(() => {
    if (!sharedReport) return 'anonymous'
    return `${sharedReport.title}-${sharedReport.createdAt}`.replace(/\s+/g, '-')
  }, [sharedReport])

  useEffect(() => {
    setCommentsByRisk(loadComments(shareId))
  }, [shareId])

  const persistComments = (next: Record<string, RiskComment[]>) => {
    setCommentsByRisk(next)
    saveComments(shareId, next)
  }

  const handleAddComment = () => {
    if (!activeCommentRiskId || !commentInput.trim()) return
    const newComment: RiskComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      riskId: activeCommentRiskId,
      author: commentAuthor.trim() || '匿名访客',
      content: commentInput.trim(),
      evidenceAnchor: selectedEvidence,
      createdAt: new Date().toISOString(),
    }
    const existing = commentsByRisk[activeCommentRiskId] || []
    const next = {
      ...commentsByRisk,
      [activeCommentRiskId]: [...existing, newComment],
    }
    persistComments(next)
    setCommentInput('')
    setSelectedEvidence(undefined)
  }

  const handleDeleteComment = (commentId: string, riskId: string) => {
    const existing = commentsByRisk[riskId] || []
    const next = {
      ...commentsByRisk,
      [riskId]: existing.filter((c) => c.id !== commentId),
    }
    persistComments(next)
  }

  const activeRisk = result?.risks.find((r) => r.id === activeCommentRiskId) || null
  const activeComments = activeCommentRiskId ? commentsByRisk[activeCommentRiskId] || [] : []
  const activeRiskEvidenceOptions = activeRisk
    ? activeRisk.evidence?.map((e) => e.sourceName) || activeRisk.sources
    : []

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="px-8 py-5 border-b border-rule">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ink rounded-full flex items-center justify-center">
              <Sparkles size={16} strokeWidth={1.5} className="text-paper" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink font-display tracking-tight">
                分享的报告
              </h1>
              {sharedReport && (
                <p className="text-[11px] text-ink-faint">来自「有据」信息对齐分析</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent transition-colors duration-200 group"
            onClick={() => (window.location.href = '/')}
          >
            前往有据
            <ArrowUpRight
              size={12}
              strokeWidth={1.5}
              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
            />
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-10">
          <div className="w-16 h-16 rounded-full bg-paper-dark flex items-center justify-center mb-5 text-ink-faint animate-pulse">
            <Link2Off size={28} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold text-ink mb-2 font-display tracking-tight">
            无法加载分享
          </h2>
          <p className="text-sm text-ink-muted mb-5">{error}</p>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer border border-rule bg-paper text-ink hover:bg-paper-dark transition-colors duration-200"
            onClick={() => (window.location.href = '/')}
          >
            前往首页
          </button>
        </div>
      ) : sharedReport && result ? (
        <div className="max-w-3xl mx-auto px-6 py-10">
          {sharedReport.expiresAt && new Date(sharedReport.expiresAt) < new Date() && (
            <div className="mb-6 p-4 bg-danger-bg/30 border border-danger-faint rounded-xl flex items-start gap-3">
              <Clock size={16} strokeWidth={1.5} className="text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-danger">分享已过期</p>
                <p className="text-xs text-danger-faint mt-1">
                  此分享链接已于 {new Date(sharedReport.expiresAt).toLocaleString()}{' '}
                  过期，请联系分享者获取新链接
                </p>
              </div>
            </div>
          )}
          {sharedReport.expiresAt && new Date(sharedReport.expiresAt) >= new Date() && (
            <div className="mb-6 p-4 bg-warning-bg/30 border border-warning-faint rounded-xl flex items-start gap-3">
              <Clock size={16} strokeWidth={1.5} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">分享即将过期</p>
                <p className="text-xs text-warning-faint mt-1">
                  此分享链接有效期至 {new Date(sharedReport.expiresAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
          <div className="mb-10">
            <div className="text-[10px] font-mono text-accent tracking-widest uppercase mb-3">
              分析报告
            </div>
            <h2 className="text-2xl font-semibold text-ink mb-4 font-display tracking-tight leading-tight">
              {sharedReport.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint font-mono">
              <span>创建于 {new Date(sharedReport.createdAt).toLocaleString()}</span>
              <span className="text-rule">·</span>
              <span>已被查看 {sharedReport.viewCount} 次</span>
              {sharedReport.expiresAt && (
                <>
                  <span className="text-rule">·</span>
                  <span>有效期至 {new Date(sharedReport.expiresAt).toLocaleString()}</span>
                </>
              )}
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-sm font-semibold text-ink font-display tracking-tight mb-5 pb-2 border-b border-rule">
              风险摘要
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-danger-bg border border-danger-faint rounded-xl text-center">
                <div className="text-2xl font-semibold text-danger font-display tracking-tight">
                  {result.summary.critical}
                </div>
                <div className="text-[11px] text-ink-muted mt-1.5">严重风险</div>
              </div>
              <div className="p-4 bg-warning-bg border border-warning-faint rounded-xl text-center">
                <div className="text-2xl font-semibold text-warning font-display tracking-tight">
                  {result.summary.warning}
                </div>
                <div className="text-[11px] text-ink-muted mt-1.5">待确认</div>
              </div>
              <div className="p-4 bg-success-bg border border-success-faint rounded-xl text-center">
                <div className="text-2xl font-semibold text-success font-display tracking-tight">
                  {result.summary.info}
                </div>
                <div className="text-[11px] text-ink-muted mt-1.5">信息提示</div>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 bg-accent rounded-full"></div>
              <h3 className="text-sm font-semibold text-ink font-display tracking-tight">
                风险详情
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              {result.risks.map((risk, index) => {
                const riskCommentCount = (commentsByRisk[risk.id] || []).length
                return (
                  <div
                    key={risk.id}
                    className={`p-4 rounded-xl border ${
                      risk.level === 'critical'
                        ? 'bg-danger-bg/50 border-danger-faint'
                        : risk.level === 'warning'
                          ? 'bg-warning-bg/50 border-warning-faint'
                          : 'bg-success-bg/50 border-success-faint'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor:
                            risk.level === 'critical'
                              ? 'var(--danger-bg)'
                              : risk.level === 'warning'
                                ? 'var(--warning-bg)'
                                : 'var(--success-bg)',
                        }}
                      >
                        {risk.level === 'critical' ? (
                          <AlertTriangle size={12} strokeWidth={1.5} className="text-danger" />
                        ) : risk.level === 'warning' ? (
                          <Zap size={12} strokeWidth={1.5} className="text-warning" />
                        ) : (
                          <CheckCircle size={12} strokeWidth={1.5} className="text-success" />
                        )}
                      </div>
                      <span className="text-xs font-mono text-ink-faint tracking-wide">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-sm font-medium flex-1 ${
                          risk.level === 'critical'
                            ? 'text-danger'
                            : risk.level === 'warning'
                              ? 'text-warning'
                              : 'text-success'
                        }`}
                      >
                        {risk.title}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveCommentRiskId(activeCommentRiskId === risk.id ? null : risk.id)
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-ink-muted hover:text-accent hover:bg-paper border border-rule/50 transition-colors cursor-pointer"
                        aria-label={`查看风险 ${risk.title} 的评论`}
                        title="查看评论"
                      >
                        <MessageCircle size={11} strokeWidth={1.5} />
                        {riskCommentCount > 0 && (
                          <span className="text-[10px] font-mono">{riskCommentCount}</span>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-ink-muted mb-3 leading-relaxed pl-8.5">
                      {risk.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pl-8.5">
                      {(risk.evidence?.map((e) => e.sourceName) || risk.sources).map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-2 py-0.5 bg-paper border border-rule rounded-full text-ink-muted font-mono"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {result.alignedVersion && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-ink font-display tracking-tight mb-4">
                统一版本参照
              </h3>
              <pre className="text-xs text-ink-muted whitespace-pre-wrap bg-paper-dark p-5 rounded-xl border border-rule font-mono leading-relaxed">
                {result.alignedVersion}
              </pre>
            </div>
          )}

          {result.checklist && result.checklist.length > 0 && (
            <div className="mb-10 p-5 bg-paper-dark rounded-xl border border-rule">
              <h3 className="text-sm font-semibold text-ink font-display tracking-tight mb-4">
                检查清单
              </h3>
              <div className="flex flex-col gap-2">
                {result.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-5 h-5 border border-rule rounded flex items-center justify-center shrink-0 bg-paper"></div>
                    <span className="text-sm text-ink">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.extractedEntities && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-ink font-display tracking-tight mb-5 pb-2 border-b border-rule">
                关键要素提取
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.extractedEntities.dates && result.extractedEntities.dates.length > 0 && (
                  <div className="p-4 bg-paper-dark rounded-xl border border-rule">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={14} strokeWidth={1.5} className="text-accent" />
                      <span className="text-xs font-medium text-ink">时间要素</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {result.extractedEntities.dates.map((t, i) => (
                        <div
                          key={i}
                          className="text-xs text-ink-muted flex items-center justify-between"
                        >
                          <span>{t.value}</span>
                          <span className="text-ink-faint font-mono">{t.source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.extractedEntities.promises &&
                  result.extractedEntities.promises.length > 0 && (
                    <div className="p-4 bg-paper-dark rounded-xl border border-rule">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageCircle size={14} strokeWidth={1.5} className="text-accent" />
                        <span className="text-xs font-medium text-ink">承诺要素</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {result.extractedEntities.promises.map((p, i) => (
                          <div
                            key={i}
                            className="text-xs text-ink-muted flex items-center justify-between"
                          >
                            <span>{p.value}</span>
                            <span className="text-ink-faint font-mono">{p.source}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {result.reasoningTrace && result.reasoningTrace.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-ink font-display tracking-tight mb-5 pb-2 border-b border-rule">
                分析流程
              </h3>
              <div className="relative pl-4">
                <div className="absolute left-[3px] top-0 bottom-0 w-px bg-rule"></div>
                <div className="flex flex-col gap-4">
                  {result.reasoningTrace.map((step, index) => (
                    <div key={index} className="relative flex gap-4">
                      <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-ink flex items-center justify-center shrink-0">
                        <Target size={12} strokeWidth={1.5} className="text-paper" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-ink mb-1">{step.step}</div>
                        <div className="text-xs text-ink-muted">{step.result}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result.riskRelations?.associations && result.riskRelations.associations.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-ink font-display tracking-tight mb-5 pb-2 border-b border-rule">
                风险关联
              </h3>
              <div className="flex flex-col gap-3">
                {result.riskRelations.associations.map((assoc, i) => (
                  <div key={i} className="p-4 bg-paper-dark rounded-xl border border-rule">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-ink">{assoc.sourceName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          assoc.isConflict
                            ? 'bg-danger-bg text-danger'
                            : 'bg-success-bg text-success'
                        }`}
                      >
                        {assoc.isConflict ? '存在冲突' : '无冲突'}
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted">关联风险：{assoc.riskCount} 个</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center py-10 border-t border-rule">
            <div className="text-[10px] font-mono text-ink-faint tracking-widest uppercase mb-2">
              由「有据」生成
            </div>
            <p className="text-sm text-ink-muted mb-6">有据可依，有据可查</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer border border-rule bg-paper text-ink hover:bg-paper-dark transition-colors duration-200"
                onClick={() => (window.location.href = '/')}
              >
                <ArrowLeft size={14} strokeWidth={1.5} />
                返回有据
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent transition-colors duration-200"
                onClick={() => (window.location.href = '/')}
              >
                <Sparkles size={14} strokeWidth={1.5} />
                创建自己的分析
              </button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-10">
          <Loader2 size={32} strokeWidth={1.5} className="text-accent animate-spin mb-5" />
          <p className="text-sm text-ink-muted">正在加载分享内容…</p>
        </div>
      ) : null}

      {activeCommentRiskId && activeRisk && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
          onClick={() => setActiveCommentRiskId(null)}
          role="button"
          tabIndex={-1}
          aria-label="关闭评论侧栏"
        >
          <div
            className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-paper border-l border-rule shadow-2xl flex flex-col animate-[slideInRight_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`风险「${activeRisk.title}」的评论`}
          >
            <div className="px-5 py-4 border-b border-rule flex items-center justify-between shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle size={14} strokeWidth={1.5} className="text-accent shrink-0" />
                  <h3 className="text-sm font-semibold text-ink font-display tracking-tight truncate">
                    评论
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 bg-paper-dark text-ink-faint rounded font-mono shrink-0">
                    {activeComments.length}
                  </span>
                </div>
                <p className="text-[11px] text-ink-faint truncate">{activeRisk.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCommentRiskId(null)}
                className="w-8 h-8 flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper-dark rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="关闭评论"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-4">
                    <MessageCircle size={20} strokeWidth={1.5} className="text-ink-faint" />
                  </div>
                  <p className="text-sm text-ink-muted mb-1">暂无评论</p>
                  <p className="text-xs text-ink-faint">在下方添加第一条评论</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 bg-paper-dark/40 border border-rule/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-ink">{comment.author}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id, comment.riskId)}
                          className="text-[10px] text-ink-faint hover:text-danger transition-colors cursor-pointer"
                          aria-label="删除评论"
                        >
                          删除
                        </button>
                      </div>
                      {comment.evidenceAnchor && (
                        <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-accent-bg text-accent border border-accent/20">
                          <Target size={9} strokeWidth={1.5} />
                          锚点: {comment.evidenceAnchor}
                        </div>
                      )}
                      <p className="text-xs text-ink-muted leading-relaxed">{comment.content}</p>
                      <p className="text-[10px] text-ink-faint mt-1.5 font-mono">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-rule space-y-2.5 shrink-0">
              {activeRiskEvidenceOptions.length > 0 && (
                <div>
                  <label className="block text-[10px] text-ink-faint mb-1.5 font-mono uppercase tracking-wider">
                    锚定证据片段（可选）
                  </label>
                  <select
                    value={selectedEvidence || ''}
                    onChange={(e) => setSelectedEvidence(e.target.value || undefined)}
                    className="w-full px-2.5 py-1.5 text-xs bg-paper border border-rule rounded-md text-ink focus:outline-none focus:border-accent/50"
                  >
                    <option value="">不锚定具体证据</option>
                    {activeRiskEvidenceOptions.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <input
                type="text"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                placeholder="你的名字（可选）"
                className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-md text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddComment()
                    }
                  }}
                  placeholder="添加评论..."
                  className="flex-1 px-3 py-2 text-xs bg-paper border border-rule rounded-md text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentInput.trim()}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium bg-ink text-paper hover:bg-accent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="发送评论"
                >
                  <Send size={12} strokeWidth={1.5} />
                  发送
                </button>
              </div>
              <p className="text-[10px] text-ink-faint text-center">
                评论存储于本地浏览器，仅当前设备可见
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
