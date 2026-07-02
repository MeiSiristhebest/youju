import type { ReactNode } from 'react'

type Variant = 'default' | 'accent' | 'success' | 'warning' | 'danger'

interface TagProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

const variantClasses: Record<Variant, string> = {
  default: 'border-rule text-ink-muted bg-paper',
  accent: 'border-accent text-accent bg-accent-bg',
  success: 'border-success/30 text-success bg-success-bg/60',
  warning: 'border-warning/30 text-warning bg-warning-bg/60',
  danger: 'border-danger/30 text-danger bg-danger-bg/60',
}

export function Tag({ children, variant = 'default', className = '' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-medium font-mono tracking-wider uppercase border rounded-[2px] ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
