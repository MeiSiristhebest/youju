import type { AnalyzeResult, Source } from '../types'

function safeAnalyzeResult(r: Partial<AnalyzeResult> | undefined | null) {
  const result = r || ({} as AnalyzeResult)
  return {
    ...result,
    summary: {
      critical: result.summary?.critical ?? 0,
      warning: result.summary?.warning ?? 0,
      info: result.summary?.info ?? 0,
      total: result.summary?.total ?? result.risks?.length ?? 0,
    },
    risks: (result.risks || []).map((risk) => ({
      ...risk,
      id: risk.id || `risk-${Math.random().toString(36).slice(2, 9)}`,
      title: risk.title || '未命名风险',
      description: risk.description || '',
      level: risk.level || 'info',
      type: risk.type || 'info',
      sources: risk.sources || [],
      evidence: risk.evidence || [],
      confidence: risk.confidence,
      dimension: risk.dimension,
    })),
    checklist: result.checklist || [],
    alignedVersion: result.alignedVersion || '',
    extractedEntities: result.extractedEntities
      ? {
          dates: result.extractedEntities.dates || [],
          amounts: result.extractedEntities.amounts || [],
          terms: result.extractedEntities.terms || [],
          promises: result.extractedEntities.promises || [],
        }
      : { dates: [], amounts: [], terms: [], promises: [] },
  }
}

function riskLevelLabel(level: string) {
  return level === 'critical' ? '严重' : level === 'warning' ? '需要确认' : '提示'
}

function riskLevelEmoji(level: string) {
  return level === 'critical' ? '🔴' : level === 'warning' ? '🟡' : '🔵'
}

function riskTypeLabel(type: string) {
  const map: Record<string, string> = {
    conflict: '直接矛盾',
    promise: '承诺未落文字',
    missing: '信息缺失',
    info: '信息提示',
  }
  return map[type] || type
}

function getRiskSourceNames(risk: { evidence?: { sourceName: string }[]; sources?: string[] }) {
  if (risk.evidence && risk.evidence.length > 0) {
    return risk.evidence.map((e) => e.sourceName)
  }
  return risk.sources || []
}

function hasExtractedEntities(extracted: {
  dates: unknown[]
  amounts: unknown[]
  terms: unknown[]
  promises: unknown[]
}) {
  return (
    extracted.dates.length > 0 ||
    extracted.amounts.length > 0 ||
    extracted.terms.length > 0 ||
    extracted.promises.length > 0
  )
}

