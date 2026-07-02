import type { AnalyzeResult, Source } from '../types'

export function generateReportText(r: AnalyzeResult, srcs: Source[]): string {
  const lines = [
    '═'.repeat(50),
    '「有据」信息对齐分析报告',
    '═'.repeat(50),
    '',
    `生成时间：${new Date().toLocaleString()}`,
    '',
    '【一、材料概览】',
    ...srcs.map((s) => `- ${s.name}（${s.meta}）`),
    '',
    '【二、风险摘要】',
    `严重风险：${r.summary.critical} 个`,
    `需要确认：${r.summary.warning} 个`,
    `提示信息：${r.summary.info} 个`,
    '',
    '【三、风险点详情】',
    ...r.risks.map(
      (risk, i) => `
${i + 1}. 【${risk.level === 'critical' ? '⚠️ 严重' : risk.level === 'warning' ? '⚡ 需要确认' : '✓ 提示'}】${risk.title}
   类型：${risk.type === 'conflict' ? '直接矛盾' : risk.type === 'promise' ? '承诺未落文字' : risk.type === 'missing' ? '信息缺失' : '信息提示'}
   说明：${risk.description}
   来源：${(risk.evidence?.map((e) => e.sourceName) || risk.sources).join('、')}
`,
    ),
    '',
  ]

  if (r.alignedVersion) {
    lines.push('【四、统一版本参照】')
    lines.push(r.alignedVersion)
    lines.push('')
  }

  if (
    r.extractedEntities &&
    (r.extractedEntities.dates.length > 0 || r.extractedEntities.amounts.length > 0)
  ) {
    lines.push('【五、关键要素提取】')
    if (r.extractedEntities.dates.length > 0) {
      lines.push('日期要素：')
      r.extractedEntities.dates.forEach((d) => lines.push(`  - ${d.value}（来源：${d.source}）`))
    }
    if (r.extractedEntities.amounts.length > 0) {
      lines.push('金额要素：')
      r.extractedEntities.amounts.forEach((a) => lines.push(`  - ${a.value}（来源：${a.source}）`))
    }
    if (r.extractedEntities.terms.length > 0) {
      lines.push('条款要素：')
      r.extractedEntities.terms.forEach((t) => lines.push(`  - ${t.value}（来源：${t.source}）`))
    }
    if (r.extractedEntities.promises.length > 0) {
      lines.push('承诺要素（口头）：')
      r.extractedEntities.promises.forEach((p) => lines.push(`  - ${p.value}（来源：${p.source}）`))
    }
    lines.push('')
  }

  lines.push('─'.repeat(50))
  lines.push('由「有据」生成 - 有据可依，有据可查')
  lines.push('─'.repeat(50))

  return lines.join('\n')
}

export function generateReportMarkdown(r: AnalyzeResult, srcs: Source[]): string {
  const lines = [
    '# 「有据」信息对齐分析报告',
    '',
    `> 生成时间：${new Date().toLocaleString()}`,
    '',
    '## 一、材料概览',
    '',
    ...srcs.map((s) => `- **${s.name}**（${s.meta || s.type}）`),
    '',
    '## 二、风险摘要',
    '',
    `| 等级 | 数量 |`,
    `|------|------|`,
    `| 🔴 严重风险 | ${r.summary.critical} |`,
    `| 🟡 需要确认 | ${r.summary.warning} |`,
    `| 🔵 提示信息 | ${r.summary.info} |`,
    '',
    '## 三、风险点详情',
    '',
    ...r.risks.map(
      (risk, i) => `
### ${i + 1}. ${risk.level === 'critical' ? '🔴' : risk.level === 'warning' ? '🟡' : '🔵'} ${risk.title}

- **类型**：${risk.type === 'conflict' ? '直接矛盾' : risk.type === 'promise' ? '承诺未落文字' : risk.type === 'missing' ? '信息缺失' : '信息提示'}
- **说明**：${risk.description}
- **来源**：${(risk.evidence?.map((e) => e.sourceName) || risk.sources).join('、')}
`,
    ),
    '',
  ]

  if (r.alignedVersion) {
    lines.push('## 四、统一版本参照')
    lines.push('')
    lines.push('```')
    lines.push(r.alignedVersion)
    lines.push('```')
    lines.push('')
  }

  if (r.checklist && r.checklist.length > 0) {
    lines.push('## 五、检查清单')
    lines.push('')
    r.checklist.forEach((item) => {
      lines.push(`- [ ] ${item.text}`)
    })
    lines.push('')
  }

  if (
    r.extractedEntities &&
    (r.extractedEntities.dates.length > 0 || r.extractedEntities.amounts.length > 0)
  ) {
    lines.push('## 六、关键要素提取')
    lines.push('')
    if (r.extractedEntities.dates.length > 0) {
      lines.push('### 📅 日期要素')
      lines.push('')
      r.extractedEntities.dates.forEach((d) => lines.push(`- ${d.value}（来源：${d.source}）`))
      lines.push('')
    }
    if (r.extractedEntities.amounts.length > 0) {
      lines.push('### 💰 金额要素')
      lines.push('')
      r.extractedEntities.amounts.forEach((a) => lines.push(`- ${a.value}（来源：${a.source}）`))
      lines.push('')
    }
    if (r.extractedEntities.terms.length > 0) {
      lines.push('### 📝 条款要素')
      lines.push('')
      r.extractedEntities.terms.forEach((t) => lines.push(`- ${t.value}（来源：${t.source}）`))
      lines.push('')
    }
    if (r.extractedEntities.promises.length > 0) {
      lines.push('### 💬 承诺要素（口头）')
      lines.push('')
      r.extractedEntities.promises.forEach((p) => lines.push(`- ${p.value}（来源：${p.source}）`))
      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')
  lines.push('*由「有据」生成 - 有据可依，有据可查*')

  return lines.join('\n')
}
