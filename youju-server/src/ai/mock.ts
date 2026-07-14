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

  const validationResults = risks.map((risk) => {
    const evidenceCount = risk.evidence.length
    const allSourceNames = sources.map((s) => s.name)
    const evidenceSourceNames = risk.evidence.map((e) => e.sourceName)
    const missingSources = allSourceNames.filter((s) => !evidenceSourceNames.includes(s))

    const conflicts: { dimension: string; conflictingSources: string[] }[] = []
    if (risk.type === 'conflict') {
      const conflictSources = [...new Set(evidenceSourceNames)]
      if (conflictSources.length > 1) {
        conflicts.push({
          dimension: risk.dimension,
          conflictingSources: conflictSources,
        })
      }
    }

    const avgConfidence =
      evidenceCount > 0
        ? risk.evidence.reduce((sum, e) => sum + (e.confidence || 0), 0) / evidenceCount
        : risk.confidence || 0

    return {
      riskId: risk.id,
      isValid: evidenceCount > 0 && missingSources.length === 0,
      evidenceCount,
      missingSources,
      conflicts,
      confidence: Math.round(avgConfidence * 100) / 100,
    }
  })

  return { associations, relatedRiskIds, conflictPairs, validationResults }
}

function categorizeEntities(entities: ExtractedEntity[]) {
  const DIMENSION_CATEGORIES: Record<string, 'dates' | 'amounts' | 'terms' | 'promises'> = {
    salary: 'amounts',
    compensation: 'amounts',
    amount: 'amounts',
    price: 'amounts',
    deposit: 'amounts',
    payment: 'amounts',
    rent: 'amounts',
    fee: 'amounts',
    cost: 'amounts',
    bonus: 'amounts',
    date: 'dates',
    deadline: 'dates',
    duration: 'dates',
    start_date: 'dates',
    end_date: 'dates',
    move_in: 'dates',
    trial: 'terms',
    probation: 'terms',
    benefits: 'terms',
    welfare: 'terms',
    responsibilities: 'terms',
    terms: 'terms',
    conditions: 'terms',
    location: 'terms',
    liability: 'terms',
    termination: 'terms',
  }

  const result = {
    dates: [] as ExtractedEntity[],
    amounts: [] as ExtractedEntity[],
    terms: [] as ExtractedEntity[],
    promises: [] as ExtractedEntity[],
  }

  for (const entity of entities) {
    const dim = entity.dimension.toLowerCase()
    let category: 'dates' | 'amounts' | 'terms' | 'promises' = 'terms'

    for (const [key, cat] of Object.entries(DIMENSION_CATEGORIES)) {
      if (dim.includes(key)) {
        category = cat
        break
      }
    }

    result[category].push(entity)
  }

  return result
}

function extractMockEntities(sources: Source[]): ExtractedEntity[] {
  const entities: ExtractedEntity[] = []
  const amountPatterns = [
    { pattern: /(\d{2,3}[k千万万])/gi, dimension: 'amount', label: '金额' },
    {
      pattern: /(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*元)/gi,
      dimension: 'amount_cny',
      label: '人民币金额',
    },
    { pattern: /(\d+)\s*个月/gi, dimension: 'duration_months', label: '月数' },
  ]

  for (const source of sources) {
    for (const { pattern, dimension } of amountPatterns) {
      const matches = source.content.match(pattern)
      if (matches) {
        for (const match of matches.slice(0, 2)) {
          entities.push({
            dimension,
            value: match,
            evidence: {
              sourceName: source.name,
              sourceType: source.type,
              sourceId: source.id,
              quote: source.content.substring(0, 80),
              confidence: 0.85,
            },
          })
        }
      }
    }
  }

  const promiseKeywords = ['调薪', '年终奖', '包水', '包电', '报销', '补贴', '养宠']
  for (const keyword of promiseKeywords) {
    const matchedSources = sources.filter((s) => s.content.includes(keyword))
    for (const source of matchedSources.slice(0, 2)) {
      entities.push({
        dimension: `promise_${keyword}`,
        value: keyword,
        evidence: {
          sourceName: source.name,
          sourceType: source.type,
          sourceId: source.id,
          quote: source.content.substring(0, 80),
          confidence: 0.8,
        },
      })
    }
  }

  return entities
}

