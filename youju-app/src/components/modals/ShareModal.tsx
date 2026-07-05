import { Check, Clock, Copy, Eye, Link2, MessageSquare, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { SharePermission } from '../../types'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

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
  onPermissionChange?: (permission: SharePermission) => void
  selectedPermission?: SharePermission
}

const EXPIRY_OPTIONS = [
  { value: 1, label: '1 天' },
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: null, label: '永久有效' },
]

const PERMISSION_OPTIONS: {
  value: SharePermission
  label: string
  description: string
  icon: typeof Eye
}[] = [
  { value: 'view', label: '查看', description: '仅可查看报告', icon: Eye },
  { value: 'comment', label: '评论', description: '可查看并添加评论', icon: MessageSquare },
  { value: 'edit', label: '编辑', description: '可查看、评论和编辑', icon: Pencil },
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
  onPermissionChange,
  selectedPermission = 'view',
}: ShareModalProps) {
  const [localExpiry, setLocalExpiry] = useState<number | null>(selectedExpiry)
  const [localPermission, setLocalPermission] = useState<SharePermission>(selectedPermission)

  const handleExpiryChange = (days: number | null) => {
    setLocalExpiry(days)
    if (onExpiryChange) {
      onExpiryChange(days)
    }
  }

  const handlePermissionChange = (permission: SharePermission) => {
    setLocalPermission(permission)
    if (onPermissionChange) {
      onPermissionChange(permission)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-center mb-2">
          <div className="w-16 h-16 bg-accent-bg rounded-xl mx-auto mb-4 flex items-center justify-center text-accent">
            <Link2 size={24} strokeWidth={1.5} />
          </div>
          <DialogTitle className="text-xl font-semibold text-ink font-display tracking-tight">
            分享报告
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-faint">
            将报告分享给相关方查看
          </DialogDescription>
        </DialogHeader>

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
            <Button
              type="button"
              variant="default"
              onClick={onCopy}
              disabled={!shareLink || creatingShare}
              data-icon="inline-start"
            >
              {copied ? (
                <Check size={15} strokeWidth={1.5} />
              ) : (
                <Copy size={15} strokeWidth={1.5} />
              )}
              {copied ? '已复制' : '复制'}
            </Button>
          </div>
        </div>

        {onExpiryChange && (
          <div className="mb-6">
            <label className="block text-xs text-ink-faint mb-2.5 font-medium font-mono tracking-wide uppercase">
              有效期
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EXPIRY_OPTIONS.map((option) => (
                <button
                  key={option.value ?? 'permanent'}
                  type="button"
                  onClick={() => handleExpiryChange(option.value)}
                  className={
                    'px-2 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border ' +
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

        {onPermissionChange && (
          <div className="mb-6">
            <label className="block text-xs text-ink-faint mb-2.5 font-medium font-mono tracking-wide uppercase">
              权限
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PERMISSION_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handlePermissionChange(option.value)}
                    title={option.description}
                    className={
                      'flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border ' +
                      (localPermission === option.value
                        ? 'bg-accent-bg border-accent/30 text-accent'
                        : 'bg-paper-dark/60 border-rule/60 text-ink-muted hover:bg-paper-dark hover:text-ink')
                    }
                  >
                    <Icon size={16} strokeWidth={1.5} />
                    {option.label}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-ink-faint mt-2">
              {PERMISSION_OPTIONS.find((o) => o.value === localPermission)?.description}
            </p>
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
          {localPermission === 'view'
            ? '分享页面为只读模式，接收方无法编辑'
            : localPermission === 'comment'
              ? '接收方可在风险条目旁添加评论'
              : '接收方拥有完整编辑权限，请谨慎分享'}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
