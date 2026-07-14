import type { AnalyzeResult, Source } from '@/types'
import {
  KAMI,
  levelLabel,
  levelStyle,
  monoFont,
  sansFont,
  serifFont,
  typeLabel,
} from '../constants'
import { PrintSourceList } from '../molecules/PrintSourceList'
import { PrintReportFooter } from './PrintReportFooter'
import { PrintReportHeader } from './PrintReportHeader'

interface ListReportProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
}

export function ListReport({ result, sources, title = '信息对齐分析报告' }: ListReportProps) {
  const r = result
  const now = new Date()
  const scenarioType = r.scenario?.type

  const metaItems = [
    now.toLocaleDateString('zh-CN'),
    `共 ${r.summary.total} 项风险`,
    `严重 ${r.summary.critical} / 待确认 ${r.summary.warning} / 提示 ${r.summary.info}`,
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
          eyebrow="YouJu Risk List"
          metaItems={metaItems}
          variant="list"
        />

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '9pt',
            marginBottom: '16pt',
            tableLayout: 'fixed' as const,
          }}
        >
          <thead>
            <tr style={{ borderBottom: `1pt solid ${KAMI.border}` }}>
              <th
                style={{
                  textAlign: 'left',
                  fontWeight: 500,
                  color: KAMI.darkWarm,
                  padding: '6pt 8pt',
                  fontFamily: sansFont,
                  width: '30pt',
                }}
              >
                #
              </th>
              <th
                style={{
                  textAlign: 'left',
                  fontWeight: 500,
                  color: KAMI.darkWarm,
                  padding: '6pt 8pt',
                  fontFamily: sansFont,
                }}
              >
                风险项
              </th>
              <th
                style={{
                  textAlign: 'left',
                  fontWeight: 500,
                  color: KAMI.darkWarm,
                  padding: '6pt 8pt',
                  fontFamily: sansFont,
                  width: '60pt',
                }}
              >
                等级
              </th>
              <th
                style={{
                  textAlign: 'left',
                  fontWeight: 500,
                  color: KAMI.darkWarm,
                  padding: '6pt 8pt',
                  fontFamily: sansFont,
                  width: '80pt',
                }}
              >
                类型
              </th>
              <th
                style={{
                  textAlign: 'left',
                  fontWeight: 500,
                  color: KAMI.darkWarm,
                  padding: '6pt 8pt',
                  fontFamily: sansFont,
                  width: '55pt',
                }}
              >
                置信度
              </th>
              <th
                style={{
                  textAlign: 'left',
                  fontWeight: 500,
                  color: KAMI.darkWarm,
                  padding: '6pt 8pt',
                  fontFamily: sansFont,
                  width: '100pt',
                }}
              >
                涉及材料
              </th>
            </tr>
          </thead>
          <tbody>
            {r.risks.map((risk, i) => {
              const ls = levelStyle(risk.level)
              const sourceNames = risk.evidence?.map((e) => e.sourceName) || risk.sources
              return (
                <tr key={risk.id} style={{ borderBottom: `0.3pt solid ${KAMI.borderSoft}` }}>
                  <td
                    style={{
                      padding: '7pt 8pt',
                      fontFamily: monoFont,
                      color: KAMI.stone,
                      fontSize: '8.5pt',
                      verticalAlign: 'top',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '7pt 8pt', verticalAlign: 'top' }}>
                    <div
                      style={{
                        fontWeight: 500,
                        color: KAMI.nearBlack,
                        marginBottom: '2pt',
                        fontFamily: serifFont,
                      }}
                    >
                      {risk.title}
                    </div>
                    <div style={{ fontSize: '8pt', color: KAMI.olive, lineHeight: 1.45 }}>
                      {risk.description}
                    </div>
                  </td>
                  <td style={{ padding: '7pt 8pt', verticalAlign: 'top' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '7.5pt',
                        fontWeight: 600,
                        color: ls.color,
                        background: ls.bg,
                        padding: '1pt 6pt',
                        borderRadius: '2pt',
                      }}
                    >
                      {levelLabel(risk.level)}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '7pt 8pt',
                      fontSize: '8.5pt',
                      color: KAMI.darkWarm,
                      verticalAlign: 'top',
                    }}
                  >
                    {typeLabel(risk.type, scenarioType)}
                    {risk.dimension && (
                      <div style={{ color: KAMI.stone, fontSize: '7.5pt', marginTop: '2pt' }}>
                        {risk.dimension}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '7pt 8pt',
                      fontFamily: monoFont,
                      fontSize: '8.5pt',
                      verticalAlign: 'top',
                    }}
                  >
                    {risk.confidence !== undefined ? `${risk.confidence}%` : '-'}
                  </td>
                  <td
                    style={{
                      padding: '7pt 8pt',
                      fontSize: '8pt',
                      color: KAMI.darkWarm,
                      verticalAlign: 'top',
                    }}
                  >
                    {sourceNames.slice(0, 2).join('、')}
                    {sourceNames.length > 2 && ` 等${sourceNames.length}份`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{ marginBottom: '14pt' }}>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '11pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              borderLeft: `2pt solid ${KAMI.brand}`,
              paddingLeft: '6pt',
              marginBottom: '8pt',
            }}
          >
            材料参考
          </div>
          <PrintSourceList sources={sources} variant="numbered" />
        </div>

        <PrintReportFooter variant="list" date={now} />
      </div>
    </div>
  )
}
