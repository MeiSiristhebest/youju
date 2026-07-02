import type {
  AIRawOutput,
  AnalyzeResult,
  ExtractedEntity,
  Risk,
  RiskAssociation,
  RiskRelations,
  Source,
} from '../domain/types.js'

function computeRiskRelations(risks: Risk[], sources: Source[]): RiskRelations {
  const associations: RiskAssociation[] = []
  const relatedRiskIds: Record<string, string[]> = {}
  const conflictPairs: { risk1Id: string; risk2Id: string; reason: string }[] = []

  for (const risk of risks) {
    relatedRiskIds[risk.id] = []
  }

  const sourceToRisks: Record<string, Risk[]> = {}
  for (const risk of risks) {
    for (const ev of risk.evidence) {
      if (!sourceToRisks[ev.sourceName]) {
        sourceToRisks[ev.sourceName] = []
      }
      if (!sourceToRisks[ev.sourceName].find((r) => r.id === risk.id)) {
        sourceToRisks[ev.sourceName].push(risk)
      }
    }
  }

  for (const sourceName of Object.keys(sourceToRisks)) {
    const sourceRisks = sourceToRisks[sourceName]
    const source = sources.find((s) => s.name === sourceName)
    const isConflict = sourceRisks.some((r) => r.type === 'conflict')

    associations.push({
      sourceName,
      sourceType: source?.type || 'unknown',
      riskIds: sourceRisks.map((r) => r.id),
      riskCount: sourceRisks.length,
      isConflict,
    })

    for (let i = 0; i < sourceRisks.length; i++) {
      for (let j = i + 1; j < sourceRisks.length; j++) {
        const risk1 = sourceRisks[i]
        const risk2 = sourceRisks[j]
        if (!relatedRiskIds[risk1.id].includes(risk2.id)) {
          relatedRiskIds[risk1.id].push(risk2.id)
        }
        if (!relatedRiskIds[risk2.id].includes(risk1.id)) {
          relatedRiskIds[risk2.id].push(risk1.id)
        }
      }
    }
  }

  const conflictRisks = risks.filter((r) => r.type === 'conflict')
  for (let i = 0; i < conflictRisks.length; i++) {
    for (let j = i + 1; j < conflictRisks.length; j++) {
      const risk1 = conflictRisks[i]
      const risk2 = conflictRisks[j]
      const commonSources = risk1.evidence
        .map((e) => e.sourceName)
        .filter((s) => risk2.evidence.some((e) => e.sourceName === s))
      if (commonSources.length > 0) {
        conflictPairs.push({
          risk1Id: risk1.id,
          risk2Id: risk2.id,
          reason: `都与"${commonSources.join('、')}"相关`,
        })
      }
    }
  }

  return { associations, relatedRiskIds, conflictPairs }
}

function categorizeEntities(_entities: ExtractedEntity[]) {
  const result = {
    dates: [] as ExtractedEntity[],
    amounts: [] as ExtractedEntity[],
    terms: [] as ExtractedEntity[],
    promises: [] as ExtractedEntity[],
  }
  return result
}

