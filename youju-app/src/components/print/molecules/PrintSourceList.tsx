import type { Source } from '@/types'
import { KAMI, sansFont } from '../constants'

interface PrintSourceListProps {
  sources: Source[]
  variant?: 'tag' | 'numbered' | 'compact'
}

export function PrintSourceList({ sources, variant = 'tag' }: PrintSourceListProps) {
  if (!sources || sources.length === 0) return null

  if (variant === 'tag') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6pt' }}>
        {sources.map((s, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              background: KAMI.tagBg,
              color: KAMI.brand,
              fontFamily: sansFont,
              fontSize: '9pt',
              fontWeight: 500,
              padding: '2pt 8pt',
              borderRadius: '3pt',
              marginBottom: '3pt',
            }}
          >
            {s.name}
            {s.meta ? ` · ${s.meta}` : ''}
          </span>
        ))}
      </div>
    )
  }

  if (variant === 'numbered') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5pt' }}>
        {sources.map((s, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              background: KAMI.ivory,
              border: `0.5pt solid ${KAMI.border}`,
              color: KAMI.darkWarm,
              fontFamily: sansFont,
              fontSize: '8.5pt',
              padding: '3pt 9pt',
              borderRadius: '4pt',
            }}
          >
            {i + 1}. {s.name}
            {s.meta && typeof s.meta === 'string' && (
              <span style={{ color: KAMI.stone }}> · {s.meta}</span>
            )}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4pt' }}>
      {sources.map((s, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            background: KAMI.tagBg,
            color: KAMI.brand,
            fontFamily: sansFont,
            fontSize: '8pt',
            fontWeight: 500,
            padding: '1.5pt 7pt',
            borderRadius: '3pt',
          }}
        >
          {s.name}
        </span>
      ))}
    </div>
  )
}
