import type { Risk } from '@/types'
import { KAMI, monoFont, sansFont, serifFont } from '../constants'

interface PrintRiskSectionProps {
  title: string
  risks: Risk[]
  variant?: 'numbered' | 'simple'
  maxItems?: number
}

export function PrintRiskSection({
  title,
  risks,
  variant = 'numbered',
  maxItems,
}: PrintRiskSectionProps) {
  if (!risks || risks.length === 0) return null

  const displayRisks = maxItems ? risks.slice(0, maxItems) : risks

  return (
    <div style={{ marginBottom: '14pt' }}>
      <div
        style={{
          fontFamily: sansFont,
          fontSize: '9.5pt',
          fontWeight: 600,
          color: KAMI.darkWarm,
          marginBottom: '6pt',
        }}
      >
        {title}
      </div>
      {variant === 'numbered'
        ? displayRisks.map((risk, i) => (
            <div
              key={risk.id}
              style={{ display: 'flex', gap: '10pt', marginBottom: '6pt', paddingLeft: '6pt' }}
            >
              <span
                style={{
                  fontFamily: monoFont,
                  fontSize: '8.5pt',
                  color:
                    risk.level === 'critical'
                      ? KAMI.danger
                      : risk.level === 'warning'
                        ? KAMI.warning
                        : KAMI.success,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <span
                  style={{
                    fontFamily: serifFont,
                    fontSize: '10.5pt',
                    fontWeight: 500,
                    color: KAMI.nearBlack,
                  }}
                >
                  {risk.title}
                </span>
                <div
                  style={{
                    fontFamily: sansFont,
                    fontSize: '8.5pt',
                    color: KAMI.olive,
                    marginTop: '2pt',
                    lineHeight: 1.45,
                  }}
                >
                  {risk.description.slice(0, 80)}...
                </div>
              </div>
            </div>
          ))
        : displayRisks.map((risk, i) => (
            <div
              key={risk.id}
              style={{ display: 'flex', gap: '10pt', marginBottom: '5pt', paddingLeft: '6pt' }}
            >
              <span
                style={{
                  fontFamily: monoFont,
                  fontSize: '8.5pt',
                  color:
                    risk.level === 'critical'
                      ? KAMI.danger
                      : risk.level === 'warning'
                        ? KAMI.warning
                        : KAMI.success,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: sansFont, fontSize: '9.5pt', color: KAMI.darkWarm }}>
                {risk.title}
              </span>
            </div>
          ))}
    </div>
  )
}
