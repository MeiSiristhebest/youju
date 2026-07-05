import { KAMI, sansFont } from '../constants'

interface PrintMetaInfoProps {
  items: (string | null | false | undefined)[]
  size?: 'sm' | 'md'
  color?: string
}

export function PrintMetaInfo({ items, size = 'md', color = KAMI.stone }: PrintMetaInfoProps) {
  const validItems = items.filter(Boolean) as string[]
  if (validItems.length === 0) return null

  const fontSize = size === 'sm' ? '8pt' : '9pt'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10pt',
        fontFamily: sansFont,
        fontSize,
        color,
      }}
    >
      {validItems.map((item, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: KAMI.border }}>·</span>}
          {i > 0 && <span> </span>}
          {item}
        </span>
      ))}
    </div>
  )
}
