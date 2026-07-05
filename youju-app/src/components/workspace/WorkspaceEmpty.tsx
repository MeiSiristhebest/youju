import { CloudUpload, Info, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MagneticButton } from '../ui/MagneticButton'

interface WorkspaceEmptyProps {
  type: 'sources' | 'risk' | 'context' | 'result'
  onAction?: () => void
  actionLabel?: string
  title?: string
  description?: string
  learnMoreUrl?: string
  className?: string
}

interface EmptyStateConfig {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  learnMore?: boolean
}

const emptyStateConfigs: Record<WorkspaceEmptyProps['type'], EmptyStateConfig> = {
  sources: {
    icon: <CloudUpload size={48} strokeWidth={1.2} />,
    title: '上传你的第一份材料',
    description: '支持文本粘贴、文件上传、URL 抓取',
    actionLabel: '上传材料',
    learnMore: true,
  },
  risk: {
    icon: <ShieldCheck size={48} strokeWidth={1.2} />,
    title: '暂无待处理风险',
    description: '运行分析后，风险将显示在这里',
    actionLabel: '开始分析',
    learnMore: true,
  },
  context: {
    icon: <Info size={48} strokeWidth={1.2} />,
    title: '选择左侧风险查看详情',
    description: '点击任意风险条目，这里将显示详细信息和证据',
  },
  result: {
    icon: <Sparkles size={48} strokeWidth={1.2} />,
    title: '创建你的第一次分析',
    description: '选择场景并上传材料，AI 将为你交叉验证并发现风险',
    actionLabel: '新建分析',
    learnMore: true,
  },
}

export function WorkspaceEmpty({
  type,
  onAction,
  actionLabel,
  title,
  description,
  learnMoreUrl,
  className,
}: WorkspaceEmptyProps) {
  const config = emptyStateConfigs[type]

  const displayTitle = title ?? config.title
  const displayDescription = description ?? config.description
  const displayActionLabel = actionLabel ?? config.actionLabel
  const showLearnMore = config.learnMore !== false

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-10 w-full',
        className,
      )}
    >
      <div className="w-16 h-16 mb-5 rounded-2xl bg-paper-dark border border-rule/60 flex items-center justify-center text-ink-muted transition-all duration-300 group-hover:scale-105">
        {config.icon}
      </div>

      <h3 className="text-lg font-display font-medium text-ink tracking-tight mb-2">
        {displayTitle}
      </h3>

      <p className="text-sm text-ink-muted leading-relaxed max-w-xs mb-6">{displayDescription}</p>

      {displayActionLabel && onAction && (
        <MagneticButton
          variant="primary"
          size="md"
          onClick={onAction}
          className="rounded-full px-5 py-2.5 h-auto hover:bg-accent hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98]"
          strength={0.4}
          radius={120}
        >
          {displayActionLabel}
        </MagneticButton>
      )}

      {showLearnMore && learnMoreUrl && (
        <a
          href={learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-sm text-accent underline underline-offset-4 hover:opacity-80 transition-opacity duration-200"
        >
          了解更多
        </a>
      )}
    </div>
  )
}
