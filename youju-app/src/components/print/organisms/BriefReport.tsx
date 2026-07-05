import type { AnalyzeResult, Source } from '@/types'
import { KAMI, levelLabel, levelStyle, monoFont, sansFont, serifFont } from '../constants'
import { PrintReportFooter } from './PrintReportFooter'
import { PrintReportHeader } from './PrintReportHeader'

interface BriefReportProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
}

export function BriefReport({ result, sources, title = '信息对齐分析报告' }: BriefReportProps) {
  const r = result
  const now = new Date()

  const summaryItems = [
    { label: '需立即处理', count: r.summary.critical, color: KAMI.danger, bg: KAMI.dangerBg },
    { label: '待确认', count: r.summary.warning, color: KAMI.brand, bg: KAMI.tagBg },
    { label: '材料', count: sources.length, color: KAMI.nearBlack, bg: KAMI.ivory },
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
        <PrintReportHeader title={title} date={now} variant="brief" />

        <div style={{ marginBottom: '20pt' }}>
          <div
            style={{
              fontFamily: sansFont,
              fontSize: '9pt',
              fontWeight: 600,
              color: KAMI.brand,
              marginBottom: '6pt',
              letterSpacing: '0.3pt',
            }}
          >
            TL;DR
          </div>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '11pt',
              lineHeight: 1.55,
              color: KAMI.darkWarm,
              borderLeft: `2pt solid ${KAMI.brand}`,
              paddingLeft: '12pt',
            }}
          >
            {r.summary.critical > 0
              ? `存在 ${r.summary.critical} 项严重信息不一致，涉及 ${sources.length} 份材料。强烈建议在推进前与对方逐一核实，避免因信息偏差导致决策失误。`
              : r.summary.warning > 0
                ? `整体信息基本一致，但有 ${r.summary.warning} 项细节需要确认。建议就模糊点与对方沟通，形成统一认知后再推进。`
                : `经交叉验证，${sources.length} 份材料信息一致性良好，无明显冲突，可进入下一阶段。`}
          </div>
        </div>

        <div style={{ marginBottom: '20pt', display: 'flex', gap: '10pt' }}>
          {summaryItems.map((item, i) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                background: i === 0 ? (item.count > 0 ? item.bg : KAMI.successBg) : item.bg,
                borderRadius: '6pt',
                padding: '12pt 14pt',
                border: i === 2 ? `0.5pt solid ${KAMI.border}` : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: monoFont,
                  fontSize: '8pt',
                  color:
                    i === 0
                      ? item.count > 0
                        ? item.color
                        : KAMI.success
                      : i === 1
                        ? item.color
                        : KAMI.stone,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '24pt',
                  fontWeight: 500,
                  color:
                    i === 0
                      ? item.count > 0
                        ? item.color
                        : KAMI.success
                      : i === 1
                        ? item.color
                        : item.color,
                  lineHeight: 1.1,
                  marginTop: '4pt',
                }}
              >
                {item.count}
              </div>
              <div
                style={{
                  fontFamily: sansFont,
                  fontSize: '8pt',
                  color: KAMI.stone,
                  marginTop: '2pt',
                }}
              >
                {i === 0 ? '严重风险' : i === 1 ? '项事项' : '份已审核'}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '20pt' }}>
          <div
            style={{
              fontFamily: sansFont,
              fontSize: '9pt',
              fontWeight: 600,
              color: KAMI.brand,
              marginBottom: '8pt',
              letterSpacing: '0.3pt',
            }}
          >
            行动建议
          </div>
          <div
            style={{
              background: KAMI.ivory,
              border: `0.5pt solid ${KAMI.border}`,
              borderRadius: '6pt',
              padding: '12pt 14pt',
            }}
          >
            {r.risks
              .filter((x) => x.level === 'critical' || x.level === 'warning')
              .slice(0, 5)
              .map((risk, i) => (
                <div
                  key={risk.id}
                  style={{
                    display: 'flex',
                    gap: '8pt',
                    marginBottom: i < 4 ? '6pt' : '0',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '12pt',
                      height: '12pt',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: risk.level === 'critical' ? KAMI.danger : KAMI.warning,
                      color: '#fff',
                      fontSize: '7pt',
                      fontWeight: 600,
                      marginTop: '1pt',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontFamily: sansFont,
                        fontSize: '9pt',
                        fontWeight: 500,
                        color: KAMI.nearBlack,
                      }}
                    >
                      {risk.title}
                    </span>
                    <div
                      style={{
                        fontFamily: sansFont,
                        fontSize: '8pt',
                        color: KAMI.stone,
                        marginTop: '1pt',
                      }}
                    >
                      建议：与对方确认{risk.dimension || '相关细节'}
                    </div>
                  </div>
                </div>
              ))}
            {r.risks.filter((x) => x.level === 'critical' || x.level === 'warning').length ===
              0 && (
              <div style={{ fontFamily: sansFont, fontSize: '9pt', color: KAMI.success }}>
                暂无待办事项，材料信息一致性良好。
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20pt' }}>
          <div
            style={{
              fontFamily: sansFont,
              fontSize: '9pt',
              fontWeight: 600,
              color: KAMI.brand,
              marginBottom: '8pt',
              letterSpacing: '0.3pt',
            }}
          >
            风险一览
          </div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '8.5pt',
              tableLayout: 'fixed' as const,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `0.5pt solid ${KAMI.border}` }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '5pt 6pt',
                    fontWeight: 500,
                    color: KAMI.stone,
                    width: '24pt',
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '5pt 6pt',
                    fontWeight: 500,
                    color: KAMI.stone,
                  }}
                >
                  事项
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '5pt 6pt',
                    fontWeight: 500,
                    color: KAMI.stone,
                    width: '50pt',
                  }}
                >
                  等级
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '5pt 6pt',
                    fontWeight: 500,
                    color: KAMI.stone,
                    width: '45pt',
                  }}
                >
                  置信度
                </th>
              </tr>
            </thead>
            <tbody>
              {r.risks.slice(0, 10).map((risk, i) => {
                const ls = levelStyle(risk.level)
                return (
                  <tr key={risk.id} style={{ borderBottom: `0.3pt solid ${KAMI.borderSoft}` }}>
                    <td style={{ padding: '5pt 6pt', fontFamily: monoFont, color: KAMI.stone }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td style={{ padding: '5pt 6pt', color: KAMI.darkWarm }}>{risk.title}</td>
                    <td style={{ padding: '5pt 6pt' }}>
                      <span
                        style={{
                          fontSize: '7.5pt',
                          fontWeight: 600,
                          color: ls.color,
                          background: ls.bg,
                          padding: '1pt 5pt',
                          borderRadius: '2pt',
                        }}
                      >
                        {levelLabel(risk.level)}
                      </span>
                    </td>
                    <td style={{ padding: '5pt 6pt', fontFamily: monoFont, color: KAMI.stone }}>
                      {risk.confidence !== undefined ? `${risk.confidence}%` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <PrintReportFooter variant="brief" />
      </div>
    </div>
  )
}
