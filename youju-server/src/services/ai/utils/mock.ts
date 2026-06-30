// ============================================================
// 有据 AI - Mock Fallback
// 当没有配置 AI API Key 时的兜底分析（基于规则的简易模式）
// ============================================================

import type { Source, AnalyzeResult, Risk } from '../types'
import { computeRiskRelations, categorizeEntities } from '../utils/relations'

export function mockAnalyze(sources: Source[]): AnalyzeResult {
  const risks: Risk[] = []
  const allText = sources.map(s => s.content.toLowerCase()).join(' ')

  const amountMatches = allText.match(/(\d{2,3}[k千万万])/gi)
  if (amountMatches && amountMatches.length > 1) {
    const unique = [...new Set(amountMatches)]
    if (unique.length > 1) {
      const matchedSources = sources.filter(s =>
        amountMatches.some(m => s.content.toLowerCase().includes(m.toLowerCase()))
      )
      risks.push({
        id: 'r1',
        dimension: 'amount_conflict',
        level: 'critical',
        type: 'conflict',
        title: '金额/薪资存在冲突',
        description: `不同材料中提到了不同的金额数字（${unique.join(' / ')}），请确认以哪个为准。`,
        sources: matchedSources.map(s => s.name),
        evidence: matchedSources.slice(0, 2).map(s => ({
          sourceName: s.name,
          sourceType: s.type,
          quote: s.content.substring(0, 80),
          confidence: 0.7,
        })),
      })
    }
  }

  const promiseKeywords = ['调薪', '年终奖', '包水', '包电', '报销', '补贴', '养宠']
  const informalTypes = ['chat', 'screenshot']
  const formalTypes = ['contract', 'doc']

  const informalSources = sources.filter(s => informalTypes.includes(s.type))
  const formalSources = sources.filter(s => formalTypes.includes(s.type))

  for (const keyword of promiseKeywords) {
    const mentionedInformal = informalSources.filter(s => s.content.includes(keyword))
    const mentionedFormal = formalSources.filter(s => s.content.includes(keyword))

    if (mentionedInformal.length > 0 && mentionedFormal.length === 0) {
      risks.push({
        id: `p-${keyword}`,
        dimension: `promise_${keyword}`,
        level: 'warning',
        type: 'promise',
        title: `"${keyword}"承诺未落实到正式文件`,
        description: `聊天记录中提到了"${keyword}"，但在正式文件中未找到相关内容，建议要求书面确认。`,
        sources: mentionedInformal.map(s => s.name),
        evidence: mentionedInformal.slice(0, 1).map(s => ({
          sourceName: s.name,
          sourceType: s.type,
          quote: s.content.substring(0, 80),
          confidence: 0.8,
        })),
      })
    }
  }

  const critical = risks.filter(r => r.level === 'critical').length
  const warning = risks.filter(r => r.level === 'warning').length
  const info = risks.filter(r => r.level === 'info').length

  const riskRelations = computeRiskRelations(risks, sources)

  return {
    summary: { critical, warning, info, total: risks.length },
    scenario: {
      type: 'mock_analysis',
      description: 'Mock 模式 - 基于规则匹配的简易分析',
      keyDimensions: ['amount', 'promises'],
    },
    risks,
    checklist: risks.filter(r => r.level !== 'info').map((r, i) => ({
      id: `t${i + 1}`,
      text: `确认：${r.title}`,
      hasDraft: true,
      riskType: r.type,
      dimension: r.dimension,
    })),
    alignedVersion: '【Mock 模式】请配置 AI_API_KEY 启用真实 AI 分析，获得更准确的结果。',
    extractedEntities: categorizeEntities([]),
    riskRelations,
    reasoningTrace: [
      { step: 'SCENARIO_DISCOVERY', result: 'Mock 模式，跳过场景识别' },
      { step: 'DIMENSION_DISCOVERY', result: '基于关键词规则提取维度' },
      { step: 'CROSS_SOURCE_EXTRACTION', result: `解析 ${sources.length} 份材料` },
      { step: 'DISCREPANCY_DETECTION', result: `发现 ${risks.length} 个风险点` },
      { step: 'EVIDENCE_VALIDATION', result: '规则匹配，置信度中等' },
      { step: 'SELF_CHECK', result: '已通过基本校验' },
      { step: 'FINAL_OUTPUT', result: '完成 Mock 分析' },
    ],
    uncertainties: ['当前为 Mock 模式，分析结果基于关键词规则匹配，可能不准确。配置 AI_API_KEY 启用真实 AI 分析。'],
    debugInfo: {
      model: 'mock-rule-engine',
      tokenPrompt: 0,
      tokenCompletion: 0,
      tokenTotal: 0,
      rawOutput: JSON.stringify({ risks, checklist: risks.filter(r => r.level !== 'info').map(r => ({ text: r.title })) }, null, 2),
      systemPromptPreview: 'Mock 模式：基于关键词规则的简易分析引擎，无系统提示词',
      userPromptPreview: `Mock 模式输入：${sources.length} 份材料，${sources.reduce((acc, s) => acc + s.content.length, 0)} 字符`,
      isMock: true,
    },
  }
}

export function mockGenerateDraft(
  risk: { title: string; description: string; evidence: { quote: string; sourceName: string }[] }
): string {
  const quotes = risk.evidence.slice(0, 2).map(e => e.quote.substring(0, 60))
  const quoteSection = quotes.length > 0
    ? `\n我记得之前您提到过：\n${quotes.map(q => `  • 「${q}${q.length >= 60 ? '...' : ''}」`).join('\n')}\n`
    : ''

  return `您好，想跟您确认一下关于「${risk.title}」的事情。${quoteSection}
请问实际情况是怎样的？方便的话能否书面确认一下？谢谢！`
}
