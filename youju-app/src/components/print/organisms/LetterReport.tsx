import type { AnalyzeResult, Source } from '@/types'
import { KAMI, serifFont } from '../constants'
import { PrintReportFooter } from './PrintReportFooter'
import { PrintReportHeader } from './PrintReportHeader'

interface LetterReportProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
}

export function LetterReport({ result, sources, title = '信息对齐分析报告' }: LetterReportProps) {
  const r = result
  const now = new Date()

  return (
    <div
      id="print-report-root"
      style={{
        background: KAMI.parchment,
        color: KAMI.nearBlack,
        fontFamily: serifFont,
        padding: '0',
        margin: '0',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '25mm' }}>
        <PrintReportHeader title={title} date={now} variant="letter" />

        <div
          style={{
            marginBottom: '16pt',
            fontSize: '11pt',
            lineHeight: 1.55,
            color: KAMI.darkWarm,
            textIndent: '2em',
          }}
        >
          您好！
        </div>
        <div
          style={{
            marginBottom: '16pt',
            fontSize: '11pt',
            lineHeight: 1.55,
            color: KAMI.darkWarm,
            textIndent: '2em',
          }}
        >
          我方对本次合作涉及的 {sources.length}{' '}
          份材料进行了交叉验证分析。为确保双方信息一致、避免后续沟通偏差，现将分析结果中需确认的事项梳理如下，烦请贵方协助核实。
        </div>

        <div style={{ margin: '24pt 0' }}>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '11pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              marginBottom: '10pt',
            }}
          >
            一、总体情况
          </div>
          <div
            style={{
              fontSize: '10.5pt',
              lineHeight: 1.55,
              color: KAMI.darkWarm,
              paddingLeft: '2em',
            }}
          >
            本次共审核材料 {sources.length} 份，发现信息不一致事项 {r.summary.total} 项，其中：
          </div>
          <div
            style={{
              paddingLeft: '4em',
              marginTop: '6pt',
              fontSize: '10.5pt',
              lineHeight: 1.45,
              color: KAMI.darkWarm,
            }}
          >
            <div>
              · 严重不一致：
              <span style={{ color: KAMI.danger, fontWeight: 500 }}>{r.summary.critical}</span> 项
            </div>
            <div>
              · 需进一步确认：
              <span style={{ color: KAMI.warning, fontWeight: 500 }}>{r.summary.warning}</span> 项
            </div>
            <div>
              · 信息提示：
              <span style={{ color: KAMI.success, fontWeight: 500 }}>{r.summary.info}</span> 项
            </div>
          </div>
        </div>

        <div style={{ margin: '24pt 0' }}>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '11pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              marginBottom: '10pt',
            }}
          >
            二、需重点核实事项
          </div>
          <div style={{ paddingLeft: '2em' }}>
            {r.risks
              .filter((x) => x.level === 'critical' || x.level === 'warning')
              .slice(0, 5)
              .map((risk, i) => (
                <div
                  key={risk.id}
                  style={{
                    marginBottom: '12pt',
                    fontSize: '10.5pt',
                    lineHeight: 1.55,
                    color: KAMI.darkWarm,
                  }}
                >
                  <div style={{ marginBottom: '3pt' }}>
                    <span style={{ fontWeight: 500, color: KAMI.nearBlack }}>
                      （{i + 1}）{risk.title}
                    </span>
                    {risk.level === 'critical' && (
                      <span
                        style={{
                          marginLeft: '6pt',
                          fontSize: '8pt',
                          color: KAMI.danger,
                          fontWeight: 600,
                        }}
                      >
                        【重要】
                      </span>
                    )}
                  </div>
                  <div style={{ paddingLeft: '1.5em' }}>{risk.description}</div>
                  {risk.evidence && risk.evidence.length > 0 && (
                    <div
                      style={{
                        paddingLeft: '1.5em',
                        marginTop: '3pt',
                        fontSize: '9.5pt',
                        color: KAMI.stone,
                      }}
                    >
                      — 我方依据：{risk.evidence[0].sourceName}
                      {risk.evidence[0].quote
                        ? `「${risk.evidence[0].quote.slice(0, 30)}...」`
                        : ''}
                    </div>
                  )}
                </div>
              ))}
            {r.risks.filter((x) => x.level === 'critical' || x.level === 'warning').length ===
              0 && (
              <div style={{ fontSize: '10.5pt', lineHeight: 1.55, color: KAMI.success }}>
                经审核，所有材料信息一致，无需要核实的事项。
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: '24pt',
            fontSize: '11pt',
            lineHeight: 1.55,
            color: KAMI.darkWarm,
            textIndent: '2em',
          }}
        >
          以上事项请贵方予以确认。如有不同意见，请在收到本函后 3
          个工作日内反馈，以便双方及时调整。如无异议，我们将以此为准推进后续工作。
        </div>
        <div
          style={{
            marginTop: '16pt',
            fontSize: '11pt',
            lineHeight: 1.55,
            color: KAMI.darkWarm,
            textIndent: '2em',
          }}
        >
          感谢您的配合与支持！
        </div>

        <div style={{ marginTop: '50pt', textAlign: 'right' as const }}>
          <div style={{ fontFamily: serifFont, fontSize: '11pt', color: KAMI.darkWarm }}>此致</div>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '11pt',
              color: KAMI.darkWarm,
              marginTop: '3pt',
            }}
          >
            敬礼
          </div>
          <div
            style={{
              marginTop: '30pt',
              fontFamily: serifFont,
              fontSize: '11pt',
              fontWeight: 500,
              color: KAMI.brand,
            }}
          >
            「有据」信息对齐团队
          </div>
          <div
            style={{ fontFamily: serifFont, fontSize: '10pt', color: KAMI.stone, marginTop: '3pt' }}
          >
            {now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <PrintReportFooter
          variant="letter"
          text={`1. 完整分析报告（共 ${r.summary.total} 项风险）\n2. 原始材料清单（共 ${sources.length} 份）`}
        />
      </div>
    </div>
  )
}
