import { PrintSectionTitle } from '../atoms/PrintSectionTitle'
import { PrintChecklistSection } from '../molecules/PrintChecklistSection'

interface PrintReportChecklistProps {
  items: { text: string; checked: boolean }[]
  title?: string
  number?: string
}

export function PrintReportChecklist({
  items,
  title = '检查清单',
  number = '五',
}: PrintReportChecklistProps) {
  if (!items || items.length === 0) return null

  return (
    <div style={{ marginBottom: '28pt' }}>
      <PrintSectionTitle number={number}>{title}</PrintSectionTitle>
      <PrintChecklistSection items={items} />
    </div>
  )
}
