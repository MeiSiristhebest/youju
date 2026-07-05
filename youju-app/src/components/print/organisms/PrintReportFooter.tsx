import { KAMI, monoFont, sansFont, serifFont } from '../constants'

interface PrintReportFooterProps {
  variant?: 'standard' | 'one-pager' | 'list' | 'equity' | 'brief' | 'letter'
  date?: Date
  text?: string
}

export function PrintReportFooter({
  variant = 'standard',
  date = new Date(),
  text,
}: PrintReportFooterProps) {
  if (variant === 'brief') {
    return (
      <div
        style={{
          marginTop: '24pt',
          paddingTop: '10pt',
          borderTop: `0.5pt solid ${KAMI.border}`,
          fontFamily: sansFont,
          fontSize: '8pt',
          color: KAMI.stone,
          textAlign: 'center' as const,
        }}
      >
        本简报由「有据」AI 自动生成 · 仅供内部参考 · 如有疑问请联系分析团队
      </div>
    )
  }

  if (variant === 'letter') {
    return (
      <div
        style={{
          marginTop: '40pt',
          paddingTop: '12pt',
          borderTop: `0.5pt solid ${KAMI.borderSoft}`,
          fontSize: '9pt',
          color: KAMI.stone,
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: '4pt' }}>附件：</div>
        <div>{text || '1. 完整分析报告'}</div>
      </div>
    )
  }

  const isOnePager = variant === 'one-pager'
  const isList = variant === 'list'
  const marginTop = isOnePager || isList ? '20pt' : '40pt'
  const paddingTop = isOnePager || isList ? '10pt' : '14pt'
  const fontSize = isOnePager || isList ? '7.5pt' : '8.5pt'
  const fontFamily = variant === 'equity' ? serifFont : sansFont

  return (
    <div style={{ marginTop, paddingTop, borderTop: `0.5pt solid ${KAMI.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily, fontSize, color: KAMI.stone }}>
          {text ||
            (variant === 'equity'
              ? '由「有据」生成 · 好内容值得好纸张'
              : '由「有据」生成 — 有据可依，有据可查')}
        </span>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: isOnePager || isList ? '7.5pt' : '8pt',
            color: KAMI.stone,
          }}
        >
          {date.toISOString().slice(0, 10)}
        </span>
      </div>
    </div>
  )
}
