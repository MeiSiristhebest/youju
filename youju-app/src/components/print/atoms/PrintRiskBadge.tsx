import type { RiskLevel } from '@/types'
import { KAMI, levelLabel } from '../constants'

interface PrintRiskBadgeProps {
  level: RiskLevel
  size?: 'sm' | 'md'
}

export function PrintRiskBadge({ level, size = 'md' }: PrintRiskBadgeProps) {
  const isCritical = level === 'critical'
  const isWarning = level === 'warning'

  const color = isCritical ? KAMI.danger : isWarning ? KAMI.warning : KAMI.success
  const bg = isCritical ? KAMI.dangerBg : isWarning ? KAMI.warningBg : KAMI.successBg

  const fontSize = size === 'sm' ? '7.5pt' : '8.5pt'
  const padding = size === 'sm' ? '1pt 6pt' : '1.5pt 8pt'
  const borderRadius = size === 'sm' ? '2pt' : '3pt'

  return (
    <span
      style={{
        fontSize,
        fontWeight: 600,
        color,
        background: bg,
        padding,
        borderRadius,
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
        display: 'inline-block',
      }}
    >
      {levelLabel(level)}
    </span>
  )
}
