import { KAMI, monoFont, sansFont, serifFont } from '../constants'

interface PrintReportHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  date?: Date
  metaItems?: string[]
  variant?: 'standard' | 'one-pager' | 'list' | 'equity' | 'brief' | 'letter'
}

export function PrintReportHeader({
  title,
  eyebrow = 'YouJu Analysis Report',
  date = new Date(),
  metaItems,
  variant = 'standard',
}: PrintReportHeaderProps) {
  if (variant === 'equity') {
    return (
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
          {eyebrow || 'YouJu · Information Alignment Report'}
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
          {date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    )
  }

  if (variant === 'brief') {
    return (
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
              {date.toLocaleDateString('zh-CN')}
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
    )
  }

  if (variant === 'letter') {
    return (
      <>
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
            style={{
              fontFamily: serifFont,
              fontSize: '10pt',
              color: KAMI.stone,
              marginTop: '4pt',
            }}
          >
            有据可依，有据可查
          </div>
        </div>

        <div
          style={{
            marginBottom: '30pt',
            fontFamily: serifFont,
            fontSize: '10.5pt',
            color: KAMI.darkWarm,
          }}
        >
          {date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

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
      </>
    )
  }

  const isOnePager = variant === 'one-pager'
  const isList = variant === 'list'
  const titleSize = isOnePager || isList ? '22pt' : '28pt'
  const eyebrowSize = isOnePager || isList ? '8pt' : '8.5pt'
  const marginBottom = isOnePager || isList ? '20pt' : '32pt'
  const marginTop = isOnePager || isList ? '12pt' : '14pt'

  return (
    <div style={{ marginBottom }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6pt', marginBottom: '10pt' }}>
        <div style={{ width: '8pt', height: '1.5pt', background: KAMI.brand }} />
        <span
          style={{
            fontFamily: sansFont,
            fontSize: eyebrowSize,
            fontWeight: 600,
            color: KAMI.brand,
            letterSpacing: '1pt',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </span>
      </div>

      <h1
        style={{
          fontFamily: serifFont,
          fontSize: titleSize,
          fontWeight: 500,
          color: KAMI.nearBlack,
          lineHeight: 1.15,
          margin: '0 0 10pt 0',
        }}
      >
        {title}
      </h1>

      {metaItems && metaItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16pt',
            fontFamily: sansFont,
            fontSize: isOnePager || isList ? '8.5pt' : '9pt',
            color: KAMI.stone,
          }}
        >
          {metaItems.map((item, i) => (
            <span key={i}>
              {i > 0 && <span>·</span>}
              {i > 0 && <span> </span>}
              {item}
            </span>
          ))}
        </div>
      )}

      <div style={{ height: '0.5pt', background: KAMI.border, marginTop }} />
    </div>
  )
}
