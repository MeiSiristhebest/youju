import { Check, Copy, RefreshCw, Sparkles, ThumbsUp, X } from 'lucide-react'
import { useState } from 'react'

interface DraftModalProps {
  isOpen: boolean
  onClose: () => void
  draftText: string
  generating: boolean
  riskTitle: string
  onRegenerate: () => void
  onAdopt: (text: string) => void
}

export function DraftModal({
  isOpen,
  onClose,
  draftText,
  generating,
  riskTitle,
  onRegenerate,
  onAdopt,
}: DraftModalProps) {
  const [copied, setCopied] = useState(false)
  const [adopted, setAdopted] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAdopt = () => {
    onAdopt(draftText)
    setAdopted(true)
    setTimeout(() => setAdopted(false), 2000)
  }

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-paper border border-rule rounded-xl w-[560px] max-h-[80vh] flex flex-col shadow-xl">
        <div className="px-5 py-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-bg flex items-center justify-center text-accent">
              <Sparkles size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink font-display tracking-tight">
                沟通话术
              </h3>
              <p className="text-[11px] text-ink-faint">关于「{riskTitle}」的确认</p>
            </div>
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mb-4 animate-pulse">
                <Sparkles size={20} strokeWidth={1.5} className="text-accent" />
              </div>
              <p className="text-sm font-medium text-ink mb-1">正在生成话术…</p>
              <p className="text-xs text-ink-faint">AI 正在根据风险内容生成沟通话术</p>
            </div>
          ) : (
            <div className="bg-paper-dark/40 border border-rule rounded-lg p-4">
              <pre className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans">
                {draftText}
              </pre>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-rule flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-ink-muted bg-paper-dark/60 border border-rule/60 hover:bg-paper-dark hover:text-ink cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onRegenerate}
            disabled={generating}
          >
            <RefreshCw size={13} strokeWidth={1.5} />
            重新生成
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-ink-muted bg-paper-dark/60 border border-rule/60 hover:bg-paper-dark hover:text-ink cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCopy}
              disabled={generating || !draftText}
            >
              {copied ? (
                <Check size={13} strokeWidth={1.5} />
              ) : (
                <Copy size={13} strokeWidth={1.5} />
              )}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-ink text-paper border-none hover:bg-accent cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAdopt}
              disabled={generating || !draftText}
            >
              {adopted ? (
                <Check size={13} strokeWidth={1.5} />
              ) : (
                <ThumbsUp size={13} strokeWidth={1.5} />
              )}
              {adopted ? '已采纳' : '采纳'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
