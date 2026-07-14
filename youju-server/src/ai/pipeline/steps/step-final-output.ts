import type {
  AnalysisDimension,
  AnalyzeResult,
  ChecklistItem,
  Evidence,
  ExtractedEntity,
  ReasoningStep,
  Risk,
  RiskAssociation,
  ValidationResult,
} from '../../../domain/types.js'
import { CURRENT_PROMPT_VERSION } from '../../prompts/index.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'

interface ConflictPair {
  risk1Id: string
  risk2Id: string
  reason: string
}

interface RiskRelationsResult {
  associations: RiskAssociation[]
  relatedRiskIds: Record<string, string[]>
  conflictPairs: ConflictPair[]
  validationResults: ValidationResult[]
}

export const systemPromptFragment = `
Step 7: FINAL OUTPUT GENERATION
- Strictly follow JSON schema
- No extra text, no explanations outside schema
- No markdown formatting
- Raw JSON only
`

export const outputSchema = {
  result: {
    type: 'object',
    description: 'final analyze result',
  },
  summary: {
    type: 'object',
    description: 'risk summary',
  },
}

export const stepFinalOutput: StepExecutor = async (input: StepInput): Promise<StepOutput> => {
  const startTime = Date.now()

  // 从所有前序步骤的 data 收集（不再依赖 mainCallResult.parsed）
  const scenarioOutput = input.previousOutputs['step-scenario-discovery'] as
    | {
        scenario?: { type: string; description: string; keyDimensions?: string[] }
        reasoning_trace?: ReasoningStep[]
      }
    | undefined
  const scenario = scenarioOutput?.scenario

  const selfCheckOutput = input.previousOutputs['step-self-check'] as
    | {
        risks?: Risk[]
        checklist?: Array<{ text?: string }>
        aligned_version?: string
        uncertainties?: string[]
        reasoning_trace?: ReasoningStep[]
      }
    | undefined
  const discrepancyOutput = input.previousOutputs['step-discrepancy-detection'] as
    | { risks?: Risk[]; reasoning_trace?: ReasoningStep[] }
    | undefined
  const extractionOutput = input.previousOutputs['step-cross-source-extraction'] as
    | {
        entities?: Array<{ dimension: string; value: string; evidence: Evidence }>
        reasoning_trace?: ReasoningStep[]
      }
    | undefined
  const dimensionOutput = input.previousOutputs['step-dimension-discovery'] as
    | {
        dimensions?: string[]
        categories?: Record<string, string[]>
        reasoning_trace?: ReasoningStep[]
      }
    | undefined

  // 优先使用自检后的 risks，回退到差异检测的 risks
  const rawRisks: Risk[] = selfCheckOutput?.risks || discrepancyOutput?.risks || []
  const entities = extractionOutput?.entities || []

  // 为 evidence 注入 sourceId 和 highlightedText（通过 sourceName 匹配 input.sources）
  const sourceNameToId: Record<string, string> = {}
  const sourceNameToContent: Record<string, string> = {}
  for (const s of input.sources) {
    sourceNameToId[s.name] = String(s.id || s.name)
    sourceNameToContent[s.name] = s.content || ''
  }
  const risks: Risk[] = rawRisks.map((r) => ({
    ...r,
    evidence: r.evidence.map((e) => {
      const sourceId = e.sourceId || sourceNameToId[e.sourceName] || ''
      const sourceContent = sourceNameToContent[e.sourceName] || ''
      // 从原文中提取高亮文本：取 quote 中前 30 个字符在原文中匹配
      let highlightedText: string | undefined
      if (e.quote && sourceContent) {
        if (sourceContent.includes(e.quote)) {
          highlightedText = e.quote
        } else {
          const shortQuote = e.quote.replace(/\s+/g, ' ').trim().substring(0, 30)
          const cleanContent = sourceContent.replace(/\s+/g, ' ')
          if (shortQuote && cleanContent.includes(shortQuote)) {
            highlightedText = shortQuote
          }
        }
      }
      return {
        ...e,
        sourceId,
        highlightedText,
      }
    }),
  }))

  // 兜底：如果 AI 仍返回英文 snake_case 维度名，做简单的可读化处理
  // 正常情况下 AI 已按 prompt 要求输出中文维度名，此函数仅作为兜底
  const ensureChineseDimension = (name: string): string => {
    if (!name) return name
    // 已是中文，直接返回
    if (/[\u4e00-\u9fa5]/.test(name)) return name
    // 英文 snake_case → 空格分隔（兜底，不期望走到这里）
    return name.replace(/_/g, ' ')
  }

  // 确保 dimension 字段为中文（兜底处理）
  const localizedRisks: Risk[] = risks.map((r) => ({
    ...r,
    dimension: r.dimension ? ensureChineseDimension(r.dimension) : r.dimension,
  }))

  const localizedEntities = entities.map((e) => ({
    ...e,
    dimension: ensureChineseDimension(e.dimension),
  }))

  const summary = {
    critical: localizedRisks.filter((r) => r.level === 'critical').length,
    warning: localizedRisks.filter((r) => r.level === 'warning').length,
    info: localizedRisks.filter((r) => r.level === 'info').length,
    total: localizedRisks.length,
  }

  // checklist 从 step-6 输出获取
  const checklist: ChecklistItem[] = (selfCheckOutput?.checklist || []).map(
    (c: { text?: string }, i: number) => ({
      id: `t${i + 1}`,
      text: c.text || '',
      hasDraft: true,
    }),
  )

  const entitiesWithSourceId = localizedEntities.map((e) => ({
    ...e,
    evidence: {
      ...e.evidence,
      sourceId:
        (e.evidence as any)?.sourceId ||
        sourceNameToId[(e.evidence as any)?.sourceName || ''] ||
        '',
    },
  }))
  const extractedEntities = categorizeEntities(entitiesWithSourceId)
  const riskRelations = computeRiskRelations(localizedRisks, input.sources)

  // 构建 dimensions 数据（从 step-dimension-discovery 获取维度列表，结合风险计数）
  const dimensionNames: string[] = dimensionOutput?.dimensions || []
  const dimensions: AnalysisDimension[] = dimensionNames.map((name, idx) => {
    const riskCount = risks.filter((r) => r.dimension === name).length
    return {
      id: `dim-${idx + 1}`,
      name: ensureChineseDimension(name),
      weight: 1,
      enabled: true,
      riskCount,
      isCustom: false,
      order: idx,
    }
  })

  const alignedVersion = selfCheckOutput?.aligned_version || ''
  const uncertainties = selfCheckOutput?.uncertainties || []

  // 构建全中文的标准化推理链（始终 7 步，与 landing 页承诺一致）
  const allReasoningTraces: ReasoningStep[] = []

  // 辅助函数：从 AI 返回的 reasoning_trace 中提取详细思考过程
  const extractDetail = (trace: ReasoningStep[] | undefined): string => {
    if (!trace || trace.length === 0) return ''
    return trace
      .map((r) => {
        const thought = (r as { thought?: string }).thought ?? r.detail ?? r.description ?? ''
        const observation = (r as { observation?: string }).observation ?? r.result ?? ''
        return thought ? `• ${thought}${observation ? ` → ${observation}` : ''}` : ''
      })
      .filter(Boolean)
      .join('\n')
  }

  const scenarioStep = scenarioOutput as
    | {
        scenario?: { type?: string; description?: string; keyDimensions?: string[] }
        reasoning?: string
        reasoning_trace?: ReasoningStep[]
      }
    | undefined
  allReasoningTraces.push({
    step: '场景识别',
    stepId: 'step-scenario-discovery',
    title: '场景识别与理解',
    description: '分析材料内容，识别场景类型和核心议题',
    detail: extractDetail(scenarioStep?.reasoning_trace),
    result: scenarioStep?.scenario
      ? `识别为${scenarioStep.scenario.type || '自定义'}场景：${scenarioStep.scenario.description || '待补充'}。关键维度：${(scenarioStep.scenario.keyDimensions || []).join('、') || '待发现'}`
      : '场景识别完成',
    status: 'completed',
  })

  const parsingStep = input.previousOutputs['step-input-parsing'] as
    | {
        sources?: Array<{ name?: string; type?: string; summary?: string }>
        reasoning?: string
        reasoning_trace?: ReasoningStep[]
      }
    | undefined
  allReasoningTraces.push({
    step: '材料解析',
    stepId: 'step-input-parsing',
    title: '多材料结构化解析',
    description: '逐份解析材料内容，提取结构化信息',
    detail: extractDetail(parsingStep?.reasoning_trace),
    result:
      parsingStep?.sources && parsingStep.sources.length > 0
        ? `已解析 ${parsingStep.sources.length} 份材料：${parsingStep.sources.map((p) => p.name || '未知材料').join('、')}`
        : '材料解析完成',
    status: 'completed',
  })

  const dimStep = dimensionOutput as
    | {
        dimensions?: string[]
        categories?: Record<string, string[]>
        reasoning?: string
        reasoning_trace?: ReasoningStep[]
      }
    | undefined
  allReasoningTraces.push({
    step: '维度发现',
    stepId: 'step-dimension-discovery',
    title: '分析维度发现与归纳',
    description: '从材料中发现需要重点比对的分析维度',
    detail: extractDetail(dimStep?.reasoning_trace),
    result:
      dimStep?.dimensions && dimStep.dimensions.length > 0
        ? `发现 ${dimStep.dimensions.length} 个关键分析维度：${dimStep.dimensions.map((d) => ensureChineseDimension(d)).join('、')}`
        : '维度分析完成',
    status: 'completed',
  })

  const extractStep = extractionOutput as
    | {
        entities?: Array<{ dimension: string; value: string }>
        totalExtracted?: number
        reasoning?: string
        reasoning_trace?: ReasoningStep[]
      }
    | undefined
  allReasoningTraces.push({
    step: '跨源提取',
    stepId: 'step-cross-source-extraction',
    title: '跨源要素提取',
    description: '按维度从各材料中提取对应的要素值',
    detail: extractDetail(extractStep?.reasoning_trace),
    result:
      extractStep?.entities && extractStep.entities.length > 0
        ? `共提取 ${extractStep.totalExtracted || extractStep.entities.length} 个要素，覆盖 ${dimStep?.dimensions?.length || 0} 个维度`
        : '要素提取完成',
    status: 'completed',
  })

  const discStep = discrepancyOutput as
    | { risks?: Risk[]; reasoning?: string; reasoning_trace?: ReasoningStep[] }
    | undefined
  const critical = discStep?.risks?.filter((r) => r.level === 'critical').length ?? 0
  const warning = discStep?.risks?.filter((r) => r.level === 'warning').length ?? 0
  const info = discStep?.risks?.filter((r) => r.level === 'info').length ?? 0
  allReasoningTraces.push({
    step: '差异检测',
    stepId: 'step-discrepancy-detection',
    title: '冲突与差异检测',
    description: '交叉比对各材料，识别不一致、冲突和潜在风险',
    detail: extractDetail(discStep?.reasoning_trace),
    result:
      discStep?.risks && discStep.risks.length > 0
        ? `发现 ${discStep.risks.length} 项风险：严重 ${critical} 项，警告 ${warning} 项，提示 ${info} 项`
        : '差异检测完成，未发现明显风险',
    status: 'completed',
  })

  const selfStep = selfCheckOutput as
    | {
        checklist?: Array<{ text?: string }>
        aligned_version?: string
        uncertainties?: string[]
        reasoning?: string
        reasoning_trace?: ReasoningStep[]
      }
    | undefined
  allReasoningTraces.push({
    step: '证据校验',
    stepId: 'step-self-check',
    title: '证据链校验与自我验证',
    description: '验证每项结论的证据支撑，生成检查清单和共识版本',
    detail: extractDetail(selfStep?.reasoning_trace),
    result: selfStep
      ? `生成 ${selfStep.checklist?.length || 0} 项核查清单，${selfStep.uncertainties?.length || 0} 项不确定性，已整理对齐共识版本`
      : '自我验证完成',
    status: 'completed',
  })

  // 第7步：最终输出组装
  allReasoningTraces.push({
    step: '报告生成',
    stepId: 'step-final-output',
    title: '最终报告组装与输出',
    description: '汇总前序步骤结果，生成结构化分析报告',
    result: `已组装完成：${localizedRisks.length} 项风险、${checklist.length} 项核查清单、${localizedEntities.length} 个要素、${dimensions.length} 个维度`,
    status: 'completed',
  })

  const finalResult: AnalyzeResult = {
    summary,
    scenario: scenario
      ? {
          type: scenario.type,
          description: scenario.description,
          keyDimensions: scenario.keyDimensions || [],
        }
      : undefined,
    risks: localizedRisks,
    checklist,
    alignedVersion,
    extractedEntities,
    riskRelations,
    reasoningTrace: allReasoningTraces,
    uncertainties,
    dimensions,
    debugInfo: {
      model: '',
      tokenPrompt: 0,
      tokenCompletion: 0,
      tokenTotal: 0,
      rawOutput: '',
      systemPromptPreview: '7-step independent AI pipeline (assembled by step-final-output)',
      userPromptPreview: '',
    },
  }

  return {
    data: {
      result: finalResult,
      summary,
      reasoning: '最终输出生成完成',
    },
    modelVersion: '',
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt: 0,
    tokenCompletion: 0,
    latencyMs: Date.now() - startTime,
  }
}

