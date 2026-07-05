import { KAMI, sansFont } from '../constants'

interface PrintChecklistItemProps {
  text: string
  checked: boolean
}

export function PrintChecklistItem({ text, checked }: PrintChecklistItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8pt',
        fontFamily: sansFont,
        fontSize: '10pt',
        lineHeight: 1.55,
        color: KAMI.darkWarm,
        marginBottom: '6pt',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '11pt',
          height: '11pt',
          border: `1pt solid ${KAMI.brand}`,
          borderRadius: '2pt',
          flexShrink: 0,
          marginTop: '2pt',
          fontSize: '8pt',
          color: KAMI.brand,
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span>{text}</span>
    </div>
  )
}
