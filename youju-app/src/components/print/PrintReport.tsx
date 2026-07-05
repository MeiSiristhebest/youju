import type { AnalyzeResult, Source } from '@/types'
import { BriefReport } from './organisms/BriefReport'
import { EquityReport } from './organisms/EquityReport'
import { LetterReport } from './organisms/LetterReport'
import { ListReport } from './organisms/ListReport'
import { OnePagerReport } from './organisms/OnePagerReport'
import { StandardReport } from './organisms/StandardReport'

export type PrintStyle = 'standard' | 'one-pager' | 'list' | 'equity' | 'brief' | 'letter'

interface PrintReportProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
  style?: PrintStyle
}

export function PrintReport({
  result,
  sources,
  title = '信息对齐分析报告',
  style = 'standard',
}: PrintReportProps) {
  if (style === 'one-pager') {
    return <OnePagerReport result={result} sources={sources} title={title} />
  }
  if (style === 'list') {
    return <ListReport result={result} sources={sources} title={title} />
  }
  if (style === 'equity') {
    return <EquityReport result={result} sources={sources} title={title} />
  }
  if (style === 'brief') {
    return <BriefReport result={result} sources={sources} title={title} />
  }
  if (style === 'letter') {
    return <LetterReport result={result} sources={sources} title={title} />
  }
  return <StandardReport result={result} sources={sources} title={title} />
}
