interface SectionTitleProps {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'right'
  variant?: 'default' | 'centered' | 'minimal'
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = 'left',
  variant = 'default',
}: SectionTitleProps) {
  if (variant === 'centered') {
    return (
      <div className="text-center mb-16 max-w-2xl mx-auto">
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
      <div className="mb-16">
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
    <div className={`flex items-end justify-between mb-16 ${align === 'right' ? '' : ''}`}>
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
