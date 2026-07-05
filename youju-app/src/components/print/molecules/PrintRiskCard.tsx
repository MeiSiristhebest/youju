import type { Risk } from '@/types'
import { PrintEvidenceBlock } from '../atoms/PrintEvidenceBlock'
import { PrintRiskBadge } from '../atoms/PrintRiskBadge'
import { KAMI, monoFont, sansFont, serifFont, typeLabel } from '../constants'

interface PrintRiskCardProps {
  risk: Risk
  index: number
  compact?: boolean
}

export function PrintRiskCard({ risk, index, compact = false }: PrintRiskCardProps) {
  const sourceNames = risk.evidence?.map((e) => e.sourceName) || risk.sources

  if (compact) {
    return (
      <div
        style={{
          background: KAMI.ivory,
          border: `0.5pt solid ${KAMI.border}`,
          borderRadius: '6pt',
          padding: '8pt 12pt',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8pt',
            marginBottom: '3pt',
          }}
        >
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontFamily: monoFont,
                fontSize: '8pt',
                color: KAMI.stone,
                marginRight: '5pt',
              }}
            >
              {index + 1}
            </span>
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
          </div>
          <PrintRiskBadge level={risk.level} size="sm" />
        </div>
        <div
          style={{
            fontFamily: sansFont,
            fontSize: '8.5pt',
            lineHeight: 1.45,
            color: KAMI.darkWarm,
          }}
        >
          {risk.description}
        </div>
        {risk.confidence !== undefined && (
          <div
            style={{
              fontFamily: monoFont,
              fontSize: '7.5pt',
              color: KAMI.stone,
              marginTop: '3pt',
            }}
          >
            置信度 {risk.confidence}%
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        background: KAMI.ivory,
        border: `0.5pt solid ${KAMI.border}`,
        borderRadius: '8pt',
        padding: '14pt 18pt',
        marginBottom: '14pt',
        breakInside: 'avoid' as const,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12pt',
          marginBottom: '6pt',
        }}
      >
        <div style={{ flex: 1 }}>
          <span
            style={{ fontFamily: monoFont, fontSize: '9pt', color: KAMI.stone, marginRight: '6pt' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: serifFont,
              fontSize: '13pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
            }}
          >
            {risk.title}
          </span>
        </div>
        <PrintRiskBadge level={risk.level} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10pt',
          marginBottom: '8pt',
          fontFamily: sansFont,
          fontSize: '9pt',
          color: KAMI.stone,
        }}
      >
        <span>{typeLabel(risk.type)}</span>
        {risk.dimension && (
          <>
            <span style={{ color: KAMI.border }}>·</span>
            <span>{risk.dimension}</span>
          </>
        )}
        {risk.confidence !== undefined && (
          <>
            <span style={{ color: KAMI.border }}>·</span>
            <span
              style={{
                fontFamily: monoFont,
                color:
                  risk.confidence >= 80
                    ? KAMI.success
                    : risk.confidence >= 50
                      ? KAMI.warning
                      : KAMI.danger,
              }}
            >
              置信度 {risk.confidence}%
            </span>
          </>
        )}
      </div>

      <div
        style={{
          fontFamily: sansFont,
          fontSize: '10pt',
          lineHeight: 1.55,
          color: KAMI.darkWarm,
          marginBottom: '8pt',
        }}
      >
        {risk.description}
      </div>

      {risk.evidence && risk.evidence.length > 0 && (
        <div style={{ marginTop: '8pt' }}>
          <div
            style={{
              fontFamily: sansFont,
              fontSize: '8.5pt',
              fontWeight: 600,
              color: KAMI.brand,
              letterSpacing: '0.3pt',
              textTransform: 'uppercase',
              marginBottom: '5pt',
            }}
          >
            证据来源
          </div>
          {risk.evidence.map((ev, i) => (
            <PrintEvidenceBlock key={i} sourceName={ev.sourceName} quote={ev.quote} />
          ))}
        </div>
      )}

      {sourceNames.length > 0 && (
        <div
          style={{ marginTop: '6pt', fontFamily: sansFont, fontSize: '8.5pt', color: KAMI.stone }}
        >
          涉及材料：{sourceNames.join('、')}
        </div>
      )}
    </div>
  )
}
