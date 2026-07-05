import { KAMI, sansFont, serifFont } from '../constants'

interface SummaryItem {
  label: string
  count: number
  color: string
  bg: string
}

interface PrintReportSummaryProps {
  items: SummaryItem[]
  variant?: 'standard' | 'one-pager' | 'equity' | 'brief'
  title?: string
}

export function PrintReportSummary({
  items,
  variant = 'standard',
  title,
}: PrintReportSummaryProps) {
  if (variant === 'brief') {
    return (
      <div style={{ marginBottom: '20pt', display: 'flex', gap: '10pt' }}>
        {items.map((item, i) => (
          <div
            key={item.label}
            style={{
              flex: 1,
              background: i === 0 ? (item.count > 0 ? item.bg : KAMI.successBg) : item.bg,
              borderRadius: '6pt',
              padding: '12pt 14pt',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '8pt',
                color: i === 0 ? (item.count > 0 ? item.color : KAMI.success) : item.color,
                fontWeight: 600,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontFamily: serifFont,
                fontSize: '24pt',
                fontWeight: 500,
                color: i === 0 ? (item.count > 0 ? item.color : KAMI.success) : item.color,
                lineHeight: 1.1,
                marginTop: '4pt',
              }}
            >
              {item.count}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const padding = variant === 'one-pager' ? '10pt 12pt' : '12pt 14pt'
  const fontSize = variant === 'one-pager' ? '20pt' : '24pt'
  const borderRadius = variant === 'one-pager' ? '6pt' : '8pt'
  const gap = variant === 'one-pager' ? '10pt' : '12pt'

  return (
    <div style={{ marginBottom: variant === 'equity' ? '0' : '28pt' }}>
      {title && (
        <div
          style={{
            fontFamily: serifFont,
            fontSize: '11pt',
            fontWeight: 500,
            color: KAMI.brand,
            letterSpacing: '0.5pt',
            textTransform: 'uppercase',
            marginBottom: '8pt',
          }}
        >
          {title}
        </div>
      )}
      <div style={{ display: 'flex', gap }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              flex: 1,
              background: variant === 'equity' ? 'transparent' : KAMI.ivory,
              border: variant === 'equity' ? 'none' : `0.5pt solid ${KAMI.border}`,
              borderRadius,
              padding,
              textAlign: 'center' as const,
            }}
          >
            <div
              style={{
                fontFamily: serifFont,
                fontSize: variant === 'equity' ? '28pt' : fontSize,
                fontWeight: 500,
                color: item.color,
                lineHeight: 1,
              }}
            >
              {item.count}
            </div>
            <div
              style={{
                fontFamily: sansFont,
                fontSize: variant === 'one-pager' ? '8pt' : '9pt',
                color: KAMI.stone,
                marginTop: variant === 'equity' ? '4pt' : variant === 'one-pager' ? '3pt' : '4pt',
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
