import { useEffect, useState } from 'react'

interface ConfidenceBarProps {
  confidence: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
}

export function ConfidenceBar({
  confidence,
  size = 'md',
  showLabel = true,
  animated = true,
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
  const isSmall = size === 'sm'
  const isLarge = size === 'lg'

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${
          isSmall ? 'w-16 h-1.5' : isLarge ? 'w-32 h-2' : 'w-24 h-1.5'
        } bg-paper-dark rounded-full overflow-hidden relative`}
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
          <span
            className={`${isSmall ? 'text-[10px]' : isLarge ? 'text-sm' : 'text-xs'} font-mono font-medium`}
            style={{ color: level.color }}
          >
            {Math.round(displayPct)}%
          </span>
          <span
            className={`${isSmall ? 'text-[9px]' : isLarge ? 'text-xs' : 'text-[10px]'} px-1.5 py-0.5 rounded ${level.bgClass}`}
            style={{ color: level.color }}
          >
            {level.text}
          </span>
        </div>
      )}
    </div>
  )
}
