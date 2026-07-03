import type { AnalyzeResult, Risk, RiskLevel, Source } from '@/types'

export type PrintStyle = 'standard' | 'one-pager' | 'list' | 'equity' | 'brief' | 'letter'

interface PrintReportProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
  style?: PrintStyle
}

const KAMI = {
  parchment: '#f5f4ed',
  ivory: '#faf9f5',
  warmSand: '#e8e6dc',
  brand: '#1B365D',
  brandLight: '#2D5A8A',
  nearBlack: '#141413',
  darkWarm: '#3d3d3a',
  olive: '#504e49',
  stone: '#6b6a64',
  border: '#e8e6dc',
  borderSoft: '#e5e3d8',
  tagBg: '#E4ECF5',
  danger: '#8B2C2C',
  dangerBg: '#f0e0d8',
  warning: '#8B6914',
  warningBg: '#f5ecd8',
  success: '#2C5F2D',
  successBg: '#e0ecd8',
}

const serifFont =
  '"TsangerJinKai02", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", Georgia, serif'
const sansFont =
  '"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif'
const monoFont =
  '"JetBrains Mono", "SF Mono", "Fira Code", Consolas, Monaco, "TsangerJinKai02", "Source Han Serif SC", monospace'

function levelLabel(level: RiskLevel) {
  return level === 'critical' ? '严重' : level === 'warning' ? '需要确认' : '提示'
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    conflict: '直接矛盾',
    promise: '承诺未落文字',
    missing: '信息缺失',
    info: '信息提示',
  }
  return map[type] || type
}

function levelStyle(level: RiskLevel) {
  if (level === 'critical') return { color: KAMI.danger, bg: KAMI.dangerBg }
  if (level === 'warning') return { color: KAMI.warning, bg: KAMI.warningBg }
  return { color: KAMI.success, bg: KAMI.successBg }
}

