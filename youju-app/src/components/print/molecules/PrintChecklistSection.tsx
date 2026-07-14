import { PrintChecklistItem } from '../atoms/PrintChecklistItem'
import { KAMI } from '../constants'

interface PrintChecklistSectionProps {
  items: { text: string; checked?: boolean }[]
}

export function PrintChecklistSection({ items }: PrintChecklistSectionProps) {
  if (!items || items.length === 0) return null

  return (
    <div
      style={{
        background: KAMI.ivory,
        border: `0.5pt solid ${KAMI.border}`,
        borderRadius: '8pt',
        padding: '14pt 18pt',
      }}
    >
      {items.map((item, i) => (
        <PrintChecklistItem key={i} text={item.text} checked={item.checked ?? false} />
      ))}
    </div>
  )
}
