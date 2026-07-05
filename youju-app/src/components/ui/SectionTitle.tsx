import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const sectionTitleVariants = cva('', {
  variants: {
    variant: {
      default: 'flex items-end justify-between mb-16',
      centered: 'text-center mb-16 max-w-2xl mx-auto',
      minimal: 'mb-16',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface SectionTitleProps extends VariantProps<typeof sectionTitleVariants> {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'right'
  className?: string
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  variant = 'default',
  className,
}: SectionTitleProps) {
  if (variant === 'centered') {
    return (
      <div className={cn(sectionTitleVariants({ variant }), className)}>
        {eyebrow && (
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-accent">
            {eyebrow}
          </span>
        )}
        <h2 className="mt-4 font-display text-4xl lg:text-5xl font-medium tracking-tight text-balance">
          {title}
        </h2>
        {description && (
          <p className="mt-5 text-sm text-ink-muted leading-relaxed">{description}</p>
        )}
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={cn(sectionTitleVariants({ variant }), className)}>
        <h2 className="font-display text-3xl lg:text-4xl font-medium tracking-tight text-balance">
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-xl text-sm text-ink-muted leading-relaxed">{description}</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn(sectionTitleVariants({ variant }), className)}>
      <div>
        {eyebrow && (
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-accent">
            — {eyebrow}
          </span>
        )}
        <h2 className="mt-4 font-display text-4xl lg:text-5xl font-medium tracking-tight text-balance">
          {title}
        </h2>
      </div>
      {description && (
        <div className="hidden lg:block text-right max-w-xs text-sm text-ink-muted leading-relaxed">
          {description}
        </div>
      )}
    </div>
  )
}

export { sectionTitleVariants }
