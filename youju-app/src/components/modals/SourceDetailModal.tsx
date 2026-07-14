import { useGSAP } from '@gsap/react'
import {
  Calendar,
  Check,
  CheckCheck,
  Copy,
  Edit3,
  File,
  FileText,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { TYPE_LABELS } from '../../constants/workspace'
import { useTranslation } from '../../i18n'
import { gsap } from '../../lib/gsap'
import type { Source, SourceType } from '../../types'

interface SourceDetailModalProps {
  source: Source | null
  onClose: () => void
  onEdit?: (source: Source) => void
  onReparse?: (id: string) => void
  onDelete?: (id: string) => void
  highlightText?: string
}

export function SourceDetailModal({
  source,
  onClose,
  onEdit,
  onReparse,
  onDelete,
  highlightText,
}: SourceDetailModalProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (source) {
      setIsEditing(false)
      setEditContent(source.content)
    }
  }, [source?.id])

  const findMatchText = (content: string, query: string): string | null => {
    if (!query || !content) return null
    if (content.includes(query)) return query

    const findFuzzyMatch = (text: string, pattern: string): [number, number] | null => {
      const isSpaceLike = (ch: string) => /\s/.test(ch)
      const n = text.length
      const m = pattern.length
      if (m === 0 || n < m) return null

      for (let i = 0; i <= n - m; i++) {
        let ti = i
        let pi = 0
        while (pi < m && ti < n) {
          const tChar = text[ti]
          const pChar = pattern[pi]
          if (tChar === pChar) {
            ti++
            pi++
          } else if (isSpaceLike(tChar) && isSpaceLike(pChar)) {
            ti++
            pi++
          } else if (isSpaceLike(tChar)) {
            ti++
          } else if (isSpaceLike(pChar)) {
            pi++
          } else {
            break
          }
        }
        if (pi === m) {
          return [i, ti]
        }
      }
      return null
    }

    const fullMatch = findFuzzyMatch(content, query)
    if (fullMatch) {
      return content.substring(fullMatch[0], fullMatch[1])
    }

    const shortQuery = query.trim().substring(0, Math.min(30, query.trim().length))
    if (shortQuery) {
      const shortMatch = findFuzzyMatch(content, shortQuery)
      if (shortMatch) {
        return content.substring(shortMatch[0], shortMatch[1])
      }
    }

    return null
  }

  const matchText = highlightText && source ? findMatchText(source.content, highlightText) : null

  useEffect(() => {
    if (matchText && contentRef.current) {
      const markElement = contentRef.current.querySelector('mark')
      if (markElement) {
        setTimeout(() => {
          markElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          markElement.classList.add('animate-pulse')
          setTimeout(() => markElement.classList.remove('animate-pulse'), 2000)
        }, 100)
      }
    }
  }, [matchText, source?.id])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  useGSAP(
    () => {
      if (!source) return

      const isMobile = window.matchMedia('(max-width: 768px)').matches
      if (isMobile) return

      gsap.fromTo(
        modalRef.current,
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.4)' },
      )

      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' },
      )
    },
    { scope: overlayRef, dependencies: [source?.id] },
  )

  if (!source) return null

  const summary = source.parsedSummary

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(source.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit({ ...source, content: editContent })
    }
    setIsEditing(false)
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 md:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-detail-title"
    >
      <div
        ref={modalRef}
        className="bg-paper border border-rule rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl"
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-accent-bg border border-accent-faint flex items-center justify-center shrink-0">
              <FileText size={20} className="text-accent" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="source-detail-title"
                className="text-base font-semibold text-ink font-display tracking-tight truncate"
              >
                {source.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-ink-faint">
                  {TYPE_LABELS[source.type as SourceType]}
                </span>
                <span className="text-ink-faint/40">·</span>
                <span className="text-xs text-ink-faint">{source.content.length} 字</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-ink-muted bg-paper-dark border border-rule/60 hover:text-ink hover:border-ink-faint transition-colors"
              title="复制全文"
            >
              {copied ? (
                <CheckCheck size={14} className="text-success" strokeWidth={1.5} />
              ) : (
                <Copy size={14} strokeWidth={1.5} />
              )}
              <span className="hidden sm:inline">{copied ? '已复制' : '复制'}</span>
            </button>

            {onReparse && (
              <button
                type="button"
                onClick={() => onReparse(source.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-ink-muted bg-paper-dark border border-rule/60 hover:text-ink hover:border-ink-faint transition-colors"
                title="重新解析"
              >
                <RefreshCw size={14} strokeWidth={1.5} />
                <span className="hidden sm:inline">重新解析</span>
              </button>
            )}

            {isEditing ? (
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-success bg-success-bg border border-success/30 hover:bg-success-bg/80 transition-colors"
              >
                <Check size={14} strokeWidth={2} />
                <span className="hidden sm:inline">保存</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-ink-muted bg-paper-dark border border-rule/60 hover:text-ink hover:border-ink-faint transition-colors"
              >
                <Edit3 size={14} strokeWidth={1.5} />
                <span className="hidden sm:inline">编辑</span>
              </button>
            )}

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

        {/* AI 解析摘要 */}
        {summary && (
          <div className="px-6 py-4 border-b border-rule bg-paper-dark/30 shrink-0">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={14} className="text-accent" strokeWidth={1.5} />
              <span className="text-xs font-medium text-accent">AI 解析摘要</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-start gap-2">
                <File size={13} className="text-ink-faint mt-0.5 shrink-0" strokeWidth={1.5} />
                <div className="text-xs text-ink-muted">
                  <span className="text-ink-faint">文档类型：</span>
                  <span className="text-ink">{summary.docType}</span>
                </div>
              </div>
              {summary.parties.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users size={13} className="text-ink-faint mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div className="text-xs text-ink-muted">
                    <span className="text-ink-faint">涉及方：</span>
                    <span className="text-ink">{summary.parties.join('、')}</span>
                  </div>
                </div>
              )}
              {summary.keyDates.length > 0 && (
                <div className="flex items-start gap-2">
                  <Calendar
                    size={13}
                    className="text-ink-faint mt-0.5 shrink-0"
                    strokeWidth={1.5}
                  />
                  <div className="text-xs text-ink-muted">
                    <span className="text-ink-faint">关键日期：</span>
                    <span className="text-ink">{summary.keyDates.join('、')}</span>
                  </div>
                </div>
              )}
            </div>
            {summary.summary && (
              <p className="text-xs text-ink-muted leading-relaxed mt-3 pt-3 border-t border-rule/40">
                {summary.summary}
              </p>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden min-h-0">
          {isEditing ? (
            <textarea
              ref={(el) => {
                if (el) el.focus()
              }}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full px-6 py-5 text-base text-ink leading-relaxed resize-none focus:outline-none font-body bg-paper"
              placeholder="编辑材料内容..."
            />
          ) : (
            <div className="w-full h-full overflow-y-auto px-6 py-5">
              <div
                ref={contentRef}
                className="max-w-none text-base text-ink-muted leading-relaxed whitespace-pre-wrap font-body"
              >
                {matchText
                  ? source.content
                      .split(matchText)
                      .map((part: string, i: number, arr: string[]) => (
                        <span key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <mark className="bg-accent/30 text-accent px-0.5 rounded font-medium">
                              {matchText}
                            </mark>
                          )}
                        </span>
                      ))
                  : source.content}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
