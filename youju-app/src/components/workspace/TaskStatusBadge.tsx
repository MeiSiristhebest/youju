import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AnalysisLogEntry, AnalysisTaskStatus } from '../../stores/useAnalysisStore'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

interface TaskStatusBadgeProps {
  status: AnalysisTaskStatus
  progress?: number
  errorMessage?: string | null
  errorTimestamp?: string | null
  errorLogs?: AnalysisLogEntry[]
  onRetry?: () => void
  className?: string
}

const statusConfig: Record<
  AnalysisTaskStatus,
  {
    label: string
    dotColor: string
    dotPulse?: boolean
    textColor: string
    bgColor: string
    borderColor: string
    icon?: React.ReactNode
  }
> = {
  idle: {
    label: '就绪',
    dotColor: 'bg-ink-faint',
    textColor: 'text-ink-muted',
    bgColor: 'bg-paper-dark',
    borderColor: 'border-rule/60',
  },
  analyzing: {
    label: '分析中',
    dotColor: 'bg-success',
    dotPulse: true,
    textColor: 'text-success',
    bgColor: 'bg-success-bg/80',
    borderColor: 'border-success/30',
    icon: <Loader2 size={12} strokeWidth={2} className="animate-spin" />,
  },
  completed: {
    label: '已完成',
    dotColor: 'bg-success',
    textColor: 'text-success',
    bgColor: 'bg-success-bg/80',
    borderColor: 'border-success/30',
    icon: <CheckCircle2 size={12} strokeWidth={2} />,
  },
  failed: {
    label: '失败',
    dotColor: 'bg-danger',
    textColor: 'text-danger',
    bgColor: 'bg-danger-bg/80',
    borderColor: 'border-danger/30',
    icon: <XCircle size={12} strokeWidth={2} />,
  },
  cancelled: {
    label: '已取消',
    dotColor: 'bg-ink-faint',
    textColor: 'text-ink-muted',
    bgColor: 'bg-paper-dark',
    borderColor: 'border-rule/60',
    icon: <AlertCircle size={12} strokeWidth={2} />,
  },
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return isoString
  }
}

function BadgeDisplay({
  status,
  progress,
  className,
  onClick,
}: {
  status: AnalysisTaskStatus
  progress: number
  className?: string
  onClick?: () => void
}) {
  const config = statusConfig[status]
  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-200',
        config.bgColor,
        config.textColor,
        config.borderColor,
        onClick && 'cursor-pointer hover:bg-danger-bg',
        className,
      )}
    >
      {config.icon ? (
        config.icon
      ) : (
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            config.dotColor,
            config.dotPulse && 'animate-pulse',
          )}
        />
      )}
      <span className="whitespace-nowrap">{config.label}</span>
      {status === 'analyzing' && progress > 0 && (
        <span className="font-mono text-[10px] opacity-80">{Math.round(progress)}%</span>
      )}
    </div>
  )
}

export function TaskStatusBadge({
  status,
  progress = 0,
  errorMessage,
  errorTimestamp,
  errorLogs = [],
  onRetry,
  className,
}: TaskStatusBadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const _config = statusConfig[status]

  if (status === 'idle') {
    return null
  }

  if (status !== 'failed' || !errorMessage) {
    return <BadgeDisplay status={status} progress={progress} className={className} />
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger>
        <BadgeDisplay
          status={status}
          progress={progress}
          className={className}
          onClick={() => setPopoverOpen(true)}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="bottom" sideOffset={8}>
        <div className="flex flex-col">
          <div className="px-4 py-3 border-b border-rule/60">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-danger shrink-0" strokeWidth={2} />
              <span className="text-sm font-medium text-ink">分析失败</span>
            </div>
            {errorTimestamp && (
              <p className="text-xs text-ink-muted mt-1 ml-6">时间：{formatTime(errorTimestamp)}</p>
            )}
          </div>

          <div className="px-4 py-3 border-b border-rule/60">
            <p className="text-xs text-ink-muted mb-1.5">错误信息</p>
            <div className="bg-paper-dark rounded-md p-2.5 border border-rule/60">
              <p className="text-xs text-danger font-mono break-words leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>

          {errorLogs.length > 0 && (
            <div className="px-4 py-3 border-b border-rule/60 max-h-40 overflow-y-auto">
              <p className="text-xs text-ink-muted mb-2">最近日志</p>
              <div className="space-y-1.5">
                {errorLogs
                  .slice(-5)
                  .reverse()
                  .map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'text-xs flex gap-2 items-start',
                        log.type === 'error' && 'text-danger',
                        log.type === 'warn' && 'text-warning',
                        log.type === 'info' && 'text-ink-muted',
                      )}
                    >
                      <span className="font-mono shrink-0 opacity-60">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className="break-words">{log.message}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false)
                onRetry?.()
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-danger text-paper hover:bg-danger/90 transition-colors cursor-pointer"
            >
              <Loader2 size={12} strokeWidth={2} />
              重试分析
            </button>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="px-3 py-2 rounded-md text-xs font-medium bg-paper-dark text-ink-muted hover:bg-paper-dark/80 border border-rule/60 transition-colors cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
