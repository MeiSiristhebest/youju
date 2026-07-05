import { cva, type VariantProps } from 'class-variance-authority'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const confidenceBarVariants = cva('bg-paper-dark rounded-full overflow-hidden relative', {
  variants: {
    size: {
      sm: 'w-20 h-1.5',
      md: 'w-28 h-1.5',
      lg: 'w-32 h-2',
    },
    fullWidth: {
      true: 'flex-1 h-2',
      false: '',
    },
  },
  defaultVariants: {
    size: 'md',
    fullWidth: false,
  },
})

const labelVariants = cva('font-mono font-medium', {
  variants: {
    size: {
      sm: 'text-[10px]',
      md: 'text-xs',
      lg: 'text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

const badgeVariants = cva('px-1.5 py-0.5 rounded', {
  variants: {
    size: {
      sm: 'text-[9px]',
      md: 'text-[10px]',
      lg: 'text-xs',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

interface ConfidenceBarProps extends VariantProps<typeof confidenceBarVariants> {
  confidence: number
  showLabel?: boolean
  animated?: boolean
}

export function ConfidenceBar({
  confidence,
  size = 'md',
  showLabel = true,
  animated = true,
  fullWidth = false,
}: ConfidenceBarProps) {
  const [displayPct, setDisplayPct] = useState(0)
  const pct = Math.max(0, Math.min(100, confidence))

  useEffect(() => {
    if (!animated) {
      setDisplayPct(pct)
      return
    }
    setDisplayPct(0)
    const timer = setTimeout(() => {
      setDisplayPct(pct)
    }, 100)
    return () => clearTimeout(timer)
  }, [pct, animated])

  const getLevel = () => {
    if (pct >= 80) return { text: '高', color: 'var(--success)', bgClass: 'bg-success-bg' }
    if (pct >= 50) return { text: '中', color: 'var(--warning)', bgClass: 'bg-warning-bg' }
    return { text: '低', color: 'var(--danger)', bgClass: 'bg-danger-bg' }
  }

  const getGradient = () => {
    if (pct >= 80) {
      return 'linear-gradient(90deg, var(--success-faint), var(--success))'
    }
    if (pct >= 50) {
      return 'linear-gradient(90deg, var(--warning-faint), var(--warning))'
    }
    return 'linear-gradient(90deg, var(--danger-faint), var(--danger))'
  }

  const level = getLevel()
  const gradient = getGradient()

  return (
    <div className={cn('flex items-center gap-2', fullWidth && 'w-full')}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(displayPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="置信度"
        className={cn(confidenceBarVariants({ size, fullWidth }))}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out relative overflow-hidden"
          style={{ width: `${displayPct}%`, background: gradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
        </div>
        {displayPct > 0 && displayPct < 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-md animate-pulse"
            style={{ left: `calc(${displayPct}% - 4px)` }}
          />
        )}
      </div>
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <span className={cn(labelVariants({ size }))} style={{ color: level.color }}>
            {Math.round(displayPct)}%
          </span>
          <span
            className={cn(badgeVariants({ size }), level.bgClass)}
            style={{ color: level.color }}
          >
            {level.text}
          </span>
        </div>
      )}
    </div>
  )
}

export { confidenceBarVariants }
