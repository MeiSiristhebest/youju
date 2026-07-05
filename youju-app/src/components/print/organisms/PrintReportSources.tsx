import type { Source } from '@/types'
import { PrintSectionTitle } from '../atoms/PrintSectionTitle'
import { PrintSourceList } from '../molecules/PrintSourceList'

interface PrintReportSourcesProps {
  sources: Source[]
  title?: string
  number?: string
  variant?: 'tag' | 'numbered'
  withLine?: boolean
  size?: 'lg' | 'md' | 'sm'
}

export function PrintReportSources({
  sources,
  title = '材料概览',
  number = '一',
  variant = 'tag',
  withLine = false,
  size = 'md',
}: PrintReportSourcesProps) {
  if (!sources || sources.length === 0) return null

  return (
    <div style={{ marginBottom: '28pt' }}>
      <PrintSectionTitle size={size} numbered={!withLine} number={number} withLine={withLine}>
        {title}
      </PrintSectionTitle>
      <PrintSourceList sources={sources} variant={variant} />
    </div>
  )
}
