import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const tagVariants = cva(
  'inline-flex items-center text-[11px] font-medium font-mono tracking-wider uppercase border rounded-[2px]',
  {
    variants: {
      variant: {
        default: 'border-rule text-ink-muted bg-paper',
        accent: 'border-accent text-accent bg-accent-bg',
        success: 'border-success/30 text-success bg-success-bg/60',
        warning: 'border-warning/30 text-warning bg-warning-bg/60',
        danger: 'border-danger/30 text-danger bg-danger-bg/60',
      },
      size: {
        default: 'px-2.5 py-1',
        sm: 'px-2 py-0.5 text-[10px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface TagProps extends VariantProps<typeof tagVariants> {
  children: ReactNode
  className?: string
}

export function Tag({ children, variant, size, className }: TagProps) {
  return <span className={cn(tagVariants({ variant, size }), className)}>{children}</span>
}

export { tagVariants }