function RiskCard({ risk, index }: { risk: Risk; index: number }) {
  const ls = levelStyle(risk.level)
  const sourceNames = risk.evidence?.map((e) => e.sourceName) || risk.sources

  return (
    <div
      style={{
        background: KAMI.ivory,
        border: `0.5pt solid ${KAMI.border}`,
        borderRadius: '8pt',
        padding: '14pt 18pt',
        marginBottom: '14pt',
        breakInside: 'avoid' as const,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12pt',
          marginBottom: '6pt',
        }}
      >
        <div style={{ flex: 1 }}>
          <span
            style={{ fontFamily: monoFont, fontSize: '9pt', color: KAMI.stone, marginRight: '6pt' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: serifFont,
              fontSize: '13pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
            }}
          >
            {risk.title}
          </span>
        </div>
        <span
          style={{
            fontSize: '8.5pt',
            fontWeight: 600,
            color: ls.color,
            background: ls.bg,
            padding: '1.5pt 8pt',
            borderRadius: '3pt',
            whiteSpace: 'nowrap' as const,
            flexShrink: 0,
          }}
        >
          {levelLabel(risk.level)}
        </span>
      </div>

      {/* Meta row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10pt',
          marginBottom: '8pt',
          fontFamily: sansFont,
          fontSize: '9pt',
          color: KAMI.stone,
        }}
      >
        <span>{typeLabel(risk.type)}</span>
        {risk.dimension && (
          <>
            <span style={{ color: KAMI.border }}>·</span>
            <span>{risk.dimension}</span>
          </>
        )}
        {risk.confidence !== undefined && (
          <>
            <span style={{ color: KAMI.border }}>·</span>
            <span
              style={{
                fontFamily: monoFont,
                color:
                  risk.confidence >= 80
                    ? KAMI.success
                    : risk.confidence >= 50
                      ? KAMI.warning
                      : KAMI.danger,
              }}
            >
              置信度 {risk.confidence}%
            </span>
          </>
        )}
      </div>

      {/* Description */}
      <div
        style={{
          fontFamily: sansFont,
          fontSize: '10pt',
          lineHeight: 1.55,
          color: KAMI.darkWarm,
          marginBottom: '8pt',
        }}
      >
        {risk.description}
      </div>

      {/* Evidence */}
      {risk.evidence && risk.evidence.length > 0 && (
        <div style={{ marginTop: '8pt' }}>
          <div
            style={{
              fontFamily: sansFont,
              fontSize: '8.5pt',
              fontWeight: 600,
              color: KAMI.brand,
              letterSpacing: '0.3pt',
              textTransform: 'uppercase',
              marginBottom: '5pt',
            }}
          >
            证据来源
          </div>
          {risk.evidence.map((ev, i) => (
            <div
              key={i}
              style={{
                borderLeft: `2pt solid ${KAMI.brand}`,
                padding: '4pt 0 4pt 12pt',
                marginBottom: '5pt',
                fontFamily: sansFont,
                fontSize: '9pt',
                lineHeight: 1.5,
                color: KAMI.olive,
              }}
            >
              <span style={{ fontWeight: 500, color: KAMI.darkWarm }}>{ev.sourceName}</span>
              {ev.quote && <span style={{ color: KAMI.olive }}> — {ev.quote}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Sources */}
      {sourceNames.length > 0 && (
        <div
          style={{ marginTop: '6pt', fontFamily: sansFont, fontSize: '8.5pt', color: KAMI.stone }}
        >
          涉及材料：{sourceNames.join('、')}
        </div>
      )}
    </div>
  )
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

function StandardReport({ result, sources, title = '信息对齐分析报告' }: PrintReportProps) {
  const r = result
  const now = new Date()

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
      {/* Page container */}
      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '20mm 22mm 22mm' }}>
        {/* Document Header */}
        <div style={{ marginBottom: '32pt' }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6pt', marginBottom: '10pt' }}>
            <div style={{ width: '8pt', height: '1.5pt', background: KAMI.brand }} />
            <span
              style={{
                fontFamily: sansFont,
                fontSize: '8.5pt',
                fontWeight: 600,
                color: KAMI.brand,
                letterSpacing: '1pt',
                textTransform: 'uppercase',
              }}
            >
              YouJu Analysis Report
            </span>
          </div>
          {/* Title */}
          <h1
            style={{
              fontFamily: serifFont,
              fontSize: '28pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              lineHeight: 1.15,
              margin: '0 0 10pt 0',
            }}
          >
            {title}
          </h1>
          {/* Meta row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16pt',
              fontFamily: sansFont,
              fontSize: '9pt',
              color: KAMI.stone,
            }}
          >
            <span>
              生成时间 {now.toLocaleDateString('zh-CN')}{' '}
              {now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>·</span>
            <span>材料 {sources.length} 份</span>
            <span>·</span>
            <span>风险 {r.summary.total} 项</span>
          </div>
          {/* Hairline */}
          <div style={{ height: '0.5pt', background: KAMI.border, marginTop: '14pt' }} />
        </div>

        {/* Section: 材料概览 */}
        <div style={{ marginBottom: '28pt' }}>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '14pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              borderLeft: `2.5pt solid ${KAMI.brand}`,
              paddingLeft: '8pt',
              marginBottom: '12pt',
            }}
          >
            一、材料概览
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6pt' }}>
            {sources.map((s, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  background: KAMI.tagBg,
                  color: KAMI.brand,
                  fontFamily: sansFont,
                  fontSize: '9pt',
                  fontWeight: 500,
                  padding: '2pt 8pt',
                  borderRadius: '3pt',
                  marginBottom: '3pt',
                }}
              >
                {s.name}
                {s.meta ? ` · ${s.meta}` : ''}
              </span>
            ))}
          </div>
        </div>

        {/* Section: 风险摘要 */}
        <div style={{ marginBottom: '28pt' }}>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '14pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              borderLeft: `2.5pt solid ${KAMI.brand}`,
              paddingLeft: '8pt',
              marginBottom: '12pt',
            }}
          >
            二、风险摘要
          </div>
          <div style={{ display: 'flex', gap: '12pt' }}>
            {[
              { label: '严重', count: r.summary.critical, color: KAMI.danger, bg: KAMI.dangerBg },
              {
                label: '需要确认',
                count: r.summary.warning,
                color: KAMI.warning,
                bg: KAMI.warningBg,
              },
              { label: '提示', count: r.summary.info, color: KAMI.success, bg: KAMI.successBg },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  flex: 1,
                  background: KAMI.ivory,
                  border: `0.5pt solid ${KAMI.border}`,
                  borderRadius: '8pt',
                  padding: '12pt 14pt',
                  textAlign: 'center' as const,
                }}
              >
                <div
                  style={{
                    fontFamily: serifFont,
                    fontSize: '24pt',
                    fontWeight: 500,
                    color: item.color,
                    lineHeight: 1.1,
                  }}
                >
                  {item.count}
                </div>
                <div
                  style={{
                    fontFamily: sansFont,
                    fontSize: '9pt',
                    color: KAMI.stone,
                    marginTop: '4pt',
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: 风险点详情 */}
        <div style={{ marginBottom: '28pt' }}>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '14pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              borderLeft: `2.5pt solid ${KAMI.brand}`,
              paddingLeft: '8pt',
              marginBottom: '12pt',
            }}
          >
            三、风险点详情
          </div>
          {r.risks.map((risk, i) => (
            <RiskCard key={risk.id} risk={risk} index={i} />
          ))}
        </div>

        {/* Section: 统一版本参照 */}
        {r.alignedVersion && (
          <div style={{ marginBottom: '28pt' }}>
            <div
              style={{
                fontFamily: serifFont,
                fontSize: '14pt',
                fontWeight: 500,
                color: KAMI.nearBlack,
                borderLeft: `2.5pt solid ${KAMI.brand}`,
                paddingLeft: '8pt',
                marginBottom: '12pt',
              }}
            >
              四、统一版本参照
            </div>
            <div
              style={{
                background: KAMI.ivory,
                border: `0.5pt solid ${KAMI.border}`,
                borderRadius: '6pt',
                padding: '12pt 16pt',
                fontFamily: monoFont,
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

        {/* Section: 检查清单 */}
        {r.checklist && r.checklist.length > 0 && (
          <div style={{ marginBottom: '28pt' }}>
            <div
              style={{
                fontFamily: serifFont,
                fontSize: '14pt',
                fontWeight: 500,
                color: KAMI.nearBlack,
                borderLeft: `2.5pt solid ${KAMI.brand}`,
                paddingLeft: '8pt',
                marginBottom: '12pt',
              }}
            >
              五、检查清单
            </div>
            <div
              style={{
                background: KAMI.ivory,
                border: `0.5pt solid ${KAMI.border}`,
                borderRadius: '8pt',
                padding: '14pt 18pt',
              }}
            >
              {r.checklist.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8pt',
                    fontFamily: sansFont,
                    fontSize: '10pt',
                    lineHeight: 1.55,
                    color: KAMI.darkWarm,
                    marginBottom: '6pt',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '11pt',
                      height: '11pt',
                      border: `1pt solid ${KAMI.brand}`,
                      borderRadius: '2pt',
                      flexShrink: 0,
                      marginTop: '2pt',
                      fontSize: '8pt',
                      color: KAMI.brand,
                    }}
                  >
                    {item.checked ? '✓' : ''}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: 关键要素提取 */}
        {r.extractedEntities &&
          (r.extractedEntities.dates.length > 0 ||
            r.extractedEntities.amounts.length > 0 ||
            r.extractedEntities.terms.length > 0 ||
            r.extractedEntities.promises.length > 0) && (
            <div style={{ marginBottom: '28pt' }}>
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '14pt',
                  fontWeight: 500,
                  color: KAMI.nearBlack,
                  borderLeft: `2.5pt solid ${KAMI.brand}`,
                  paddingLeft: '8pt',
                  marginBottom: '12pt',
                }}
              >
                六、关键要素提取
              </div>
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

        {/* Footer */}
        <div
          style={{ marginTop: '40pt', paddingTop: '14pt', borderTop: `0.5pt solid ${KAMI.border}` }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: sansFont, fontSize: '8.5pt', color: KAMI.stone }}>
              由「有据」生成 — 有据可依，有据可查
            </span>
            <span style={{ fontFamily: monoFont, fontSize: '8pt', color: KAMI.stone }}>
              {now.toISOString().slice(0, 10)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function OnePagerReport({ result, sources, title }: PrintReportProps) {
  const r = result
  const now = new Date()
  const topRisks = r.risks.slice(0, 5)

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
        {/* Header */}
        <div style={{ marginBottom: '20pt' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6pt', marginBottom: '8pt' }}>
            <div style={{ width: '8pt', height: '1.5pt', background: KAMI.brand }} />
            <span
              style={{
                fontFamily: sansFont,
                fontSize: '8pt',
                fontWeight: 600,
                color: KAMI.brand,
                letterSpacing: '1pt',
                textTransform: 'uppercase',
              }}
            >
              YouJu One-Pager
            </span>
          </div>
          <h1
            style={{
              fontFamily: serifFont,
              fontSize: '22pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              lineHeight: 1.15,
              margin: '0 0 6pt 0',
            }}
          >
            {title}
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12pt',
              fontFamily: sansFont,
              fontSize: '8.5pt',
              color: KAMI.stone,
            }}
          >
            <span>{now.toLocaleDateString('zh-CN')}</span>
            <span>·</span>
            <span>{sources.length} 份材料</span>
            <span>·</span>
            <span>{r.summary.total} 项风险</span>
          </div>
          <div style={{ height: '0.5pt', background: KAMI.border, marginTop: '12pt' }} />
        </div>

        {/* Top metrics row */}
        <div style={{ display: 'flex', gap: '10pt', marginBottom: '18pt' }}>
          {[
            { label: '严重风险', count: r.summary.critical, color: KAMI.danger, bg: KAMI.dangerBg },
            {
              label: '需要确认',
              count: r.summary.warning,
              color: KAMI.warning,
              bg: KAMI.warningBg,
            },
            { label: '提示信息', count: r.summary.info, color: KAMI.success, bg: KAMI.successBg },
            { label: '材料总数', count: sources.length, color: KAMI.brand, bg: KAMI.tagBg },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                background: KAMI.ivory,
                border: `0.5pt solid ${KAMI.border}`,
                borderRadius: '6pt',
                padding: '10pt 12pt',
                textAlign: 'center' as const,
              }}
            >
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '20pt',
                  fontWeight: 500,
                  color: item.color,
                  lineHeight: 1.1,
                }}
              >
                {item.count}
              </div>
              <div
                style={{
                  fontFamily: sansFont,
                  fontSize: '8pt',
                  color: KAMI.stone,
                  marginTop: '3pt',
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div style={{ display: 'flex', gap: '18pt' }}>
          {/* Left: Top risks */}
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
              {topRisks.map((risk, i) => {
                const ls = levelStyle(risk.level)
                return (
                  <div
                    key={risk.id}
                    style={{
                      background: KAMI.ivory,
                      border: `0.5pt solid ${KAMI.border}`,
                      borderRadius: '6pt',
                      padding: '8pt 12pt',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '8pt',
                        marginBottom: '3pt',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <span
                          style={{
                            fontFamily: monoFont,
                            fontSize: '8pt',
                            color: KAMI.stone,
                            marginRight: '5pt',
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            fontFamily: serifFont,
                            fontSize: '10.5pt',
                            fontWeight: 500,
                            color: KAMI.nearBlack,
                          }}
                        >
                          {risk.title}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '7.5pt',
                          fontWeight: 600,
                          color: ls.color,
                          background: ls.bg,
                          padding: '1pt 6pt',
                          borderRadius: '2pt',
                          flexShrink: 0,
                        }}
                      >
                        {levelLabel(risk.level)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: sansFont,
                        fontSize: '8.5pt',
                        lineHeight: 1.45,
                        color: KAMI.darkWarm,
                      }}
                    >
                      {risk.description}
                    </div>
                    {risk.confidence !== undefined && (
                      <div
                        style={{
                          fontFamily: monoFont,
                          fontSize: '7.5pt',
                          color: KAMI.stone,
                          marginTop: '3pt',
                        }}
                      >
                        置信度 {risk.confidence}%
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Sources + key entities */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14pt' }}>
            {/* Materials */}
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4pt' }}>
                {sources.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      background: KAMI.tagBg,
                      color: KAMI.brand,
                      fontFamily: sansFont,
                      fontSize: '8pt',
                      fontWeight: 500,
                      padding: '1.5pt 7pt',
                      borderRadius: '3pt',
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Key elements */}
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

            {/* Quick summary */}
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

        {/* Footer */}
        <div
          style={{ marginTop: '20pt', paddingTop: '10pt', borderTop: `0.5pt solid ${KAMI.border}` }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: sansFont, fontSize: '7.5pt', color: KAMI.stone }}>
              由「有据」生成 — 有据可依，有据可查
            </span>
            <span style={{ fontFamily: monoFont, fontSize: '7.5pt', color: KAMI.stone }}>
              {now.toISOString().slice(0, 10)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListReport({ result, sources, title }: PrintReportProps) {
  const r = result
  const now = new Date()

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
        {/* Header */}
        <div style={{ marginBottom: '18pt' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6pt', marginBottom: '8pt' }}>
            <div style={{ width: '8pt', height: '1.5pt', background: KAMI.brand }} />
            <span
              style={{
                fontFamily: sansFont,
                fontSize: '8pt',
                fontWeight: 600,
                color: KAMI.brand,
                letterSpacing: '1pt',
                textTransform: 'uppercase',
              }}
            >
              YouJu Risk List
            </span>
          </div>
          <h1
            style={{
              fontFamily: serifFont,
              fontSize: '22pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              lineHeight: 1.15,
              margin: '0 0 6pt 0',
            }}
          >
            {title}
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12pt',
              fontFamily: sansFont,
              fontSize: '8.5pt',
              color: KAMI.stone,
            }}
          >
            <span>{now.toLocaleDateString('zh-CN')}</span>
            <span>·</span>
            <span>共 {r.summary.total} 项风险</span>
            <span>·</span>
            <span>
              严重 {r.summary.critical} / 待确认 {r.summary.warning} / 提示 {r.summary.info}
            </span>
          </div>
          <div style={{ height: '0.5pt', background: KAMI.border, marginTop: '12pt' }} />
        </div>

        {/* Table */}
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
                    {typeLabel(risk.type)}
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

        {/* Materials reference */}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5pt' }}>
            {sources.map((s, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  background: KAMI.ivory,
                  border: `0.5pt solid ${KAMI.border}`,
                  color: KAMI.darkWarm,
                  fontFamily: sansFont,
                  fontSize: '8.5pt',
                  padding: '3pt 9pt',
                  borderRadius: '4pt',
                }}
              >
                {i + 1}. {s.name}
                {s.meta && <span style={{ color: KAMI.stone }}> · {s.meta}</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: '12pt', borderTop: `0.5pt solid ${KAMI.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: sansFont, fontSize: '8pt', color: KAMI.stone }}>
              由「有据」生成 — 有据可依，有据可查
            </span>
            <span style={{ fontFamily: monoFont, fontSize: '7.5pt', color: KAMI.stone }}>
              {now.toISOString().slice(0, 10)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EquityReport({ result, sources, title }: PrintReportProps) {
  const r = result
  const now = new Date()
  const criticalRisks = r.risks.filter((x) => x.level === 'critical')
  const warningRisks = r.risks.filter((x) => x.level === 'warning')

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
        {/* Cover-style header */}
        <div style={{ marginBottom: '28pt', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: monoFont,
              fontSize: '8pt',
              color: KAMI.stone,
              letterSpacing: '2pt',
              textTransform: 'uppercase',
              marginBottom: '10pt',
            }}
          >
            YouJu · Information Alignment Report
          </div>
          <h1
            style={{
              fontFamily: serifFont,
              fontSize: '30pt',
              fontWeight: 500,
              color: KAMI.brand,
              lineHeight: 1.1,
              margin: '0 0 12pt 0',
            }}
          >
            {title}
          </h1>
          <div
            style={{
              height: '1pt',
              background: KAMI.brand,
              width: '60pt',
              margin: '0 auto 14pt auto',
            }}
          />
          <div style={{ fontFamily: sansFont, fontSize: '9pt', color: KAMI.stone }}>
            {now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Executive Summary */}
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
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '28pt',
                  fontWeight: 500,
                  color: KAMI.danger,
                  lineHeight: 1,
                }}
              >
                {r.summary.critical}
              </div>
              <div
                style={{
                  fontFamily: sansFont,
                  fontSize: '8pt',
                  color: KAMI.stone,
                  marginTop: '4pt',
                }}
              >
                严重风险
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '28pt',
                  fontWeight: 500,
                  color: KAMI.warning,
                  lineHeight: 1,
                }}
              >
                {r.summary.warning}
              </div>
              <div
                style={{
                  fontFamily: sansFont,
                  fontSize: '8pt',
                  color: KAMI.stone,
                  marginTop: '4pt',
                }}
              >
                待确认
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '28pt',
                  fontWeight: 500,
                  color: KAMI.success,
                  lineHeight: 1,
                }}
              >
                {r.summary.info}
              </div>
              <div
                style={{
                  fontFamily: sansFont,
                  fontSize: '8pt',
                  color: KAMI.stone,
                  marginTop: '4pt',
                }}
              >
                提示信息
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: serifFont,
                  fontSize: '28pt',
                  fontWeight: 500,
                  color: KAMI.brand,
                  lineHeight: 1,
                }}
              >
                {sources.length}
              </div>
              <div
                style={{
                  fontFamily: sansFont,
                  fontSize: '8pt',
                  color: KAMI.stone,
                  marginTop: '4pt',
                }}
              >
                材料份数
              </div>
            </div>
          </div>
        </div>

        {/* Key Findings */}
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
            <span style={{ fontFamily: monoFont, fontSize: '8pt', color: KAMI.stone }}>01</span>
          </div>
          {criticalRisks.length > 0 && (
            <div style={{ marginBottom: '14pt' }}>
              <div
                style={{
                  fontFamily: sansFont,
                  fontSize: '9.5pt',
                  fontWeight: 600,
                  color: KAMI.danger,
                  marginBottom: '6pt',
                }}
              >
                严重风险
              </div>
              {criticalRisks.slice(0, 3).map((risk, i) => (
                <div
                  key={risk.id}
                  style={{ display: 'flex', gap: '10pt', marginBottom: '6pt', paddingLeft: '6pt' }}
                >
                  <span
                    style={{
                      fontFamily: monoFont,
                      fontSize: '8.5pt',
                      color: KAMI.danger,
                      flexShrink: 0,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <span
                      style={{
                        fontFamily: serifFont,
                        fontSize: '10.5pt',
                        fontWeight: 500,
                        color: KAMI.nearBlack,
                      }}
                    >
                      {risk.title}
                    </span>
                    <div
                      style={{
                        fontFamily: sansFont,
                        fontSize: '8.5pt',
                        color: KAMI.olive,
                        marginTop: '2pt',
                        lineHeight: 1.45,
                      }}
                    >
                      {risk.description.slice(0, 80)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {warningRisks.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: sansFont,
                  fontSize: '9.5pt',
                  fontWeight: 600,
                  color: KAMI.warning,
                  marginBottom: '6pt',
                }}
              >
                待确认事项
              </div>
              {warningRisks.slice(0, 4).map((risk, i) => (
                <div
                  key={risk.id}
                  style={{ display: 'flex', gap: '10pt', marginBottom: '5pt', paddingLeft: '6pt' }}
                >
                  <span
                    style={{
                      fontFamily: monoFont,
                      fontSize: '8.5pt',
                      color: KAMI.warning,
                      flexShrink: 0,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontFamily: sansFont, fontSize: '9.5pt', color: KAMI.darkWarm }}>
                    {risk.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Materials Reviewed */}
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
              审核材料
            </span>
            <span style={{ flex: 1, height: '0.5pt', background: KAMI.border }} />
            <span style={{ fontFamily: monoFont, fontSize: '8pt', color: KAMI.stone }}>02</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6pt' }}>
            {sources.map((s, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  background: KAMI.ivory,
                  border: `0.5pt solid ${KAMI.border}`,
                  color: KAMI.darkWarm,
                  fontFamily: sansFont,
                  fontSize: '9pt',
                  padding: '3pt 10pt',
                  borderRadius: '4pt',
                }}
              >
                {String(i + 1).padStart(2, '0')}. {s.name}
              </span>
            ))}
          </div>
        </div>

        {/* Full Risk Detail */}
        <div style={{ marginBottom: '20pt', breakBefore: 'page' as const }}>
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
              风险详情
            </span>
            <span style={{ flex: 1, height: '0.5pt', background: KAMI.border }} />
            <span style={{ fontFamily: monoFont, fontSize: '8pt', color: KAMI.stone }}>03</span>
          </div>
          {r.risks.map((risk, i) => (
            <RiskCard key={risk.id} risk={risk} index={i} />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '30pt',
            paddingTop: '12pt',
            borderTop: `0.5pt solid ${KAMI.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: serifFont, fontSize: '8.5pt', color: KAMI.stone }}>
            由「有据」生成 · 好内容值得好纸张
          </span>
          <span style={{ fontFamily: monoFont, fontSize: '8pt', color: KAMI.stone }}>
            {now.toISOString().slice(0, 10)}
          </span>
        </div>
      </div>
    </div>
  )
}

function BriefReport({ result, sources, title }: PrintReportProps) {
  const r = result
  const now = new Date()

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
        {/* Memo header */}
        <div style={{ marginBottom: '24pt' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16pt',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: monoFont,
                  fontSize: '8pt',
                  color: KAMI.stone,
                  letterSpacing: '1.5pt',
                  textTransform: 'uppercase',
                  marginBottom: '4pt',
                }}
              >
                Memorandum
              </div>
              <h1
                style={{
                  fontFamily: serifFont,
                  fontSize: '20pt',
                  fontWeight: 500,
                  color: KAMI.nearBlack,
                  lineHeight: 1.2,
                  margin: '0',
                }}
              >
                {title}
              </h1>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontFamily: monoFont, fontSize: '8pt', color: KAMI.stone }}>
                {now.toLocaleDateString('zh-CN')}
              </div>
              <div
                style={{
                  fontFamily: monoFont,
                  fontSize: '8pt',
                  color: KAMI.stone,
                  marginTop: '2pt',
                }}
              >
                第 1 页
              </div>
            </div>
          </div>
          <div style={{ height: '0.5pt', background: KAMI.border }} />
          <div
            style={{
              display: 'flex',
              gap: '20pt',
              marginTop: '10pt',
              fontFamily: sansFont,
              fontSize: '8.5pt',
              color: KAMI.stone,
            }}
          >
            <div>
              <span style={{ color: KAMI.brand, fontWeight: 500 }}>收件人：</span>相关决策人
            </div>
            <div>
              <span style={{ color: KAMI.brand, fontWeight: 500 }}>发件人：</span>有据 AI
            </div>
            <div>
              <span style={{ color: KAMI.brand, fontWeight: 500 }}>主题：</span>信息对齐分析
            </div>
          </div>
          <div style={{ height: '0.5pt', background: KAMI.border, marginTop: '10pt' }} />
        </div>

        {/* TL;DR */}
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

        {/* Key Numbers */}
        <div style={{ marginBottom: '20pt', display: 'flex', gap: '10pt' }}>
          <div
            style={{
              flex: 1,
              background: r.summary.critical > 0 ? KAMI.dangerBg : KAMI.successBg,
              borderRadius: '6pt',
              padding: '12pt 14pt',
            }}
          >
            <div
              style={{
                fontFamily: monoFont,
                fontSize: '8pt',
                color: r.summary.critical > 0 ? KAMI.danger : KAMI.success,
                fontWeight: 600,
              }}
            >
              {r.summary.critical > 0 ? '需立即处理' : '状态良好'}
            </div>
            <div
              style={{
                fontFamily: serifFont,
                fontSize: '24pt',
                fontWeight: 500,
                color: r.summary.critical > 0 ? KAMI.danger : KAMI.success,
                lineHeight: 1.1,
                marginTop: '4pt',
              }}
            >
              {r.summary.critical}
            </div>
            <div
              style={{ fontFamily: sansFont, fontSize: '8pt', color: KAMI.stone, marginTop: '2pt' }}
            >
              严重风险
            </div>
          </div>
          <div
            style={{ flex: 1, background: KAMI.tagBg, borderRadius: '6pt', padding: '12pt 14pt' }}
          >
            <div
              style={{ fontFamily: monoFont, fontSize: '8pt', color: KAMI.brand, fontWeight: 600 }}
            >
              待确认
            </div>
            <div
              style={{
                fontFamily: serifFont,
                fontSize: '24pt',
                fontWeight: 500,
                color: KAMI.brand,
                lineHeight: 1.1,
                marginTop: '4pt',
              }}
            >
              {r.summary.warning}
            </div>
            <div
              style={{ fontFamily: sansFont, fontSize: '8pt', color: KAMI.stone, marginTop: '2pt' }}
            >
              项事项
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: KAMI.ivory,
              border: `0.5pt solid ${KAMI.border}`,
              borderRadius: '6pt',
              padding: '12pt 14pt',
            }}
          >
            <div
              style={{ fontFamily: monoFont, fontSize: '8pt', color: KAMI.stone, fontWeight: 600 }}
            >
              材料
            </div>
            <div
              style={{
                fontFamily: serifFont,
                fontSize: '24pt',
                fontWeight: 500,
                color: KAMI.nearBlack,
                lineHeight: 1.1,
                marginTop: '4pt',
              }}
            >
              {sources.length}
            </div>
            <div
              style={{ fontFamily: sansFont, fontSize: '8pt', color: KAMI.stone, marginTop: '2pt' }}
            >
              份已审核
            </div>
          </div>
        </div>

        {/* Action Items */}
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

        {/* Risk Summary Table */}
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

        {/* Footer note */}
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
      </div>
    </div>
  )
}

function LetterReport({ result, sources, title }: PrintReportProps) {
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
        {/* Letterhead */}
        <div style={{ textAlign: 'right' as const, marginBottom: '40pt' }}>
          <div
            style={{
              fontFamily: sansFont,
              fontSize: '8pt',
              color: KAMI.brand,
              fontWeight: 600,
              letterSpacing: '2pt',
              textTransform: 'uppercase',
            }}
          >
            YouJu
          </div>
          <div
            style={{ fontFamily: serifFont, fontSize: '10pt', color: KAMI.stone, marginTop: '4pt' }}
          >
            有据可依，有据可查
          </div>
        </div>

        {/* Date */}
        <div
          style={{
            marginBottom: '30pt',
            fontFamily: serifFont,
            fontSize: '10.5pt',
            color: KAMI.darkWarm,
          }}
        >
          {now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

        {/* Recipient */}
        <div style={{ marginBottom: '24pt' }}>
          <div
            style={{
              fontFamily: serifFont,
              fontSize: '12pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
              marginBottom: '3pt',
            }}
          >
            致相关方：
          </div>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: '20pt' }}>
          <span
            style={{
              fontFamily: serifFont,
              fontSize: '11pt',
              fontWeight: 500,
              color: KAMI.nearBlack,
            }}
          >
            事由：
          </span>
          <span
            style={{ fontFamily: serifFont, fontSize: '11pt', color: KAMI.brand, fontWeight: 500 }}
          >
            关于「{title}」的信息对齐确认函
          </span>
        </div>

        {/* Opening */}
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

        {/* Key points */}
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

        {/* Closing */}
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

        {/* Signature */}
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

        {/* Enclosure */}
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
          <div>1. 完整分析报告（共 {r.summary.total} 项风险）</div>
          <div>2. 原始材料清单（共 {sources.length} 份）</div>
        </div>
      </div>
    </div>
  )
}

export function PrintReport({
  result,
  sources,
  title = '信息对齐分析报告',
  style = 'standard',
}: PrintReportProps) {
  if (style === 'one-pager') {
    return <OnePagerReport result={result} sources={sources} title={title} style={style} />
  }
  if (style === 'list') {
    return <ListReport result={result} sources={sources} title={title} style={style} />
  }
  if (style === 'equity') {
    return <EquityReport result={result} sources={sources} title={title} style={style} />
  }
  if (style === 'brief') {
    return <BriefReport result={result} sources={sources} title={title} style={style} />
  }
  if (style === 'letter') {
    return <LetterReport result={result} sources={sources} title={title} style={style} />
  }
  return <StandardReport result={result} sources={sources} title={title} style={style} />
}