export function generateReportText(
  result: AnalyzeResult | Partial<AnalyzeResult> | undefined | null,
  srcs: Source[] | undefined | null,
): string {
  const r = safeAnalyzeResult(result)
  const sources = srcs || []

  const lines: string[] = []

  lines.push('═'.repeat(50))
  lines.push('「有据」信息对齐分析报告')
  lines.push('═'.repeat(50))
  lines.push('')
  lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`)
  lines.push(`材料数量：${sources.length} 份`)
  lines.push(`风险总数：${r.summary.total} 项`)
  lines.push('')

  lines.push('【一、材料概览】')
  if (sources.length === 0) {
    lines.push('  （无材料）')
  } else {
    sources.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${s.name}${s.meta ? `（${s.meta}）` : ''}`)
    })
  }
  lines.push('')

  lines.push('【二、风险摘要】')
  lines.push(`  🔴 严重风险：${r.summary.critical} 个`)
  lines.push(`  🟡 需要确认：${r.summary.warning} 个`)
  lines.push(`  🔵 提示信息：${r.summary.info} 个`)
  lines.push(`  📊 总计：${r.summary.total} 个`)
  lines.push('')

  lines.push('【三、风险点详情】')
  if (r.risks.length === 0) {
    lines.push('  （未发现风险）')
  } else {
    r.risks.forEach((risk, i) => {
      const sourceNames = getRiskSourceNames(risk)
      lines.push('')
      lines.push(
        `${i + 1}. 【${riskLevelEmoji(risk.level)} ${riskLevelLabel(risk.level)}】${risk.title}`,
      )
      lines.push(`   类型：${riskTypeLabel(risk.type)}`)
      if (risk.dimension) {
        lines.push(`   维度：${risk.dimension}`)
      }
      if (risk.confidence !== undefined) {
        lines.push(`   置信度：${risk.confidence}%`)
      }
      lines.push(`   说明：${risk.description}`)
      if (sourceNames.length > 0) {
        lines.push(`   来源：${sourceNames.join('、')}`)
      }
      if (risk.evidence && risk.evidence.length > 0) {
        lines.push('   证据：')
        risk.evidence.forEach((ev, ei) => {
          const quote = ev.quote ? `「${ev.quote}」` : ''
          lines.push(`     ${ei + 1}. ${ev.sourceName}${quote ? ` — ${quote}` : ''}`)
        })
      }
    })
  }
  lines.push('')

  if (r.alignedVersion) {
    lines.push('【四、统一版本参照】')
    lines.push('─'.repeat(30))
    lines.push(r.alignedVersion)
    lines.push('─'.repeat(30))
    lines.push('')
  }

  if (r.checklist.length > 0) {
    const sectionNum = r.alignedVersion ? '五' : '四'
    lines.push(`【${sectionNum}、检查清单】`)
    r.checklist.forEach((item) => {
      lines.push(`  [${item.checked ? '✓' : ' '}] ${item.text}`)
    })
    lines.push('')
  }

  if (hasExtractedEntities(r.extractedEntities)) {
    let sectionNum = r.alignedVersion ? '六' : '五'
    if (r.checklist.length > 0) {
      sectionNum = r.alignedVersion ? '六' : '五'
    }
    if (r.checklist.length > 0 && r.alignedVersion) {
      sectionNum = '七'
    }
    lines.push(`【${sectionNum}、关键要素提取】`)
    if (r.extractedEntities.dates.length > 0) {
      lines.push('  📅 日期要素：')
      r.extractedEntities.dates.forEach((d) => {
        lines.push(`    - ${d.value}（来源：${d.source}）`)
      })
    }
    if (r.extractedEntities.amounts.length > 0) {
      lines.push('  💰 金额要素：')
      r.extractedEntities.amounts.forEach((a) => {
        lines.push(`    - ${a.value}（来源：${a.source}）`)
      })
    }
    if (r.extractedEntities.terms.length > 0) {
      lines.push('  📝 条款要素：')
      r.extractedEntities.terms.forEach((t) => {
        lines.push(`    - ${t.value}（来源：${t.source}）`)
      })
    }
    if (r.extractedEntities.promises.length > 0) {
      lines.push('  💬 承诺要素（口头）：')
      r.extractedEntities.promises.forEach((p) => {
        lines.push(`    - ${p.value}（来源：${p.source}）`)
      })
    }
    lines.push('')
  }

  lines.push('─'.repeat(50))
  lines.push('由「有据」生成 - 有据可依，有据可查')
  lines.push('─'.repeat(50))

  return lines.join('\n')
}

