import { KAMI, serifFont } from '../constants'

interface PrintSectionTitleProps {
  children: React.ReactNode
  size?: 'lg' | 'md' | 'sm'
  numbered?: boolean
  number?: string
  withLine?: boolean
  align?: 'left' | 'center'
}

export function PrintSectionTitle({
  children,
  size = 'md',
  numbered,
  number,
  withLine = false,
  align = 'left',
}: PrintSectionTitleProps) {
  const fontSize = size === 'lg' ? '16pt' : size === 'sm' ? '12pt' : '14pt'
  const paddingLeft = size === 'sm' ? '6pt' : '8pt'
  const borderWidth = size === 'sm' ? '2pt' : '2.5pt'
  const marginBottom = size === 'sm' ? '8pt' : '12pt'

  if (withLine) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '10pt',
          marginBottom,
        }}
      >
        <span
          style={{
            fontFamily: serifFont,
            fontSize,
            fontWeight: 500,
            color: KAMI.nearBlack,
          }}
        >
          {children}
        </span>
        <span style={{ flex: 1, height: '0.5pt', background: KAMI.border }} />
        {number && (
          <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: KAMI.stone }}>
            {number}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: serifFont,
        fontSize,
        fontWeight: 500,
        color: KAMI.nearBlack,
        borderLeft: numbered !== false ? `${borderWidth} solid ${KAMI.brand}` : 'none',
        paddingLeft: numbered !== false ? paddingLeft : '0',
        marginBottom,
        textAlign: align,
      }}
    >
      {number && <span style={{ marginRight: '0.5em' }}>{number}</span>}
      {children}
    </div>
  )
}
