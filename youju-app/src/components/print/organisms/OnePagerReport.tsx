import type { AnalyzeResult, Source } from '@/types'
import { KAMI, sansFont, serifFont } from '../constants'
import { PrintRiskCard } from '../molecules/PrintRiskCard'
import { PrintSourceList } from '../molecules/PrintSourceList'
import { PrintReportFooter } from './PrintReportFooter'
import { PrintReportHeader } from './PrintReportHeader'
import { PrintReportSummary } from './PrintReportSummary'

interface OnePagerReportProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
}

export function OnePagerReport({
  result,
  sources,
  title = '信息对齐分析报告',
}: OnePagerReportProps) {
  const r = result
  const now = new Date()
  const topRisks = r.risks.slice(0, 5)
  const scenarioType = r.scenario?.type

  const metaItems = [
    now.toLocaleDateString('zh-CN'),
    `${sources.length} 份材料`,
    `${r.summary.total} 项风险`,
  ]

  const summaryItems = [
    { label: '严重风险', count: r.summary.critical, color: KAMI.danger, bg: KAMI.dangerBg },
    { label: '需要确认', count: r.summary.warning, color: KAMI.warning, bg: KAMI.warningBg },
    { label: '提示信息', count: r.summary.info, color: KAMI.success, bg: KAMI.successBg },
    { label: '材料总数', count: sources.length, color: KAMI.brand, bg: KAMI.tagBg },
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
      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '15mm 18mm' }}>
        <PrintReportHeader
          title={title}
          eyebrow="YouJu One-Pager"
          metaItems={metaItems}
          variant="one-pager"
        />

        <div style={{ marginBottom: '18pt' }}>
          <PrintReportSummary items={summaryItems} variant="one-pager" />
        </div>

        <div style={{ display: 'flex', gap: '18pt' }}>
          <div style={{ flex: 1.5 }}>
            <div
              style={{
                fontFamily: serifFont,
                fontSize: '12pt',
                fontWeight: 500,
                color: KAMI.nearBlack,
                borderLeft: `2pt solid ${KAMI.brand}`,
                paddingLeft: '6pt',
                marginBottom: '8pt',
              }}
            >
              核心风险
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8pt' }}>
              {topRisks.map((risk, i) => (
                <PrintRiskCard
                  key={risk.id}
                  risk={risk}
                  index={i}
                  compact
                  scenarioType={scenarioType}
                />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14pt' }}>
            <div>
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '12pt',
                  fontWeight: 500,
                  color: KAMI.nearBlack,
                  borderLeft: `2pt solid ${KAMI.brand}`,
                  paddingLeft: '6pt',
                  marginBottom: '8pt',
                }}
              >
                材料清单
              </div>
              <PrintSourceList sources={sources} variant="compact" />
            </div>

            {r.extractedEntities &&
              (r.extractedEntities.amounts.length > 0 || r.extractedEntities.dates.length > 0) && (
                <div>
                  <div
                    style={{
                      fontFamily: serifFont,
                      fontSize: '12pt',
                      fontWeight: 500,
                      color: KAMI.nearBlack,
                      borderLeft: `2pt solid ${KAMI.brand}`,
                      paddingLeft: '6pt',
                      marginBottom: '8pt',
                    }}
                  >
                    关键要素
                  </div>
                  <div
                    style={{
                      background: KAMI.ivory,
                      border: `0.5pt solid ${KAMI.border}`,
                      borderRadius: '6pt',
                      padding: '10pt 12pt',
                    }}
                  >
                    {r.extractedEntities.amounts.length > 0 && (
                      <div style={{ marginBottom: '6pt' }}>
                        <div
                          style={{
                            fontFamily: sansFont,
                            fontSize: '8pt',
                            fontWeight: 600,
                            color: KAMI.brand,
                            marginBottom: '3pt',
                          }}
                        >
                          金额要素
                        </div>
                        {r.extractedEntities.amounts.slice(0, 4).map((a, i) => (
                          <div
                            key={i}
                            style={{
                              fontFamily: sansFont,
                              fontSize: '8.5pt',
                              color: KAMI.darkWarm,
                              lineHeight: 1.45,
                            }}
                          >
                            · {a.value} <span style={{ color: KAMI.stone }}>({a.source})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {r.extractedEntities.dates.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontFamily: sansFont,
                            fontSize: '8pt',
                            fontWeight: 600,
                            color: KAMI.brand,
                            marginBottom: '3pt',
                          }}
                        >
                          日期要素
                        </div>
                        {r.extractedEntities.dates.slice(0, 3).map((d, i) => (
                          <div
                            key={i}
                            style={{
                              fontFamily: sansFont,
                              fontSize: '8.5pt',
                              color: KAMI.darkWarm,
                              lineHeight: 1.45,
                            }}
                          >
                            · {d.value} <span style={{ color: KAMI.stone }}>({d.source})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            <div>
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '12pt',
                  fontWeight: 500,
                  color: KAMI.nearBlack,
                  borderLeft: `2pt solid ${KAMI.brand}`,
                  paddingLeft: '6pt',
                  marginBottom: '8pt',
                }}
              >
                建议
              </div>
              <div
                style={{
                  borderLeft: `2pt solid ${KAMI.brand}`,
                  padding: '4pt 0 4pt 10pt',
                  fontFamily: sansFont,
                  fontSize: '8.5pt',
                  lineHeight: 1.5,
                  color: KAMI.olive,
                }}
              >
                {r.summary.critical > 0
                  ? `存在 ${r.summary.critical} 项严重风险，建议优先核实并与对方确认后再做决策。`
                  : r.summary.warning > 0
                    ? `有 ${r.summary.warning} 项需要确认的事项，建议进一步沟通明确细节。`
                    : '整体信息一致性良好，可进入下一步决策。'}
              </div>
            </div>
          </div>
        </div>

        <PrintReportFooter variant="one-pager" date={now} />
      </div>
    </div>
  )
}