export function mockAnalyze(sources: Source[]): AnalyzeResult {
  const risks: Risk[] = []
  const allText = sources.map((s) => s.content.toLowerCase()).join(' ')

  const amountMatches = allText.match(/(\d{2,3}[k千万万])/gi)
  if (amountMatches && amountMatches.length > 1) {
    const unique = [...new Set(amountMatches)]
    if (unique.length > 1) {
      const matchedSources = sources.filter((s) =>
        amountMatches.some((m) => s.content.toLowerCase().includes(m.toLowerCase())),
      )
      risks.push({
        id: 'r1',
        dimension: 'amount_conflict',
        level: 'critical',
        type: 'conflict',
        title: '金额/薪资存在冲突',
        description: `不同材料中提到了不同的金额数字（${unique.join(' / ')}），请确认以哪个为准。`,
        sources: matchedSources.map((s) => s.name),
        evidence: matchedSources.slice(0, 2).map((s) => ({
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

  const informalSources = sources.filter((s) => informalTypes.includes(s.type))
  const formalSources = sources.filter((s) => formalTypes.includes(s.type))

  for (const keyword of promiseKeywords) {
    const mentionedInformal = informalSources.filter((s) => s.content.includes(keyword))
    const mentionedFormal = formalSources.filter((s) => s.content.includes(keyword))

    if (mentionedInformal.length > 0 && mentionedFormal.length === 0) {
      risks.push({
        id: `p-${keyword}`,
        dimension: `promise_${keyword}`,
        level: 'warning',
        type: 'promise',
        title: `"${keyword}"承诺未落实到正式文件`,
        description: `聊天记录中提到了"${keyword}"，但在正式文件中未找到相关内容，建议要求书面确认。`,
        sources: mentionedInformal.map((s) => s.name),
        evidence: mentionedInformal.slice(0, 1).map((s) => ({
          sourceName: s.name,
          sourceType: s.type,
          quote: s.content.substring(0, 80),
          confidence: 0.8,
        })),
      })
    }
  }

  const critical = risks.filter((r) => r.level === 'critical').length
  const warning = risks.filter((r) => r.level === 'warning').length
  const info = risks.filter((r) => r.level === 'info').length

  const riskRelations = computeRiskRelations(risks, sources)

  return {
    summary: { critical, warning, info, total: risks.length },
    scenario: {
      type: 'mock_analysis',
      description: 'Mock 模式 - 基于规则匹配的简易分析',
      keyDimensions: ['amount', 'promises'],
    },
    risks,
    checklist: risks
      .filter((r) => r.level !== 'info')
      .map((r, i) => ({
        id: `t${i + 1}`,
        text: `确认：${r.title}`,
        hasDraft: true,
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
    uncertainties: [
      '当前为 Mock 模式，分析结果基于关键词规则匹配，可能不准确。配置 AI_API_KEY 启用真实 AI 分析。',
    ],
    debugInfo: {
      model: 'mock-rule-engine',
      tokenPrompt: 0,
      tokenCompletion: 0,
      tokenTotal: 0,
      rawOutput: JSON.stringify(
        {
          risks,
          checklist: risks.filter((r) => r.level !== 'info').map((r) => ({ text: r.title })),
        },
        null,
        2,
      ),
      systemPromptPreview: 'Mock 模式：基于关键词规则的简易分析引擎，无系统提示词',
      userPromptPreview: `Mock 模式输入：${sources.length} 份材料，${sources.reduce((acc, s) => acc + s.content.length, 0)} 字符`,
      isMock: true,
    },
  }
}

export function mockGenerateDraft(risk: {
  title: string
  description: string
  evidence: { quote: string; sourceName: string }[]
}): string {
  const quotes = risk.evidence.slice(0, 2).map((e) => e.quote.substring(0, 60))
  const quoteSection =
    quotes.length > 0
      ? `\n我记得之前您提到过：\n${quotes.map((q) => `  • 「${q}${q.length >= 60 ? '...' : ''}」`).join('\n')}\n`
      : ''

  return `您好，想跟您确认一下关于「${risk.title}」的事情。${quoteSection}
请问实际情况是怎样的？方便的话能否书面确认一下？谢谢！`
}

export interface MockStepData {
  scenarioDiscovery: {
    scenario: { type: string; description: string; keyDimensions: string[] }
    reasoning: string
  }
  inputParsing: {
    sources: Array<{ name: string; type: string; length: number; formality: string }>
    totalSources: number
    totalChars: number
    reasoning: string
  }
  dimensionDiscovery: {
    dimensions: string[]
    dimensionCount: number
    categories: Record<string, string[]>
    reasoning: string
  }
  crossSourceExtraction: {
    entities: ExtractedEntity[]
    byDimension: Record<string, ExtractedEntity[]>
    totalExtracted: number
    reasoning: string
  }
  discrepancyDetection: {
    risks: Risk[]
    byType: Record<string, Risk[]>
    byLevel: Record<string, Risk[]>
    totalRisks: number
    reasoning: string
  }
  selfCheck: {
    risks: Risk[]
    checks: {
      hasEvidence: number
      evidenceRelevant: number
      typeCorrect: number
      levelJustified: number
      totalRisks: number
    }
    allPassed: boolean
    uncertainties: string[]
    reasoning: string
  }
  finalOutput: {
    result: AnalyzeResult
    summary: { critical: number; warning: number; info: number; total: number }
    reasoning: string
  }
}

export function generateMockStepData(sources: Source[]): MockStepData {
  const fullResult = mockAnalyze(sources)
  const risks = fullResult.risks

  const scenarioData = {
    scenario: fullResult.scenario
      ? {
          type: fullResult.scenario.type,
          description: fullResult.scenario.description,
          keyDimensions: fullResult.scenario.keyDimensions,
        }
      : { type: 'mock_analysis', description: 'Mock 模式', keyDimensions: [] as string[] },
    reasoning: 'Mock 模式，跳过场景识别',
  }

  const inputData = {
    sources: sources.map((s) => ({
      name: s.name,
      type: s.type,
      length: s.content.length,
      formality: ['contract', 'doc', 'web'].includes(s.type) ? 'formal' : 'informal',
    })),
    totalSources: sources.length,
    totalChars: sources.reduce((acc, s) => acc + s.content.length, 0),
    reasoning: '输入解析完成',
  }

  const dimensions: string[] = []
  if (fullResult.scenario?.keyDimensions) {
    dimensions.push(...fullResult.scenario.keyDimensions)
  }
  for (const risk of risks) {
    if (!dimensions.includes(risk.dimension)) {
      dimensions.push(risk.dimension)
    }
  }

  const categories: Record<string, string[]> = {
    financial: [],
    temporal: [],
    legal: [],
    quality: [],
    logistics: [],
    benefits: [],
    other: [],
  }
  for (const dim of dimensions) {
    const d = dim.toLowerCase()
    if (d.match(/salary|price|cost|fee|deposit|bonus|compensation|amount|pay|薪|金|钱|费/)) {
      categories.financial.push(dim)
    } else if (d.match(/date|deadline|duration|start|end|trial|period|time|期|时间|日期/)) {
      categories.temporal.push(dim)
    } else if (d.match(/liability|termination|responsibility|legal|contract|责任|义务|条款/)) {
      categories.legal.push(dim)
    } else if (d.match(/quality|scope|deliverable|spec|质量|范围/)) {
      categories.quality.push(dim)
    } else if (d.match(/location|delivery|logistics|地点|位置|交付/)) {
      categories.logistics.push(dim)
    } else if (d.match(/benefit|welfare|insurance|perk|福利|保险/)) {
      categories.benefits.push(dim)
    } else {
      categories.other.push(dim)
    }
  }

  const dimensionData = {
    dimensions,
    dimensionCount: dimensions.length,
    categories,
    reasoning: '基于关键词规则提取维度',
  }

  const entities: ExtractedEntity[] = []
  const byDimension: Record<string, ExtractedEntity[]> = {}

  const extractionData = {
    entities,
    byDimension,
    totalExtracted: entities.length,
    reasoning: `解析 ${sources.length} 份材料`,
  }

  const byType: Record<string, Risk[]> = {
    conflict: [],
    promise: [],
    missing: [],
    info: [],
  }
  for (const risk of risks) {
    if (byType[risk.type]) {
      byType[risk.type].push(risk)
    }
  }

  const byLevel: Record<string, Risk[]> = {
    critical: [],
    warning: [],
    info: [],
  }
  for (const risk of risks) {
    if (byLevel[risk.level]) {
      byLevel[risk.level].push(risk)
    }
  }

  const discrepancyData = {
    risks,
    byType,
    byLevel,
    totalRisks: risks.length,
    reasoning: `发现 ${risks.length} 个风险点`,
  }

  const checks = {
    hasEvidence: risks.filter((r) => r.evidence && r.evidence.length > 0).length,
    evidenceRelevant: risks.length,
    typeCorrect: risks.length,
    levelJustified: risks.length,
    totalRisks: risks.length,
  }

  const selfCheckData = {
    risks,
    checks,
    allPassed: checks.hasEvidence === checks.totalRisks,
    uncertainties: fullResult.uncertainties || [],
    reasoning: '已通过基本校验',
  }

  const finalData = {
    result: fullResult,
    summary: fullResult.summary,
    reasoning: '完成 Mock 分析',
  }

  return {
    scenarioDiscovery: scenarioData,
    inputParsing: inputData,
    dimensionDiscovery: dimensionData,
    crossSourceExtraction: extractionData,
    discrepancyDetection: discrepancyData,
    selfCheck: selfCheckData,
    finalOutput: finalData,
  }
}

export function mockRawOutput(sources: Source[]): AIRawOutput {
  const result = mockAnalyze(sources)
  return {
    task_type: 'information_alignment_analysis',
    summary: result.debugInfo?.rawOutput || '',
    scenario: result.scenario
      ? {
          type: result.scenario.type,
          description: result.scenario.description,
          key_dimensions: result.scenario.keyDimensions,
        }
      : undefined,
    extracted_entities: [],
    risks: result.risks.map((r) => ({
      dimension: r.dimension,
      type: r.type,
      level: r.level,
      title: r.title,
      description: r.description,
      evidence: r.evidence.map((e) => ({
        sourceName: e.sourceName,
        sourceType: e.sourceType,
        quote: e.quote,
        confidence: e.confidence,
      })),
    })),
    checklist: result.checklist.map((c) => ({ text: c.text })),
    aligned_version: result.alignedVersion,
    reasoning_trace: result.reasoningTrace || [],
    uncertainties: result.uncertainties || [],
  }
}
