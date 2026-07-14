import type {
  AnalysisLogRepository,
  AnalysisStepRepository,
  ScenarioKnowledgeRepository,
} from '../ports/repositories.js'
import type {
  DiffAnalysisResult,
  IncrementalAnalysisOptions,
  IncrementalAnalysisPort,
  RiskPreferencePort,
} from '../ports/servicePorts.js'

export type {
  DiffAnalysisResult,
  IncrementalAnalysisOptions,
  IncrementalAnalysisPort,
} from '../ports/servicePorts.js'

import { classifyRiskLevel } from '../rules/riskRules.js'
import type {
  AIAnalysisPort,
  AnalyzeResult,
  IncrementalChange,
  Risk,
  ScenarioKnowledge,
  Source,
} from '../types.js'

// 依赖声明：哪些步骤依赖于源材料
const SOURCE_DEPENDENT_STEPS = [
  'step-input-parsing',
  'step-cross-source-extraction',
  'step-discrepancy-detection',
  'step-self-check',
  'step-final-output',
]

// 步骤依赖关系图
const STEP_DEPENDENCIES: Record<string, string[]> = {
  'step-input-parsing': ['step-scenario-discovery'],
  'step-dimension-discovery': ['step-input-parsing'],
  'step-cross-source-extraction': ['step-dimension-discovery'],
  'step-discrepancy-detection': ['step-cross-source-extraction'],
  'step-self-check': ['step-discrepancy-detection'],
  'step-final-output': ['step-self-check'],
}

// ─────────────────────────────────────────────────────────────────────────────
// 纯函数：材料变更检测与步骤依赖分析
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 检测材料变更
 */
export function detectSourceChanges(
  existingSources: Source[],
  newSources: Source[],
): IncrementalChange {
  const existingIds = new Set(existingSources.map((s) => s.id))
  const newIds = new Set(newSources.map((s) => s.id))

  const addedSources = newSources.filter((s) => !existingIds.has(s.id))
  const removedSources = existingSources.filter((s) => !newIds.has(s.id))

  // 检测修改（相同ID但内容不同）
  const modifiedSources: Source[] = []
  for (const newSrc of newSources) {
    if (existingIds.has(newSrc.id)) {
      const existingSrc = existingSources.find((s) => s.id === newSrc.id)
      if (existingSrc && existingSrc.content !== newSrc.content) {
        modifiedSources.push(newSrc)
      }
    }
  }

  return {
    addedSources,
    removedSources,
    modifiedSources,
  }
}

/**
 * 分析哪些步骤受变更影响
 */
export function analyzeAffectedSteps(change: IncrementalChange): string[] {
  const hasChanges =
    change.addedSources.length > 0 ||
    change.removedSources.length > 0 ||
    change.modifiedSources.length > 0

  if (!hasChanges) {
    return []
  }

  // 所有源材料相关步骤都受影响
  const directlyAffected = SOURCE_DEPENDENT_STEPS

  // 计算下游影响（通过依赖图）
  const allAffected = new Set<string>(directlyAffected)

  for (const stepId of directlyAffected) {
    const downstream = findDownstreamSteps(stepId)
    downstream.forEach((ds) => allAffected.add(ds))
  }

  return Array.from(allAffected)
}

/**
 * 查找下游步骤
 */
export function findDownstreamSteps(stepId: string): string[] {
  const downstream: string[] = []
  const visited = new Set<string>()
  const queue = [stepId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    for (const [step, deps] of Object.entries(STEP_DEPENDENCIES)) {
      if (deps.includes(current) && !visited.has(step)) {
        downstream.push(step)
        queue.push(step)
      }
    }
  }

  return downstream
}

/**
 * 判断checkpoint是否可用
 */
