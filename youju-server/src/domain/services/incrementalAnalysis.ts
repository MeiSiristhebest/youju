import { AnalysisAdapter } from '../../ai/adapters/analysisAdapter.js'
import { PipelineExecutor } from '../../ai/pipeline/executor.js'
import type { IncrementalChange } from '../../ai/pipeline/types.js'
import type {
  AnalysisLogRepository,
  AnalysisStepRepository,
  ScenarioKnowledgeRepository,
} from '../ports/repositories.js'
import { classifyRiskLevel } from '../rules/riskRules.js'
import type { AIAnalysisPort, AnalyzeResult, Risk, ScenarioKnowledge, Source } from '../types.js'

// 依赖声明：哪些步骤依赖于源材料
const SOURCE_DEPENDENT_STEPS = [
  'step-scenario-discovery',
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

export interface IncrementalAnalysisOptions {
  userId?: number | null
  sessionId?: string | null
  analysisLogId?: string | null
}

export interface DiffAnalysisResult {
  change: IncrementalChange
  affectedSteps: string[]
  recomputedSteps: string[]
  reusedSteps: string[]
  result: AnalyzeResult
  durationMs: number
  isFullRecompute: boolean
}

let _analysisLogRepo: AnalysisLogRepository | null = null
let _analysisStepRepo: AnalysisStepRepository | null = null
let _scenarioKnowledgeRepo: ScenarioKnowledgeRepository | null = null
let _analysisPort: AIAnalysisPort | null = null

export function setRepositories(
  analysisLogRepo: AnalysisLogRepository,
  analysisStepRepo: AnalysisStepRepository,
  scenarioKnowledgeRepo: ScenarioKnowledgeRepository,
): void {
  _analysisLogRepo = analysisLogRepo
  _analysisStepRepo = analysisStepRepo
  _scenarioKnowledgeRepo = scenarioKnowledgeRepo
}

export function setAnalysisPort(port: AIAnalysisPort): void {
  _analysisPort = port
}

function getAnalysisLogRepo(): AnalysisLogRepository {
  if (!_analysisLogRepo) {
    throw new Error('AnalysisLogRepository not set')
  }
  return _analysisLogRepo
}

function _getAnalysisStepRepo(): AnalysisStepRepository {
  if (!_analysisStepRepo) {
    throw new Error('AnalysisStepRepository not set')
  }
  return _analysisStepRepo
}

function _getScenarioKnowledgeRepo(): ScenarioKnowledgeRepository {
  if (!_scenarioKnowledgeRepo) {
    throw new Error('ScenarioKnowledgeRepository not set')
  }
  return _scenarioKnowledgeRepo
}

function _getAnalysisPort(): AIAnalysisPort {
  if (!_analysisPort) {
    throw new Error('AIAnalysisPort not set')
  }
  return _analysisPort
}

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
function findDownstreamSteps(stepId: string): string[] {
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
 * 执行diff-based增量分析
 */
export async function performDiffBasedIncrementalAnalysis(
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
    const result = await performFullRecompute(newSources, scenarioType, scenarioKnowledge, options)

    return {
      change,
      affectedSteps,
      recomputedSteps: SOURCE_DEPENDENT_STEPS,
      reusedSteps: [],
      result,
      durationMs: Date.now() - startTime,
      isFullRecompute: true,
    }
  }

  // 4. 尝试从checkpoint恢复
  const checkpoint = options.analysisLogId
    ? await getAnalysisLogRepo().getCheckpoint(options.analysisLogId)
    : null

  if (checkpoint && canReuseCheckpoint(checkpoint, affectedSteps)) {
    // 从checkpoint恢复并部分重算
    const result = await performPartialRecompute(
      checkpoint,
      affectedSteps,
      newSources,
      scenarioType,
      scenarioKnowledge,
      options,
    )

    return {
      change,
      affectedSteps,
      recomputedSteps: affectedSteps,
      reusedSteps: SOURCE_DEPENDENT_STEPS.filter((s) => !affectedSteps.includes(s)),
      result,
      durationMs: Date.now() - startTime,
      isFullRecompute: false,
    }
  }

  // 5. 无法恢复checkpoint，执行智能部分重算
  const result = await performSmartPartialAnalysis(
    existingResult,
    change,
    affectedSteps,
    newSources,
    scenarioType,
    scenarioKnowledge,
    options,
  )

  return {
    change,
    affectedSteps,
    recomputedSteps: affectedSteps,
    reusedSteps: SOURCE_DEPENDENT_STEPS.filter((s) => !affectedSteps.includes(s)),
    result,
    durationMs: Date.now() - startTime,
    isFullRecompute: false,
  }
}

/**
 * 判断checkpoint是否可用
 */
function canReuseCheckpoint(checkpoint: unknown, affectedSteps: string[]): boolean {
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

/**
 * 完整重算
 */
async function performFullRecompute(
  sources: Source[],
  scenarioType: string,
  scenarioKnowledge: ScenarioKnowledge[],
  _options: IncrementalAnalysisOptions,
): Promise<AnalyzeResult> {
  const adapter = new AnalysisAdapter()

  const {
    result: rawResult,
    steps: _stepSummaries,
    totalTokens: _totalTokens,
    isMock,
  } = await adapter.analyze(sources, {
    scenarioType,
    scenarioKnowledge,
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
async function performPartialRecompute(
  checkpoint: unknown,
  affectedSteps: string[],
  sources: Source[],
  _scenarioType: string,
  _scenarioKnowledge: ScenarioKnowledge[],
  _options: IncrementalAnalysisOptions,
): Promise<AnalyzeResult> {
  // 找到第一个受影响步骤的索引
  const stepIndex = SOURCE_DEPENDENT_STEPS.findIndex((s) => affectedSteps.includes(s))

  // 创建pipeline executor并恢复checkpoint
  const executor = new PipelineExecutor([], {})
  executor.restoreFromCheckpoint(checkpoint as Parameters<typeof executor.restoreFromCheckpoint>[0])

  // 执行部分步骤重算
  const _state = await executor.resumeFromStep(stepIndex)

  // 构建结果
  const outputs = executor.getCompletedStepOutputs()
  const finalOutput = outputs['step-final-output'] as
    | { result?: AnalyzeResult; risks?: Risk[]; scenario?: unknown; entities?: unknown }
    | undefined

  if (!finalOutput) {
    throw new Error('Partial recompute did not produce final output')
  }

  const finalResult = finalOutput.result as AnalyzeResult | undefined
  const validatedRisks =
    finalResult?.risks?.map((risk: Risk) => ({
      ...risk,
      level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
    })) || []

  return {
    ...finalResult,
    risks: validatedRisks,
    summary: {
      critical: validatedRisks.filter((r: Risk) => r.level === 'critical').length,
      warning: validatedRisks.filter((r: Risk) => r.level === 'warning').length,
      info: validatedRisks.filter((r: Risk) => r.level === 'info').length,
      total: validatedRisks.length,
    },
    meta: {
      isMock: !process.env.AI_API_KEY,
      sourceCount: sources.length,
      sourceIds: sources.map((s) => s.id),
      isIncremental: true,
    },
  } as AnalyzeResult
}

/**
 * 智能部分分析（无checkpoint时）
 */
async function performSmartPartialAnalysis(
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
    return updateResultForRemovedSources(existingResult, change.removedSources, sources)
  }

  // 对变更材料进行分析
  const adapter = new AnalysisAdapter()
  const { result: rawResult } = await adapter.analyze(changedSources, {
    scenarioType,
    scenarioKnowledge,
  })

  // 智能合并结果
  const mergedRisks = mergeRisksSmart(existingResult.risks, rawResult.risks, change)
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
function updateResultForRemovedSources(
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
function mergeRisksSmart(
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
