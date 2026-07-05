import type { Risk } from '@/types'
import { PrintSectionTitle } from '../atoms/PrintSectionTitle'
import { PrintRiskCard } from '../molecules/PrintRiskCard'

interface PrintReportRisksProps {
  risks: Risk[]
  title?: string
  variant?: 'standard' | 'equity'
  withNumber?: boolean
  number?: string
  withLine?: boolean
}

export function PrintReportRisks({
  risks,
  title = '风险点详情',
  variant = 'standard',
  withNumber = true,
  number,
  withLine = false,
}: PrintReportRisksProps) {
  if (!risks || risks.length === 0) return null

  return (
    <div
      style={{
        marginBottom: '28pt',
        breakBefore: variant === 'equity' ? ('page' as const) : undefined,
      }}
    >
      <PrintSectionTitle
        size={variant === 'equity' ? 'lg' : 'md'}
        numbered={!withLine}
        number={withNumber ? number || '三' : undefined}
        withLine={withLine}
      >
        {title}
      </PrintSectionTitle>
      {risks.map((risk, i) => (
        <PrintRiskCard key={risk.id} risk={risk} index={i} />
      ))}
    </div>
  )
}
