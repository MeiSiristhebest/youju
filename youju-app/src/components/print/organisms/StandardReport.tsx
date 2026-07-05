import type { AnalyzeResult, Source } from '@/types'
import { PrintSectionTitle } from '../atoms/PrintSectionTitle'
import { KAMI, sansFont } from '../constants'
import { PrintReportChecklist } from './PrintReportChecklist'
import { PrintReportFooter } from './PrintReportFooter'
import { PrintReportHeader } from './PrintReportHeader'
import { PrintReportRisks } from './PrintReportRisks'
import { PrintReportSources } from './PrintReportSources'
import { PrintReportSummary } from './PrintReportSummary'

interface StandardReportProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
}

function EntitySection({
  title,
  items,
}: {
  title: string
  items: { value: string; source: string }[]
}) {
  if (!items || items.length === 0) return null
  return (
    <>
      <div
        style={{
          fontFamily: sansFont,
          fontSize: '9.5pt',
          fontWeight: 600,
          color: KAMI.brand,
          marginTop: '6pt',
          marginBottom: '4pt',
        }}
      >
        {title}
      </div>
      <div style={{ paddingLeft: '0pt' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              fontFamily: sansFont,
              fontSize: '9.5pt',
              lineHeight: 1.5,
              color: KAMI.darkWarm,
              marginBottom: '2pt',
            }}
          >
            <span style={{ color: KAMI.brand }}>·</span> {item.value}
            <span style={{ color: KAMI.stone, fontSize: '8.5pt' }}> （{item.source}）</span>
          </div>
        ))}
      </div>
    </>
  )
}

export function StandardReport({
  result,
  sources,
  title = '信息对齐分析报告',
}: StandardReportProps) {
  const r = result
  const now = new Date()

  const metaItems = [
    `生成时间 ${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
    `材料 ${sources.length} 份`,
    `风险 ${r.summary.total} 项`,
  ]

  const summaryItems = [
    { label: '严重', count: r.summary.critical, color: KAMI.danger, bg: KAMI.dangerBg },
    { label: '需要确认', count: r.summary.warning, color: KAMI.warning, bg: KAMI.warningBg },
    { label: '提示', count: r.summary.info, color: KAMI.success, bg: KAMI.successBg },
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
        <PrintReportHeader title={title} metaItems={metaItems} variant="standard" />

        <PrintReportSources sources={sources} title="材料概览" number="一" variant="tag" />

        <div style={{ marginBottom: '28pt' }}>
          <PrintSectionTitle number="二">风险摘要</PrintSectionTitle>
          <PrintReportSummary items={summaryItems} variant="standard" />
        </div>

        <PrintReportRisks risks={r.risks} title="风险点详情" number="三" variant="standard" />

        {r.alignedVersion && (
          <div style={{ marginBottom: '28pt' }}>
            <PrintSectionTitle number="四">统一版本参照</PrintSectionTitle>
            <div
              style={{
                background: KAMI.ivory,
                border: `0.5pt solid ${KAMI.border}`,
                borderRadius: '6pt',
                padding: '12pt 16pt',
                fontFamily: 'monospace',
                fontSize: '9pt',
                lineHeight: 1.55,
                color: KAMI.darkWarm,
                whiteSpace: 'pre-wrap' as const,
              }}
            >
              {r.alignedVersion}
            </div>
          </div>
        )}

        {r.checklist && r.checklist.length > 0 && (
          <PrintReportChecklist items={r.checklist} title="检查清单" number="五" />
        )}

        {r.extractedEntities &&
          (r.extractedEntities.dates.length > 0 ||
            r.extractedEntities.amounts.length > 0 ||
            r.extractedEntities.terms.length > 0 ||
            r.extractedEntities.promises.length > 0) && (
            <div style={{ marginBottom: '28pt' }}>
              <PrintSectionTitle number="六">关键要素提取</PrintSectionTitle>
              <div
                style={{
                  background: KAMI.ivory,
                  border: `0.5pt solid ${KAMI.border}`,
                  borderRadius: '8pt',
                  padding: '14pt 18pt',
                }}
              >
                <EntitySection title="日期要素" items={r.extractedEntities.dates} />
                <EntitySection title="金额要素" items={r.extractedEntities.amounts} />
                <EntitySection title="条款要素" items={r.extractedEntities.terms} />
                <EntitySection title="承诺要素（口头）" items={r.extractedEntities.promises} />
              </div>
            </div>
          )}

        <PrintReportFooter variant="standard" date={now} />
      </div>
    </div>
  )
}
