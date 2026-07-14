import type { AnalyzeResult, Source } from '@/types'
import { KAMI, sansFont, serifFont } from '../constants'
import { PrintRiskSection } from '../molecules/PrintRiskSection'
import { PrintReportFooter } from './PrintReportFooter'
import { PrintReportHeader } from './PrintReportHeader'
import { PrintReportRisks } from './PrintReportRisks'
import { PrintReportSources } from './PrintReportSources'
import { PrintReportSummary } from './PrintReportSummary'

interface EquityReportProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
}

export function EquityReport({ result, sources, title = '信息对齐分析报告' }: EquityReportProps) {
  const r = result
  const now = new Date()
  const criticalRisks = r.risks.filter((x) => x.level === 'critical')
  const warningRisks = r.risks.filter((x) => x.level === 'warning')
  const scenarioType = r.scenario?.type

  const summaryItems = [
    { label: '严重风险', count: r.summary.critical, color: KAMI.danger, bg: KAMI.dangerBg },
    { label: '待确认', count: r.summary.warning, color: KAMI.warning, bg: KAMI.warningBg },
    { label: '提示信息', count: r.summary.info, color: KAMI.success, bg: KAMI.successBg },
    { label: '材料份数', count: sources.length, color: KAMI.brand, bg: KAMI.tagBg },
  ]

  return (
    <div
      id="print-report-root"
      style={{
        background: KAMI.parchment,
        color: KAMI.nearBlack,
        fontFamily: sansFont,
        padding: '0',
        margin: '0',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '20mm 22mm 22mm' }}>
        <PrintReportHeader
          title={title}
          eyebrow="YouJu · Information Alignment Report"
          date={now}
          variant="equity"
        />

        <div
          style={{
            marginBottom: '26pt',
            background: KAMI.ivory,
            border: `0.5pt solid ${KAMI.border}`,
            borderRadius: '10pt',
            padding: '18pt 22pt',
          }}
        >
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '11pt',
              fontWeight: 500,
              color: KAMI.brand,
              letterSpacing: '0.5pt',
              textTransform: 'uppercase',
              marginBottom: '8pt',
            }}
          >
            执行摘要
          </div>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '12pt',
              lineHeight: 1.55,
              color: KAMI.darkWarm,
            }}
          >
            {r.summary.critical > 0
              ? `本次分析共发现 ${r.summary.total} 项信息不一致问题，其中严重风险 ${r.summary.critical} 项。建议在做出决策前，优先与相关方核实以下关键事项。`
              : r.summary.warning > 0
                ? `本次分析在 ${sources.length} 份材料中发现 ${r.summary.total} 项需确认事项，整体信息一致性良好，建议进一步沟通明确细节。`
                : `本次分析覆盖 ${sources.length} 份材料，未发现明显信息冲突，整体一致性良好。`}
          </div>
          <div style={{ display: 'flex', gap: '14pt', marginTop: '14pt' }}>
            <PrintReportSummary items={summaryItems} variant="equity" />
          </div>
        </div>

        <div style={{ marginBottom: '26pt' }}>
          <div
            style={{ display: 'flex', alignItems: 'baseline', gap: '10pt', marginBottom: '12pt' }}
          >
            <span
              style={{
                fontFamily: serifFont,
                fontSize: '16pt',
                fontWeight: 500,
                color: KAMI.nearBlack,
              }}
            >
              核心发现
            </span>
            <span style={{ flex: 1, height: '0.5pt', background: KAMI.border }} />
            <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: KAMI.stone }}>01</span>
          </div>
          {criticalRisks.length > 0 && (
            <PrintRiskSection
              title="严重风险"
              risks={criticalRisks}
              variant="numbered"
              maxItems={3}
            />
          )}
          {warningRisks.length > 0 && (
            <PrintRiskSection
              title="待确认事项"
              risks={warningRisks}
              variant="simple"
              maxItems={4}
            />
          )}
        </div>

        <PrintReportSources
          sources={sources}
          title="审核材料"
          variant="numbered"
          withLine
          size="lg"
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10pt',
            marginBottom: '12pt',
            marginTop: '-14pt',
          }}
        >
          <span style={{ flex: 1, height: '0.5pt', background: KAMI.border }} />
          <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: KAMI.stone }}>02</span>
        </div>

        <PrintReportRisks
          risks={r.risks}
          title="风险详情"
          variant="equity"
          withNumber={false}
          withLine
          scenarioType={scenarioType}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10pt',
            marginBottom: '12pt',
            marginTop: '-20pt',
          }}
        >
          <span style={{ flex: 1, height: '0.5pt', background: KAMI.border }} />
          <span style={{ fontFamily: 'monospace', fontSize: '8pt', color: KAMI.stone }}>03</span>
        </div>

        <PrintReportFooter variant="equity" date={now} />
      </div>
    </div>
  )
}