export function generateReportMarkdown(
  result: AnalyzeResult | Partial<AnalyzeResult> | undefined | null,
  srcs: Source[] | undefined | null,
): string {
  const r = safeAnalyzeResult(result)
  const sources = srcs || []

  const lines: string[] = []

  lines.push('# 「有据」信息对齐分析报告')
  lines.push('')
  lines.push(`> 生成时间：${new Date().toLocaleString('zh-CN')}`)
  lines.push(`> 材料数量：${sources.length} 份 · 风险总数：${r.summary.total} 项`)
  lines.push('')

  lines.push('## 一、材料概览')
  lines.push('')
  if (sources.length === 0) {
    lines.push('_（无材料）_')
  } else {
    sources.forEach((s) => {
      lines.push(`- **${s.name}**${s.meta ? `（${s.meta}）` : ''}`)
    })
  }
  lines.push('')

  lines.push('## 二、风险摘要')
  lines.push('')
  lines.push('| 等级 | 数量 |')
  lines.push('|------|------|')
  lines.push(`| 🔴 严重风险 | ${r.summary.critical} |`)
  lines.push(`| 🟡 需要确认 | ${r.summary.warning} |`)
  lines.push(`| 🔵 提示信息 | ${r.summary.info} |`)
  lines.push(`| 📊 **总计** | **${r.summary.total}** |`)
  lines.push('')

  lines.push('## 三、风险点详情')
  lines.push('')
  if (r.risks.length === 0) {
    lines.push('_未发现风险_')
  } else {
    r.risks.forEach((risk, i) => {
      const sourceNames = getRiskSourceNames(risk)
      lines.push('')
      lines.push(`### ${i + 1}. ${riskLevelEmoji(risk.level)} ${risk.title}`)
      lines.push('')
      lines.push(`- **类型**：${riskTypeLabel(risk.type)}`)
      if (risk.dimension) {
        lines.push(`- **维度**：${risk.dimension}`)
      }
      if (risk.confidence !== undefined) {
        lines.push(`- **置信度**：${risk.confidence}%`)
      }
      lines.push(`- **说明**：${risk.description}`)
      if (sourceNames.length > 0) {
        lines.push(`- **来源**：${sourceNames.join('、')}`)
      }
      if (risk.evidence && risk.evidence.length > 0) {
        lines.push('')
        lines.push('**证据明细：**')
        lines.push('')
        risk.evidence.forEach((ev, ei) => {
          lines.push(`${ei + 1}. _${ev.sourceName}_`)
          if (ev.quote) {
            lines.push(`   > ${ev.quote}`)
          }
        })
      }
    })
  }
  lines.push('')

  if (r.alignedVersion) {
    lines.push('## 四、统一版本参照')
    lines.push('')
    lines.push('```')
    lines.push(r.alignedVersion)
    lines.push('```')
    lines.push('')
  }

  if (r.checklist.length > 0) {
    const sectionNum = r.alignedVersion ? '五' : '四'
    lines.push(`## ${sectionNum}、检查清单`)
    lines.push('')
    r.checklist.forEach((item) => {
      lines.push(`- [${item.checked ? 'x' : ' '}] ${item.text}`)
    })
    lines.push('')
  }

  if (hasExtractedEntities(r.extractedEntities)) {
    let sectionNum = '五'
    if (r.alignedVersion && r.checklist.length > 0) {
      sectionNum = '七'
    } else if (r.alignedVersion || r.checklist.length > 0) {
      sectionNum = '六'
    }
    lines.push(`## ${sectionNum}、关键要素提取`)
    lines.push('')
    if (r.extractedEntities.dates.length > 0) {
      lines.push('### 📅 日期要素')
      lines.push('')
      r.extractedEntities.dates.forEach((d) => {
        lines.push(`- ${d.value}（来源：${d.source}）`)
      })
      lines.push('')
    }
    if (r.extractedEntities.amounts.length > 0) {
      lines.push('### 💰 金额要素')
      lines.push('')
      r.extractedEntities.amounts.forEach((a) => {
        lines.push(`- ${a.value}（来源：${a.source}）`)
      })
      lines.push('')
    }
    if (r.extractedEntities.terms.length > 0) {
      lines.push('### 📝 条款要素')
      lines.push('')
      r.extractedEntities.terms.forEach((t) => {
        lines.push(`- ${t.value}（来源：${t.source}）`)
      })
      lines.push('')
    }
    if (r.extractedEntities.promises.length > 0) {
      lines.push('### 💬 承诺要素（口头）')
      lines.push('')
      r.extractedEntities.promises.forEach((p) => {
        lines.push(`- ${p.value}（来源：${p.source}）`)
      })
      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')
  lines.push('*由「有据」生成 - 有据可依，有据可查*')

  return lines.join('\n')
}