function categorizeEntities(
  entities: Array<{ dimension: string; value: string; evidence: Evidence }>,
): {
  dates: ExtractedEntity[]
  amounts: ExtractedEntity[]
  terms: ExtractedEntity[]
  promises: ExtractedEntity[]
} {
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

    result[category].push({
      dimension: entity.dimension,
      value: entity.value,
      evidence: entity.evidence,
    })
  }

  return result
}

function computeRiskRelations(
  risks: Risk[],
  sources: { name: string; type: string }[],
): RiskRelationsResult {
  const associations: RiskAssociation[] = []
  const relatedRiskIds: Record<string, string[]> = {}
  const conflictPairs: ConflictPair[] = []

  for (const risk of risks) {
    relatedRiskIds[risk.id] = []
  }

  // 按来源分组（用于展示证据链的来源分组）
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
  }

  // === 证据链条：只有强逻辑关联才建立 ===
  // 强关联条件（必须满足至少一条）：
  // 1. 同一维度 + conflict类型 + 引用了不同来源 → 直接矛盾关联
  // 2. 引用了相同来源中的相同/高度重叠原文 → 共同证据关联
  // 3. description 中包含对方的 dimension 或 title 关键词 → 因果关联

  const addRelation = (r1Id: string, r2Id: string) => {
    if (!relatedRiskIds[r1Id].includes(r2Id)) {
      relatedRiskIds[r1Id].push(r2Id)
    }
    if (!relatedRiskIds[r2Id].includes(r1Id)) {
      relatedRiskIds[r2Id].push(r1Id)
    }
  }

  for (let i = 0; i < risks.length; i++) {
    for (let j = i + 1; j < risks.length; j++) {
      const risk1 = risks[i]
      const risk2 = risks[j]
      let reason = ''

      // 条件1：同一维度的直接矛盾
      // 两个conflict风险在同一维度上，且引用了不同来源
      if (
        risk1.dimension &&
        risk2.dimension &&
        risk1.dimension === risk2.dimension &&
        risk1.type === 'conflict' &&
        risk2.type === 'conflict'
      ) {
        const sources1 = new Set(risk1.evidence.map((e) => e.sourceName))
        const sources2 = new Set(risk2.evidence.map((e) => e.sourceName))
        const hasOverlap = [...sources1].some((s) => sources2.has(s))
        const hasDifference =
          [...sources1].some((s) => !sources2.has(s)) || [...sources2].some((s) => !sources1.has(s))

        if (hasDifference) {
          // 引用了不同来源的同一维度 → 直接矛盾
          reason = `同一维度"${risk1.dimension}"存在跨来源的直接矛盾`
        } else if (hasOverlap && sources1.size > 1) {
          // 同一维度、同一组来源但多个冲突点
          reason = `同一维度"${risk1.dimension}"在同一来源中存在多重矛盾`
        }
      }

      // 条件2：共享原文证据
      // 两个风险引用了同一来源中相同或高度重叠的引用文本
      if (!reason) {
        for (const ev1 of risk1.evidence) {
          for (const ev2 of risk2.evidence) {
            if (ev1.sourceName !== ev2.sourceName) continue
            // 检查引用文本是否有重叠（至少20字符的公共子串）
            const quote1 = (ev1.quote || '').replace(/\s+/g, '')
            const quote2 = (ev2.quote || '').replace(/\s+/g, '')
            if (quote1.length < 20 || quote2.length < 20) continue

            // 检查是否有足够的文本重叠
            const shorter = quote1.length < quote2.length ? quote1 : quote2
            const longer = quote1.length < quote2.length ? quote2 : quote1
            let overlapFound = false
            for (let k = 0; k <= shorter.length - 20; k++) {
              const segment = shorter.substring(k, k + 20)
              if (longer.includes(segment)) {
                overlapFound = true
                break
              }
            }
            if (overlapFound) {
              reason = `引用了同一来源"${ev1.sourceName}"中的相同原文段落`
              break
            }
          }
          if (reason) break
        }
      }

      // 条件3：因果关联
      // 一个风险的 description 中包含另一个风险的 dimension 或 title
      if (!reason) {
        const desc1 = (risk1.description || '').toLowerCase()
        const desc2 = (risk2.description || '').toLowerCase()
        const dim1 = (risk1.dimension || '').toLowerCase()
        const dim2 = (risk2.dimension || '').toLowerCase()
        const title1 = (risk1.title || '').toLowerCase()
        const title2 = (risk2.title || '').toLowerCase()

        if (
          (dim2 && dim2.length > 1 && desc1.includes(dim2)) ||
          (title2 && title2.length > 2 && desc1.includes(title2))
        ) {
          reason = `风险描述直接涉及"${risk2.dimension || risk2.title}"`
        } else if (
          (dim1 && dim1.length > 1 && desc2.includes(dim1)) ||
          (title1 && title1.length > 2 && desc2.includes(title1))
        ) {
          reason = `风险描述直接涉及"${risk1.dimension || risk1.title}"`
        }
      }

      if (reason) {
        addRelation(risk1.id, risk2.id)
        conflictPairs.push({
          risk1Id: risk1.id,
          risk2Id: risk2.id,
          reason,
        })
      }
    }
  }

  // 计算验证结果：每个风险的证据完整性和置信度
  const validationResults = risks.map((risk) => {
    const evidenceCount = risk.evidence.length
    const riskSourceNames = risk.sources || []
    const evidenceSourceNames = risk.evidence.map((e) => e.sourceName)
    const missingSources = riskSourceNames.filter((s) => !evidenceSourceNames.includes(s))

    // 检测同一维度下的冲突来源
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

    const requiredMin = Math.max(1, Math.ceil(riskSourceNames.length * 0.5))
    const isValid = evidenceCount >= requiredMin && conflicts.length === 0

    return {
      riskId: risk.id,
      isValid,
      evidenceCount,
      missingSources,
      conflicts,
      confidence: Math.round(avgConfidence * 100) / 100,
    }
  })

  return { associations, relatedRiskIds, conflictPairs, validationResults }
}