export function canReuseCheckpoint(checkpoint: unknown, affectedSteps: string[]): boolean {
  const cp = checkpoint as { stepOutputs?: Record<string, unknown> }
  if (!cp?.stepOutputs) return false

  // 检查所有不受影响的步骤输出是否存在
  const unaffectedSteps = SOURCE_DEPENDENT_STEPS.filter((s) => !affectedSteps.includes(s))

  for (const stepId of unaffectedSteps) {
    if (!cp.stepOutputs[stepId]) {
      return false
    }
  }

  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// IncrementalAnalysisService（构造注入模式）
//
// 历史反模式：let _analysisLogRepo + _analysisStepRepo + _scenarioKnowledgeRepo
//            + _analysisPort 四个模块级可变单例
// 当前：通过构造函数接收四个必填依赖
// ─────────────────────────────────────────────────────────────────────────────

export class IncrementalAnalysisService implements IncrementalAnalysisPort {
  constructor(
    private readonly analysisLogRepo: AnalysisLogRepository,
    readonly _analysisStepRepo: AnalysisStepRepository,
    readonly _scenarioKnowledgeRepo: ScenarioKnowledgeRepository,
    private readonly analysisPort: AIAnalysisPort,
    private readonly riskPreferencePort?: RiskPreferencePort,
  ) {}

  private async sortRisks(
    result: AnalyzeResult,
    userId: number | null,
    sessionId: string | null,
  ): Promise<AnalyzeResult> {
    if (!this.riskPreferencePort) return result
    const weights = await this.riskPreferencePort.getUserRiskWeights(userId, sessionId)
    const sortedRisks = this.riskPreferencePort.sortRisksByPreference(result.risks, weights)
    return { ...result, risks: sortedRisks }
  }

  /**
   * 执行diff-based增量分析
   */
  async performDiffBasedIncrementalAnalysis(
    existingResult: AnalyzeResult,
    existingSources: Source[],
    newSources: Source[],
    scenarioType: string,
    scenarioKnowledge: ScenarioKnowledge[],
    options: IncrementalAnalysisOptions = {},
  ): Promise<DiffAnalysisResult> {
    const startTime = Date.now()

    // 1. 检测变更
    const change = detectSourceChanges(existingSources, newSources)

    // 2. 分析受影响步骤
    const affectedSteps = analyzeAffectedSteps(change)

    // 3. 判断是否需要完整重算
    const isFullRecompute =
      affectedSteps.length === 0 ||
      affectedSteps.includes('step-scenario-discovery') ||
      change.removedSources.length > existingSources.length * 0.5

    if (isFullRecompute) {
      // 完整重算
      const result = await this.performFullRecompute(
        newSources,
        scenarioType,
        scenarioKnowledge,
        options,
      )

      const sortedResult = await this.sortRisks(
        result,
        options.userId ?? null,
        options.sessionId ?? null,
      )

      return {
        change,
        affectedSteps,
        recomputedSteps: SOURCE_DEPENDENT_STEPS,
        reusedSteps: [],
        result: sortedResult,
        durationMs: Date.now() - startTime,
        isFullRecompute: true,
      }
    }

    // 4. 尝试从checkpoint恢复
    const checkpoint = options.analysisLogId
      ? await this.analysisLogRepo.getCheckpoint(options.analysisLogId)
      : null

    if (checkpoint && canReuseCheckpoint(checkpoint, affectedSteps)) {
      // 从checkpoint恢复并部分重算
      const result = await this.performPartialRecompute(
        checkpoint,
        affectedSteps,
        newSources,
        scenarioType,
        scenarioKnowledge,
        options,
      )

      const sortedResult = await this.sortRisks(
        result,
        options.userId ?? null,
        options.sessionId ?? null,
      )

      return {
        change,
        affectedSteps,
        recomputedSteps: affectedSteps,
        reusedSteps: SOURCE_DEPENDENT_STEPS.filter((s) => !affectedSteps.includes(s)),
        result: sortedResult,
        durationMs: Date.now() - startTime,
        isFullRecompute: false,
      }
    }

    // 5. 无法恢复checkpoint，执行智能部分重算
    const result = await this.performSmartPartialAnalysis(
      existingResult,
      change,
      affectedSteps,
      newSources,
      scenarioType,
      scenarioKnowledge,
      options,
    )

    const sortedResult = await this.sortRisks(
      result,
      options.userId ?? null,
      options.sessionId ?? null,
    )

    return {
      change,
      affectedSteps,
      recomputedSteps: affectedSteps,
      reusedSteps: SOURCE_DEPENDENT_STEPS.filter((s) => !affectedSteps.includes(s)),
      result: sortedResult,
      durationMs: Date.now() - startTime,
      isFullRecompute: false,
    }
  }

  /**
   * 完整重算
   */
  private async performFullRecompute(
    sources: Source[],
    scenarioType: string,
    scenarioKnowledge: ScenarioKnowledge[],
    _options: IncrementalAnalysisOptions,
  ): Promise<AnalyzeResult> {
    const {
      result: rawResult,
      steps: _stepSummaries,
      totalTokens: _totalTokens,
      isMock,
    } = await this.analysisPort.analyze(sources, {
      scenarioType,
      scenarioKnowledge,
      aiConfig: _options.aiConfig,
      isDemo: _options.isDemo,
    })

    const validatedRisks = rawResult.risks.map((risk) => ({
      ...risk,
      level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
    }))

    return {
      ...rawResult,
      risks: validatedRisks,
      summary: {
        critical: validatedRisks.filter((r) => r.level === 'critical').length,
        warning: validatedRisks.filter((r) => r.level === 'warning').length,
        info: validatedRisks.filter((r) => r.level === 'info').length,
        total: validatedRisks.length,
      },
      meta: {
        durationMs: Date.now() - 0,
        isMock,
        sourceCount: sources.length,
        sourceIds: sources.map((s) => s.id),
        isIncremental: false,
      },
    }
  }

  /**
   * 从checkpoint恢复并部分重算
   */
  private async performPartialRecompute(
    checkpoint: unknown,
    _affectedSteps: string[],
    sources: Source[],
    scenarioType: string,
    scenarioKnowledge: ScenarioKnowledge[],
    _options: IncrementalAnalysisOptions,
  ): Promise<AnalyzeResult> {
    // AIAnalysisPort.resumeFromCheckpoint 直接返回最终结果（含 final-output step 输出）
    // 若 port 不支持 checkpoint 恢复，降级为完整重算
    if (!this.analysisPort.resumeFromCheckpoint) {
      return this.performFullRecompute(sources, scenarioType, scenarioKnowledge, _options)
    }

    const { result: rawResult, isMock } = await this.analysisPort.resumeFromCheckpoint(
      sources,
      checkpoint as Parameters<NonNullable<AIAnalysisPort['resumeFromCheckpoint']>>[1],
      { scenarioType, scenarioKnowledge, aiConfig: _options.aiConfig, isDemo: _options.isDemo },
    )

    const validatedRisks = rawResult.risks.map((risk) => ({
      ...risk,
      level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
    }))

    return {
      ...rawResult,
      risks: validatedRisks,
      summary: {
        critical: validatedRisks.filter((r) => r.level === 'critical').length,
        warning: validatedRisks.filter((r) => r.level === 'warning').length,
        info: validatedRisks.filter((r) => r.level === 'info').length,
        total: validatedRisks.length,
      },
      meta: {
        isMock,
        sourceCount: sources.length,
        sourceIds: sources.map((s) => s.id),
        isIncremental: true,
      },
    }
  }

  /**
   * 智能部分分析（无checkpoint时）
   */
  private async performSmartPartialAnalysis(
    existingResult: AnalyzeResult,
    change: IncrementalChange,
    _affectedSteps: string[],
    sources: Source[],
    scenarioType: string,
    scenarioKnowledge: ScenarioKnowledge[],
    _options: IncrementalAnalysisOptions,
  ): Promise<AnalyzeResult> {
    // 只分析新增/修改的材料
    const changedSources = [...change.addedSources, ...change.modifiedSources]

    if (changedSources.length === 0) {
      // 只删除材料，更新现有结果
      return this.updateResultForRemovedSources(existingResult, change.removedSources, sources)
    }

    // 对变更材料进行分析
    const { result: rawResult } = await this.analysisPort.analyze(changedSources, {
      scenarioType,
      scenarioKnowledge,
      aiConfig: _options.aiConfig,
      isDemo: _options.isDemo,
    })

    // 智能合并结果
    const mergedRisks = this.mergeRisksSmart(existingResult.risks, rawResult.risks, change)
    const validatedRisks = mergedRisks.map((risk) => ({
      ...risk,
      level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
    }))

    return {
      ...existingResult,
      risks: validatedRisks,
      summary: {
        critical: validatedRisks.filter((r) => r.level === 'critical').length,
        warning: validatedRisks.filter((r) => r.level === 'warning').length,
        info: validatedRisks.filter((r) => r.level === 'info').length,
        total: validatedRisks.length,
      },
      meta: {
        ...existingResult.meta,
        sourceCount: sources.length,
        sourceIds: sources.map((s) => s.id),
        isIncremental: true,
        newRiskCount: rawResult.risks?.length || 0,
      },
    }
  }

  /**
   * 更新结果（仅删除材料时）
   */
  private updateResultForRemovedSources(
    existingResult: AnalyzeResult,
    removedSources: Source[],
    allSources: Source[],
  ): AnalyzeResult {
    const removedIds = new Set(removedSources.map((s) => s.id))

    // 过滤掉只涉及已删除材料的风险
    const filteredRisks = existingResult.risks.filter((risk) => {
      const riskSourceIds = new Set(risk.sources)
      const hasRemainingSources =
        riskSourceIds.size > removedIds.size ||
        !Array.from(riskSourceIds).every((id: string) => removedIds.has(id))
      return hasRemainingSources
    })

    // 更新证据，移除已删除材料的引用
    const updatedRisks = filteredRisks.map((risk) => ({
      ...risk,
      evidence: risk.evidence.filter((ev) => !removedIds.has(ev.sourceName)),
      sources: risk.sources.filter((s) => !removedIds.has(s)),
    }))

    const validatedRisks = updatedRisks.map((risk) => ({
      ...risk,
      level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
    }))

    return {
      ...existingResult,
      risks: validatedRisks,
      summary: {
        critical: validatedRisks.filter((r) => r.level === 'critical').length,
        warning: validatedRisks.filter((r) => r.level === 'warning').length,
        info: validatedRisks.filter((r) => r.level === 'info').length,
        total: validatedRisks.length,
      },
      meta: {
        ...existingResult.meta,
        sourceCount: allSources.length,
        sourceIds: allSources.map((s) => s.id),
        isIncremental: true,
      },
    }
  }

  /**
   * 智能合并风险
   */
  private mergeRisksSmart(
    existingRisks: Risk[],
    newRisks: Risk[],
    change: IncrementalChange,
  ): Risk[] {
    const removedIds = new Set(change.removedSources.map((s) => s.id))
    const addedIds = new Set(change.addedSources.map((s) => s.id))
    const modifiedIds = new Set(change.modifiedSources.map((s) => s.id))

    // 保留不涉及变更材料的现有风险
    const preservedRisks = existingRisks.filter((risk: Risk) => {
      const riskSources = new Set(risk.sources)
      const involvesChange = Array.from(riskSources).some(
        (id: string) => removedIds.has(id) || addedIds.has(id) || modifiedIds.has(id),
      )
      return !involvesChange
    })

    // 添加新风险
    const merged = [...preservedRisks, ...newRisks]

    // 更新ID
    return merged.map((risk, index) => ({
      ...risk,
      id: `r${index + 1}`,
    }))
  }
}
