import { Check, Clock, Copy, Eye, Link2 } from 'lucide-react'
import { useState } from 'react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareLink: string
  shareExpired: string
  onCopy: () => void
  copied: boolean
  creatingShare: boolean
  viewCount?: number
  isShared?: boolean
  onExpiryChange?: (days: number | null) => void
  selectedExpiry?: number | null
}

const EXPIRY_OPTIONS = [
  { value: 1, label: '1 天' },
  { value: 7, label: '7 天' },
  { value: null, label: '永久有效' },
]

export function ShareModal({
  isOpen,
  onClose,
  shareLink,
  shareExpired,
  onCopy,
  copied,
  creatingShare,
  viewCount = 0,
  isShared = false,
  onExpiryChange,
  selectedExpiry = 7,
}: ShareModalProps) {
  const [localExpiry, setLocalExpiry] = useState<number | null>(selectedExpiry)

  if (!isOpen) return null

  const handleExpiryChange = (days: number | null) => {
    setLocalExpiry(days)
    if (onExpiryChange) {
      onExpiryChange(days)
    }
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
      <div className="bg-paper border border-rule rounded-xl p-8 w-[480px] shadow-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-accent-bg rounded-xl mx-auto mb-4 flex items-center justify-center text-accent">
            <Link2 size={24} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-2 font-display tracking-tight">
            分享报告
          </h2>
          <p className="text-sm text-ink-faint">将报告分享给相关方查看</p>
        </div>

        {isShared && (
          <div className="mb-6 p-3 bg-success-bg/50 border border-success/20 rounded-lg flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-success-bg text-success flex items-center justify-center shrink-0">
              <Check size={12} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-success">已分享</div>
              <div className="flex items-center gap-3 text-[11px] text-ink-faint mt-0.5">
                <span className="flex items-center gap-1">
                  <Eye size={11} strokeWidth={1.5} />
                  {viewCount} 次访问
                </span>
                {shareExpired && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} strokeWidth={1.5} />
                    有效期至 {shareExpired}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label
            htmlFor="share-link"
            className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase"
          >
            分享链接
          </label>
          <div className="flex gap-2">
            <input
              id="share-link"
              type="text"
              className="flex-1 px-3.5 py-2.5 bg-paper border border-rule rounded-lg text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors duration-200"
              value={shareLink}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
              placeholder={creatingShare ? '生成中…' : ''}
            />
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onCopy}
              disabled={!shareLink || creatingShare}
            >
              {copied ? (
                <Check size={15} strokeWidth={1.5} />
              ) : (
                <Copy size={15} strokeWidth={1.5} />
              )}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>

        {onExpiryChange && (
          <div className="mb-6">
            <label className="block text-xs text-ink-faint mb-2.5 font-medium font-mono tracking-wide uppercase">
              有效期
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPIRY_OPTIONS.map((option) => (
                <button
                  key={option.value ?? 'permanent'}
                  type="button"
                  onClick={() => handleExpiryChange(option.value)}
                  className={
                    'px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border ' +
                    (localExpiry === option.value
                      ? 'bg-accent-bg border-accent/30 text-accent'
                      : 'bg-paper-dark/60 border-rule/60 text-ink-muted hover:bg-paper-dark hover:text-ink')
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {shareExpired && !onExpiryChange && (
          <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-paper-dark rounded-lg border border-rule">
            <Clock size={14} strokeWidth={1.5} className="text-ink-faint shrink-0" />
            <span className="text-sm text-ink-faint">有效期至：</span>
            <span className="text-sm text-ink font-medium">{shareExpired}</span>
          </div>
        )}

        <div className="text-center text-xs text-ink-faint mb-4">
          分享页面为只读模式，接收方无法编辑
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer border bg-paper-dark/60 text-ink-muted border-rule hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
