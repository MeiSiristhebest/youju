import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Check, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '../../types'

const riskBadgeVariants = cva(
  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
  {
    variants: {
      level: {
        critical: 'bg-danger-bg text-danger border-danger/30',
        warning: 'bg-warning-bg text-warning border-warning/30',
        info: 'bg-success-bg text-success border-success/30',
      },
    },
    defaultVariants: {
      level: 'info',
    },
  },
)

const shapeVariants = cva('inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm', {
  variants: {
    level: {
      critical: 'bg-danger/15',
      warning: 'bg-warning/15',
      info: 'bg-success/15',
    },
  },
  defaultVariants: {
    level: 'info',
  },
})

const RISK_ICONS: Record<RiskLevel, LucideIcon> = {
  critical: AlertTriangle,
  warning: Zap,
  info: Check,
}

const RISK_LABELS: Record<RiskLevel, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
}

const RISK_ARIA_PREFIX: Record<RiskLevel, string> = {
  critical: '严重风险',
  warning: '警告风险',
  info: '提示信息',
}

interface RiskBadgeProps extends VariantProps<typeof riskBadgeVariants> {
  level: RiskLevel
  title?: string
  showLabel?: boolean
  className?: string
  children?: ReactNode
}

export function RiskBadge({ level, title, showLabel = true, className, children }: RiskBadgeProps) {
  const Icon = RISK_ICONS[level]
  const label = RISK_LABELS[level]
  const ariaPrefix = RISK_ARIA_PREFIX[level]

  const ariaLabel = title ? `${ariaPrefix}：${title}` : ariaPrefix

  return (
    <span role="img" aria-label={ariaLabel} className={cn(riskBadgeVariants({ level }), className)}>
      <span className={cn(shapeVariants({ level }))} aria-hidden="true">
        <Icon size={12} strokeWidth={2} />
      </span>
      {showLabel && <span aria-hidden="true">{label}</span>}
      {children}
    </span>
  )
}

export { RISK_ARIA_PREFIX, RISK_ICONS, RISK_LABELS, riskBadgeVariants, shapeVariants }