function buildMockSummary(risks: Risk[], sources: Source[]): string {
  const critical = risks.filter((r) => r.level === 'critical').length
  const warning = risks.filter((r) => r.level === 'warning').length
  const info = risks.filter((r) => r.level === 'info').length

  if (risks.length === 0) {
    return `共分析 ${sources.length} 份材料，未发现明显风险或信息不一致。建议结合实际情况进一步确认关键条款。`
  }

  const riskTitles = risks
    .slice(0, 3)
    .map((r) => r.title)
    .join('、')
  let levelDesc = ''
  if (critical > 0) {
    levelDesc = `${critical} 处严重风险`
  }
  if (warning > 0) {
    levelDesc += levelDesc ? `，${warning} 处警告` : `${warning} 处警告`
  }
  if (info > 0) {
    levelDesc += levelDesc ? `，${info} 处提示` : `${info} 处提示`
  }

  return `发现 ${risks.length} 处潜在风险（${levelDesc}）。主要问题：${riskTitles}。建议逐项确认并争取书面补充约定。`
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
          sourceId: s.id,
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
          sourceId: s.id,
          quote: s.content.substring(0, 80),
          confidence: 0.8,
        })),
      })
    }
  }

  const critical = risks.filter((r) => r.level === 'critical').length
  const warning = risks.filter((r) => r.level === 'warning').length
  const info = risks.filter((r) => r.level === 'info').length

  const extractedEntitiesRaw = extractMockEntities(sources)
  const extractedEntities = categorizeEntities(extractedEntitiesRaw)
  const riskRelations = computeRiskRelations(risks, sources)
  const summaryText = buildMockSummary(risks, sources)

  const allDimensions = [
    ...new Set([...extractedEntitiesRaw.map((e) => e.dimension), ...risks.map((r) => r.dimension)]),
  ]

  return {
    summary: { critical, warning, info, total: risks.length },
    scenario: {
      type: 'mock_analysis',
      description: 'Mock 模式 - 基于规则匹配的简易分析',
      keyDimensions: allDimensions,
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
    extractedEntities,
    riskRelations,
    reasoningTrace: [
      {
        step: 'SCENARIO_DISCOVERY',
        stepId: 'step-scenario-discovery',
        title: '场景识别与理解',
        description: '分析材料内容，识别场景类型和核心议题',
        result: 'Mock 模式，基于材料类型推断场景',
        detail: `输入 ${sources.length} 份材料，类型包括 ${[...new Set(sources.map((s) => s.type))].join('、')}。根据材料特征推断为通用信息对齐分析场景。`,
        status: 'completed',
      },
      {
        step: 'INPUT_PARSING',
        stepId: 'step-input-parsing',
        title: '多材料结构化解析',
        description: '逐份解析材料内容，提取结构化信息',
        result: `${sources.length} 份材料解析完成`,
        detail: `共 ${sources.length} 份材料，总字符数 ${sources.reduce((acc, s) => acc + s.content.length, 0)}。正式文件 ${formalSources.length} 份，非正式材料 ${informalSources.length} 份。`,
        status: 'completed',
      },
      {
        step: 'DIMENSION_DISCOVERY',
        stepId: 'step-dimension-discovery',
        title: '分析维度发现与归纳',
        description: '从材料中发现需要重点比对的分析维度',
        result: `发现 ${allDimensions.length} 个关键维度`,
        detail: `从金额、承诺、时间等维度提取了 ${allDimensions.length} 个关键维度：${allDimensions.slice(0, 5).join('、')}${allDimensions.length > 5 ? ' 等' : ''}。`,
        status: 'completed',
      },
      {
        step: 'CROSS_SOURCE_EXTRACTION',
        stepId: 'step-cross-source-extraction',
        title: '跨源要素提取',
        description: '按维度从各材料中提取对应的要素值',
        result: `提取 ${extractedEntitiesRaw.length} 条实体数据`,
        detail: `跨来源对比提取了 ${extractedEntitiesRaw.length} 条实体，分布在 ${Object.keys(extractedEntities).filter((k) => extractedEntities[k as keyof typeof extractedEntities].length > 0).length} 个类别中。`,
        status: 'completed',
      },
      {
        step: 'DISCREPANCY_DETECTION',
        stepId: 'step-discrepancy-detection',
        title: '冲突与差异检测',
        description: '交叉比对各材料，识别不一致、冲突和潜在风险',
        result: `发现 ${risks.length} 个风险点`,
        detail: `共检测到 ${risks.length} 处风险：conflict 类型 ${risks.filter((r) => r.type === 'conflict').length} 个，promise 类型 ${risks.filter((r) => r.type === 'promise').length} 个，missing 类型 ${risks.filter((r) => r.type === 'missing').length} 个。`,
        status: 'completed',
      },
      {
        step: 'SELF_CHECK',
        stepId: 'step-self-check',
        title: '证据链校验与自我验证',
        description: '验证每项结论的证据支撑，生成检查清单和共识版本',
        result: '已完成风险质量审查',
        detail: `审查了 ${risks.length} 条候选风险：所有风险均有至少 1 条证据支撑，置信度均 ≥ 0.7，符合质量闸门要求。审查前后数量一致，无误报需移除。`,
        status: 'completed',
      },
      {
        step: 'FINAL_OUTPUT',
        stepId: 'step-final-output',
        title: '最终报告组装与输出',
        description: '汇总前序步骤结果，生成结构化分析报告',
        result: '完成 Mock 分析',
        detail: `格式校验通过，schema 合规。最终输出 ${risks.length} 条风险、${allDimensions.length} 个维度、${extractedEntitiesRaw.length} 条提取实体。`,
        status: 'completed',
      },
    ],
    uncertainties: [
      '当前为 Mock 模式，分析结果基于关键词规则匹配，可能不准确。配置 AI_API_KEY 启用真实 AI 分析。',
    ],
    debugInfo: {
      model: 'mock-rule-engine',
      tokenPrompt: 0,
      tokenCompletion: 0,
      tokenTotal: 0,
      rawOutput: summaryText,
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

  const allEntities = [
    ...fullResult.extractedEntities.dates,
    ...fullResult.extractedEntities.amounts,
    ...fullResult.extractedEntities.terms,
    ...fullResult.extractedEntities.promises,
  ]
  const byDimension: Record<string, ExtractedEntity[]> = {}
  for (const entity of allEntities) {
    if (!byDimension[entity.dimension]) {
      byDimension[entity.dimension] = []
    }
    byDimension[entity.dimension].push(entity)
  }

  const extractionData = {
    entities: allEntities,
    byDimension,
    totalExtracted: allEntities.length,
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
    checklist: fullResult.checklist.map((c) => ({ text: c.text })),
    aligned_version: fullResult.alignedVersion,
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
  const allEntities = [
    ...result.extractedEntities.dates,
    ...result.extractedEntities.amounts,
    ...result.extractedEntities.terms,
    ...result.extractedEntities.promises,
  ]
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
    extracted_entities: allEntities.map((e) => ({
      dimension: e.dimension,
      value: e.value,
      evidence: {
        sourceName: e.evidence.sourceName,
        sourceType: e.evidence.sourceType,
        sourceId: e.evidence.sourceId,
        quote: e.evidence.quote,
        confidence: e.evidence.confidence,
      },
    })),
    risks: result.risks.map((r) => ({
      dimension: r.dimension,
      type: r.type,
      level: r.level,
      title: r.title,
      description: r.description,
      evidence: r.evidence.map((e) => ({
        sourceName: e.sourceName,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        quote: e.quote,
        confidence: e.confidence,
      })),
    })),
    checklist: result.checklist.map((c) => ({ text: c.text })),
    aligned_version: result.alignedVersion,
    reasoning_trace: (result.reasoningTrace || []).map((r) => ({
      step: r.step,
      result: r.result,
      detail: r.detail,
    })),
    uncertainties: result.uncertainties || [],
  }
}
