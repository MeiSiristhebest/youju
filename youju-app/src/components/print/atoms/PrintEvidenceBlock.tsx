import { KAMI, sansFont } from '../constants'

interface PrintEvidenceBlockProps {
  sourceName: string
  quote?: string
}

export function PrintEvidenceBlock({ sourceName, quote }: PrintEvidenceBlockProps) {
  return (
    <div
      style={{
        borderLeft: `2pt solid ${KAMI.brand}`,
        padding: '4pt 0 4pt 12pt',
        marginBottom: '5pt',
        fontFamily: sansFont,
        fontSize: '9pt',
        lineHeight: 1.5,
        color: KAMI.olive,
      }}
    >
      <span style={{ fontWeight: 500, color: KAMI.darkWarm }}>{sourceName}</span>
      {quote && <span style={{ color: KAMI.olive }}> — {quote}</span>}
    </div>
  )
}
