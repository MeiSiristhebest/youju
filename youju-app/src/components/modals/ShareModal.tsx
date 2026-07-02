import { Check, Copy, Link2 } from 'lucide-react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareLink: string
  shareExpired: string
  onCopy: () => void
  copied: boolean
  creatingShare: boolean
}

export function ShareModal({
  isOpen,
  onClose,
  shareLink,
  shareExpired,
  onCopy,
  copied,
  creatingShare,
}: ShareModalProps) {
  if (!isOpen) return null

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

        {shareExpired && (
          <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-paper-dark rounded-lg border border-rule">
            <span className="text-sm text-ink-faint">有效期至：</span>
            <span className="text-sm text-ink font-medium">{shareExpired}</span>
          </div>
        )}

        <div className="text-center text-xs text-ink-faint mb-4">
          分享链接有效期为 7 天，过期后自动失效
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
