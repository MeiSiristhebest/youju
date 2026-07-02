import type {
  AnalysisLogRepository,
  AnalysisStepRepository,
  ScenarioKnowledgeRepository,
  TaskResultRepository,
} from '../ports/repositories.js'
import { classifyRiskLevel } from '../rules/riskRules.js'
import type {
  AIAnalysisPort,
  AIDraftPort,
  AIStepOutput,
  AnalyzeResult,
  ChecklistItem,
  Evidence,
  ReasoningStep,
  Risk,
  RiskAssociation,
  ScenarioKnowledge,
  Source,
} from '../types.js'
import {
  computeAnalysisFingerprint,
  getCachedAnalysis,
  preheatScenarios,
  setCachedAnalysis,
  shouldUseCache,
} from './analysisCache.js'
import {
  setAnalysisPort as setIncrementalPort,
  setRepositories as setIncrementalRepos,
} from './incrementalAnalysis.js'

// 导出增量分析函数供presentation层使用
export { performDiffBasedIncrementalAnalysis } from './incrementalAnalysis.js'

let _analysisPort: AIAnalysisPort | null = null
let _draftPort: AIDraftPort | null = null
let _analysisLogRepo: AnalysisLogRepository | null = null
let _analysisStepRepo: AnalysisStepRepository | null = null
let _taskResultRepo: TaskResultRepository | null = null
let _scenarioKnowledgeRepo: ScenarioKnowledgeRepository | null = null

export function setAnalysisPort(port: AIAnalysisPort): void {
  _analysisPort = port
  // 同步设置增量分析模块的port
  setIncrementalPort(port)
}

export function setDraftPort(port: AIDraftPort): void {
  _draftPort = port
}

export function setAnalysisLogRepository(repo: AnalysisLogRepository): void {
  _analysisLogRepo = repo
  // 同步设置增量分析模块的repositories
  if (_analysisLogRepo && _analysisStepRepo && _scenarioKnowledgeRepo) {
    setIncrementalRepos(_analysisLogRepo, _analysisStepRepo, _scenarioKnowledgeRepo)
  }
}

export function setAnalysisStepRepository(repo: AnalysisStepRepository): void {
  _analysisStepRepo = repo
  // 同步设置增量分析模块的repositories
  if (_analysisLogRepo && _analysisStepRepo && _scenarioKnowledgeRepo) {
    setIncrementalRepos(_analysisLogRepo, _analysisStepRepo, _scenarioKnowledgeRepo)
  }
}

export function setTaskResultRepository(repo: TaskResultRepository): void {
  _taskResultRepo = repo
}

export function setScenarioKnowledgeRepository(repo: ScenarioKnowledgeRepository): void {
  _scenarioKnowledgeRepo = repo
  // 同步设置增量分析模块的repositories
  if (_analysisLogRepo && _analysisStepRepo && _scenarioKnowledgeRepo) {
    setIncrementalRepos(_analysisLogRepo, _analysisStepRepo, _scenarioKnowledgeRepo)
  }
}

function getAnalysisPort(): AIAnalysisPort {
  if (!_analysisPort) {
    throw new Error('AIAnalysisPort not set. Call setAnalysisPort() first.')
  }
  return _analysisPort
}

function getDraftPort(): AIDraftPort {
  if (!_draftPort) {
    throw new Error('AIDraftPort not set. Call setDraftPort() first.')
  }
  return _draftPort
}

function getAnalysisLogRepo(): AnalysisLogRepository {
  if (!_analysisLogRepo) {
    throw new Error('AnalysisLogRepository not set. Call setAnalysisLogRepository() first.')
  }
  return _analysisLogRepo
}

function getAnalysisStepRepo(): AnalysisStepRepository {
  if (!_analysisStepRepo) {
    throw new Error('AnalysisStepRepository not set. Call setAnalysisStepRepository() first.')
  }
  return _analysisStepRepo
}

function getTaskResultRepo(): TaskResultRepository {
  if (!_taskResultRepo) {
    throw new Error('TaskResultRepository not set. Call setTaskResultRepository() first.')
  }
  return _taskResultRepo
}

function getScenarioKnowledgeRepo(): ScenarioKnowledgeRepository {
  if (!_scenarioKnowledgeRepo) {
    throw new Error(
      'ScenarioKnowledgeRepository not set. Call setScenarioKnowledgeRepository() first.',
    )
  }
  return _scenarioKnowledgeRepo
}

const SOURCE_AFFECTED_STEPS = [
  'step-scenario-discovery',
  'step-input-parsing',
  'step-cross-source-extraction',
  'step-discrepancy-detection',
  'step-self-check',
  'step-final-output',
]

export async function createAnalysisLogEntry(input: {
  userId: number | null
  sessionId: string | null
  scenarioType: string
  sourceCount: number
}): Promise<{ id: string; logGroupId: string }> {
  const log = await getAnalysisLogRepo().createAnalysisLog({
    taskId: null,
    userId: input.userId,
    sessionId: input.sessionId,
    scenarioType: input.scenarioType,
    sourceCount: input.sourceCount,
    riskCount: 0,
    durationMs: 0,
    model: null,
    isMock: !process.env.AI_API_KEY,
    status: 'running',
    errorMessage: null,
    reasoningTrace: null,
    rawOutput: null,
    tokenPrompt: 0,
    tokenCompletion: 0,
  })
  return { id: log.id, logGroupId: log.logGroupId }
}

export async function analyzeSourcesStreamWithLog(
  analysisLogId: string,
  sources: Source[],
  scenarioType?: string,
  scenarioKnowledge?: ScenarioKnowledge[],
  callbacks: StreamAnalysisCallbacks = {},
): Promise<AnalyzeResult> {
  const startTime = Date.now()
  const port = getAnalysisPort()
  const stepDbRecords: Record<string, string[]> = {}
  const stepIndexMap: Record<string, number> = {}
  const logGroupId = analysisLogId

  try {
    const aiResult = await port.analyze(sources, {
      scenarioType,
      scenarioKnowledge,
      onStepStart: (step: { id: string; name: string }) => {
        const stepIndex = Object.keys(stepIndexMap).length
        stepIndexMap[step.id] = stepIndex
        callbacks.onStepStart?.({ id: step.id, name: step.name, index: stepIndex })

        // 回调中的数据库操作用 fire-and-forget 模式
        getAnalysisStepRepo()
          .createAnalysisStep({
            analysisLogId,
            stepId: step.id,
            stepName: step.name,
            stepIndex,
            status: 'running',
            promptVersion: '',
            model: '',
            inputSnapshot: { sourceCount: sources.length, scenarioType },
            outputSnapshot: null,
            rawInput: null,
            rawOutput: null,
            tokenPrompt: 0,
            tokenCompletion: 0,
            latencyMs: 0,
            retryCount: 0,
            errorMessage: null,
            startedAt: new Date().toISOString(),
            completedAt: null,
            eventType: 'step_running',
            stepOrder: 0,
          })
          .catch((e) => console.error('[analysisService] createAnalysisStep error:', e))
      },
      onStepComplete: (step: { id: string; name: string; output: AIStepOutput }) => {
        const stepIndex = stepIndexMap[step.id] ?? 0
        callbacks.onStepComplete?.({
          id: step.id,
          name: step.name,
          index: stepIndex,
          output: step.output,
        })

        const prevRecords = stepDbRecords[step.id] || []
        // 回调中的数据库操作用 fire-and-forget 模式
        getAnalysisStepRepo()
          .createAnalysisStep({
            analysisLogId,
            stepId: step.id,
            stepName: step.name,
            stepIndex,
            status: 'completed',
            promptVersion: step.output?.promptVersion || '',
            model: step.output?.modelVersion || '',
            inputSnapshot: null,
            outputSnapshot: step.output?.data || null,
            rawInput: null,
            rawOutput: step.output?.rawOutput || null,
            tokenPrompt: step.output?.tokenPrompt || 0,
            tokenCompletion: step.output?.tokenCompletion || 0,
            latencyMs: step.output?.latencyMs || 0,
            retryCount: 0,
            errorMessage: null,
            startedAt: null,
            completedAt: new Date().toISOString(),
            parentStepId: prevRecords[prevRecords.length - 1] || null,
            eventType: 'step_completed',
            stepOrder: prevRecords.length,
          })
          .catch((e) => console.error('[analysisService] createAnalysisStep error:', e))

        // 保存 checkpoint - fire-and-forget
        const completedOutputs: Record<string, unknown> = {}
        for (const [sid] of Object.entries(stepIndexMap)) {
          if (sid !== step.id) {
            completedOutputs[sid] = stepDbRecords[sid]?.length > 0 ? true : null
          }
        }
        completedOutputs[step.id] = step.output?.data || null
        getAnalysisLogRepo()
          .saveCheckpoint(analysisLogId, {
            stepOutputs: completedOutputs,
            lastCompletedStepId: step.id,
            lastCompletedStepIndex: stepIndex,
            savedAt: new Date().toISOString(),
          })
          .catch((e) => console.error('[analysisService] saveCheckpoint error:', e))
      },
      onStepError: (step: { id: string; name: string; error: string }) => {
        const stepIndex = stepIndexMap[step.id] ?? 0
        // 回调中的数据库操作用 fire-and-forget 模式
        getAnalysisStepRepo()
          .createStepEvent({
            analysisLogId,
            stepId: step.id,
            stepName: step.name,
            stepIndex,
            eventType: 'error',
            stepOrder: 0,
            status: 'failed',
            errorMessage: step.error,
          })
          .catch((e) => console.error('[analysisService] createStepEvent error:', e))
      },
    })

    const { result: rawResult, steps: stepSummaries, totalTokens, isMock } = aiResult
    const totalLatencyMs = Date.now() - startTime

    const validatedRisks = rawResult.risks.map((risk) => ({
      ...risk,
      level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
    }))

    const result: AnalyzeResult = {
      ...rawResult,
      risks: validatedRisks,
      summary: {
        critical: validatedRisks.filter((r) => r.level === 'critical').length,
        warning: validatedRisks.filter((r) => r.level === 'warning').length,
        info: validatedRisks.filter((r) => r.level === 'info').length,
        total: validatedRisks.length,
      },
    }

    // 更新 analysis log
    await getAnalysisLogRepo().appendAnalysisLog(logGroupId, 'completed', {
      riskCount: result.summary.total,
      durationMs: totalLatencyMs,
      model: stepSummaries[0]?.modelVersion || '',
      isMock,
      status: 'success',
      tokenPrompt: totalTokens,
    })

    if (result.risks && result.risks.length > 0) {
      await getScenarioKnowledgeRepo().accumulateScenarioKnowledge(
        scenarioType || 'custom',
        result.risks.map((r) => ({
          type: r.type,
          dimension: r.dimension,
          confidence: r.confidence || 0.5,
        })),
      )
    }

    callbacks.onComplete?.(result)
    return result
  } catch (error) {
    await getAnalysisLogRepo().appendAnalysisLog(logGroupId, 'failed', {
      durationMs: Date.now() - startTime,
      status: 'failed',
      errorMessage: (error as Error).message,
    })
    callbacks.onError?.(error as Error)
    throw error
  }
}

export async function analyzeSources(
  sources: Source[],
  scenarioType?: string,
  scenarioKnowledge?: ScenarioKnowledge[],
  options?: {
    userId?: number | null
    sessionId?: string | null
    taskId?: string | null
    persist?: boolean
  },
): Promise<AnalyzeResult> {
  const persist = options?.persist ?? true

  // === 缓存查询：相同内容指纹直接命中，跳过 AI 调用 ===
  const useCache = shouldUseCache(options)
  const cacheKey = useCache
    ? computeAnalysisFingerprint(sources, scenarioType, scenarioKnowledge)
    : null
  if (cacheKey) {
    const cached = getCachedAnalysis(cacheKey)
    if (cached) {
      console.log(
        `[Analyze] 缓存命中 (key=${cacheKey.substring(0, 12)}…, hitCount=${cached.meta?.cacheHitCount ?? 0})，跳过 AI 调用`,
      )
      return cached
    }
  }

  let logGroupId: string | null = null
  const startTime = Date.now()

  const port = getAnalysisPort()
  const stepDbRecords: Record<string, string[]> = {}

  if (persist) {
    const initialLog = await getAnalysisLogRepo().createAnalysisLog({
      taskId: options?.taskId || null,
      userId: options?.userId ?? null,
      sessionId: options?.sessionId ?? null,
      scenarioType: scenarioType || 'custom',
      sourceCount: sources.length,
      riskCount: 0,
      durationMs: 0,
      model: null,
      isMock: !process.env.AI_API_KEY,
      status: 'running',
      errorMessage: null,
      reasoningTrace: null,
      rawOutput: null,
      tokenPrompt: 0,
      tokenCompletion: 0,
    })
    logGroupId = initialLog.logGroupId
  }

  const aiResult = await port.analyze(sources, {
    scenarioType,
    scenarioKnowledge,
    onStepStart: (step: { id: string; name: string }) => {
      if (!persist || !logGroupId) return
      // 回调中的数据库操作用 fire-and-forget 模式
      getAnalysisLogRepo()
        .getLatestAnalysisLog(logGroupId)
        .then((latestLog) => {
          if (!latestLog) return
          getAnalysisStepRepo()
            .createAnalysisStep({
              analysisLogId: latestLog.id,
              stepId: step.id,
              stepName: step.name,
              stepIndex: 0,
              status: 'running',
              promptVersion: '',
              model: '',
              inputSnapshot: { sourceCount: sources.length, scenarioType },
              outputSnapshot: null,
              rawInput: null,
              rawOutput: null,
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
              retryCount: 0,
              errorMessage: null,
              startedAt: new Date().toISOString(),
              completedAt: null,
              eventType: 'step_running',
              stepOrder: 0,
            })
            .then((stepRec) => {
              if (!stepDbRecords[step.id]) {
                stepDbRecords[step.id] = []
              }
              stepDbRecords[step.id].push(stepRec.id)
            })
            .catch((e) => console.error('[analysisService] createAnalysisStep error:', e))
        })
        .catch((e) => console.error('[analysisService] getLatestAnalysisLog error:', e))
    },
    onStepComplete: (step: { id: string; name: string; output: any }) => {
      if (!persist || !logGroupId) return
      // 回调中的数据库操作用 fire-and-forget 模式
      getAnalysisLogRepo()
        .getLatestAnalysisLog(logGroupId)
        .then((latestLog) => {
          if (!latestLog) return
          const prevRecords = stepDbRecords[step.id] || []
          const prevRecId = prevRecords[prevRecords.length - 1] || null
          getAnalysisStepRepo()
            .createAnalysisStep({
              analysisLogId: latestLog.id,
              stepId: step.id,
              stepName: step.name,
              stepIndex: 0,
              status: 'completed',
              promptVersion: step.output?.promptVersion || '',
              model: step.output?.modelVersion || '',
              inputSnapshot: null,
              outputSnapshot: step.output?.data || null,
              rawInput: null,
              rawOutput: step.output?.rawOutput || null,
              tokenPrompt: step.output?.tokenPrompt || 0,
              tokenCompletion: step.output?.tokenCompletion || 0,
              latencyMs: step.output?.latencyMs || 0,
              retryCount: 0,
              errorMessage: null,
              startedAt: null,
              completedAt: new Date().toISOString(),
              parentStepId: prevRecId,
              eventType: 'step_completed',
              stepOrder: prevRecords.length,
            })
            .then((stepRec) => {
              prevRecords.push(stepRec.id)
            })
            .catch((e) => console.error('[analysisService] createAnalysisStep error:', e))
        })
        .catch((e) => console.error('[analysisService] getLatestAnalysisLog error:', e))
    },
    onStepError: (step: { id: string; name: string; error: string }) => {
      if (!persist || !logGroupId) return
      // 回调中的数据库操作用 fire-and-forget 模式
      getAnalysisLogRepo()
        .getLatestAnalysisLog(logGroupId)
        .then((latestLog) => {
          if (!latestLog) return
          const prevRecords = stepDbRecords[step.id] || []
          getAnalysisStepRepo()
            .createStepEvent({
              analysisLogId: latestLog.id,
              stepId: step.id,
              stepName: step.name,
              stepIndex: 0,
              eventType: 'error',
              stepOrder: prevRecords.length,
              status: 'failed',
              errorMessage: step.error,
            })
            .catch((e) => console.error('[analysisService] createStepEvent error:', e))
        })
        .catch((e) => console.error('[analysisService] getLatestAnalysisLog error:', e))
    },
  })

  const { result: rawResult, steps: stepSummaries, totalTokens, isMock } = aiResult
  const totalLatencyMs = Date.now() - startTime

  const validatedRisks = rawResult.risks.map((risk) => ({
    ...risk,
    level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
  }))

  const result: AnalyzeResult = {
    ...rawResult,
    risks: validatedRisks,
    summary: {
      critical: validatedRisks.filter((r) => r.level === 'critical').length,
      warning: validatedRisks.filter((r) => r.level === 'warning').length,
      info: validatedRisks.filter((r) => r.level === 'info').length,
      total: validatedRisks.length,
    },
  }

  if (persist && logGroupId) {
    const completedLog = await getAnalysisLogRepo().appendAnalysisLog(logGroupId, 'completed', {
      taskId: options?.taskId || null,
      userId: options?.userId ?? null,
      sessionId: options?.sessionId ?? null,
      scenarioType: scenarioType || 'custom',
      sourceCount: sources.length,
      riskCount: result.summary.total,
      durationMs: totalLatencyMs,
      model: stepSummaries[0]?.modelVersion || '',
      isMock,
      status: 'success',
      errorMessage: null,
      reasoningTrace: result.reasoningTrace || null,
      rawOutput: null,
      tokenPrompt: totalTokens,
      tokenCompletion: 0,
    })

    for (let i = 0; i < stepSummaries.length; i++) {
      const step = stepSummaries[i]
      await getAnalysisStepRepo().createAnalysisStep({
        analysisLogId: completedLog.id,
        stepId: step.id,
        stepName: step.name,
        stepIndex: i,
        status: step.status,
        promptVersion: step.promptVersion,
        model: step.modelVersion,
        inputSnapshot: null,
        outputSnapshot: null,
        rawInput: null,
        rawOutput: null,
        tokenPrompt: step.tokenPrompt,
        tokenCompletion: step.tokenCompletion,
        latencyMs: step.latencyMs,
        retryCount: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        eventType: 'step_summary',
        stepOrder: 0,
      })
    }

    if (options?.taskId) {
      await getTaskResultRepo().createTaskResult(options.taskId, result, completedLog.id)
    }

    if (result.risks && result.risks.length > 0) {
      await getScenarioKnowledgeRepo().accumulateScenarioKnowledge(
        scenarioType || 'custom',
        result.risks.map((r) => ({
          type: r.type,
          dimension: r.dimension,
          confidence: r.confidence || 0.5,
        })),
      )
    }
  }

  // === 缓存写入：真实 AI 结果写入缓存，供下次相同输入命中 ===
  if (cacheKey) {
    setCachedAnalysis(cacheKey, result)
  }

  return result
}

/**
 * 预热预设场景：服务启动时对固定场景做预计算，写入缓存
 * 仅在真实 AI 模式下执行；mock 模式直接跳过
 */
export async function preheatScenarioPresets(): Promise<{
  preheated: string[]
  skipped: string[]
  failed: Array<{ id: string; error: string }>
}> {
  if (!process.env.AI_API_KEY) {
    console.log('[Preheat] 未配置 AI_API_KEY，跳过预热')
    return { preheated: [], skipped: [], failed: [] }
  }

  // 动态导入避免循环依赖（SCENARIO_PRESETS 不依赖本模块，但保持延迟加载以减少启动开销）
  const { SCENARIO_PRESETS } = await import('../scenarioPresets.js')
  return preheatScenarios(SCENARIO_PRESETS, (sources, scenarioType) =>
    analyzeSources(sources, scenarioType, undefined, { persist: false }),
  )
}

export interface StreamAnalysisCallbacks {
  onStepStart?: (step: { id: string; name: string; index: number }) => void
  onStepComplete?: (step: { id: string; name: string; index: number; output: AIStepOutput }) => void
  onComplete?: (result: AnalyzeResult) => void
  onError?: (error: Error) => void
}

export async function analyzeSourcesStream(
  sources: Source[],
  scenarioType?: string,
  scenarioKnowledge?: ScenarioKnowledge[],
  callbacks: StreamAnalysisCallbacks = {},
  options?: {
    userId?: number | null
    sessionId?: string | null
    taskId?: string | null
    persist?: boolean
  },
): Promise<AnalyzeResult> {
  const persist = options?.persist ?? true
  let logGroupId: string | null = null
  const startTime = Date.now()

  const port = getAnalysisPort()
  const stepDbRecords: Record<string, string[]> = {}
  const stepIndexMap: Record<string, number> = {}

  if (persist) {
    const initialLog = await getAnalysisLogRepo().createAnalysisLog({
      taskId: options?.taskId || null,
      userId: options?.userId ?? null,
      sessionId: options?.sessionId ?? null,
      scenarioType: scenarioType || 'custom',
      sourceCount: sources.length,
      riskCount: 0,
      durationMs: 0,
      model: null,
      isMock: !process.env.AI_API_KEY,
      status: 'running',
      errorMessage: null,
      reasoningTrace: null,
      rawOutput: null,
      tokenPrompt: 0,
      tokenCompletion: 0,
    })
    logGroupId = initialLog.logGroupId
  }

  try {
    const aiResult = await port.analyze(sources, {
      scenarioType,
      scenarioKnowledge,
      onStepStart: (step: { id: string; name: string }) => {
        const stepIndex = Object.keys(stepIndexMap).length
        stepIndexMap[step.id] = stepIndex

        callbacks.onStepStart?.({ id: step.id, name: step.name, index: stepIndex })

        if (!persist || !logGroupId) return
        // 回调中的数据库操作用 fire-and-forget 模式
        getAnalysisLogRepo()
          .getLatestAnalysisLog(logGroupId)
          .then((latestLog) => {
            if (!latestLog) return
            getAnalysisStepRepo()
              .createAnalysisStep({
                analysisLogId: latestLog.id,
                stepId: step.id,
                stepName: step.name,
                stepIndex,
                status: 'running',
                promptVersion: '',
                model: '',
                inputSnapshot: { sourceCount: sources.length, scenarioType },
                outputSnapshot: null,
                rawInput: null,
                rawOutput: null,
                tokenPrompt: 0,
                tokenCompletion: 0,
                latencyMs: 0,
                retryCount: 0,
                errorMessage: null,
                startedAt: new Date().toISOString(),
                completedAt: null,
                eventType: 'step_running',
                stepOrder: 0,
              })
              .then((stepRec) => {
                if (!stepDbRecords[step.id]) {
                  stepDbRecords[step.id] = []
                }
                stepDbRecords[step.id].push(stepRec.id)
              })
              .catch((e) => console.error('[analysisService] createAnalysisStep error:', e))
          })
          .catch((e) => console.error('[analysisService] getLatestAnalysisLog error:', e))
      },
      onStepComplete: (step: { id: string; name: string; output: AIStepOutput }) => {
        const stepIndex = stepIndexMap[step.id] ?? 0

        callbacks.onStepComplete?.({
          id: step.id,
          name: step.name,
          index: stepIndex,
          output: step.output,
        })

        if (!persist || !logGroupId) return
        // 回调中的数据库操作用 fire-and-forget 模式
        getAnalysisLogRepo()
          .getLatestAnalysisLog(logGroupId)
          .then((latestLog) => {
            if (!latestLog) return
            const prevRecords = stepDbRecords[step.id] || []
            const prevRecId = prevRecords[prevRecords.length - 1] || null
            getAnalysisStepRepo()
              .createAnalysisStep({
                analysisLogId: latestLog.id,
                stepId: step.id,
                stepName: step.name,
                stepIndex,
                status: 'completed',
                promptVersion: step.output?.promptVersion || '',
                model: step.output?.modelVersion || '',
                inputSnapshot: null,
                outputSnapshot: step.output?.data || null,
                rawInput: null,
                rawOutput: step.output?.rawOutput || null,
                tokenPrompt: step.output?.tokenPrompt || 0,
                tokenCompletion: step.output?.tokenCompletion || 0,
                latencyMs: step.output?.latencyMs || 0,
                retryCount: 0,
                errorMessage: null,
                startedAt: null,
                completedAt: new Date().toISOString(),
                parentStepId: prevRecId,
                eventType: 'step_completed',
                stepOrder: prevRecords.length,
              })
              .then((stepRec) => {
                prevRecords.push(stepRec.id)
              })
              .catch((e) => console.error('[analysisService] createAnalysisStep error:', e))

            // 保存 checkpoint - fire-and-forget
            const completedOutputs: Record<string, unknown> = {}
            for (const [sid, recs] of Object.entries(stepDbRecords)) {
              if (recs.length > 0 && sid !== step.id) {
                completedOutputs[sid] = true
              }
            }
            completedOutputs[step.id] = step.output?.data || null
            getAnalysisLogRepo()
              .saveCheckpoint(latestLog.id, {
                stepOutputs: completedOutputs,
                lastCompletedStepId: step.id,
                lastCompletedStepIndex: stepIndex,
                savedAt: new Date().toISOString(),
              })
              .catch((e) => console.error('[analysisService] saveCheckpoint error:', e))
          })
          .catch((e) => console.error('[analysisService] getLatestAnalysisLog error:', e))
      },
      onStepError: (step: { id: string; name: string; error: string }) => {
        const stepIndex = stepIndexMap[step.id] ?? 0

        if (!persist || !logGroupId) return
        // 回调中的数据库操作用 fire-and-forget 模式
        getAnalysisLogRepo()
          .getLatestAnalysisLog(logGroupId)
          .then((latestLog) => {
            if (!latestLog) return
            const prevRecords = stepDbRecords[step.id] || []
            getAnalysisStepRepo()
              .createStepEvent({
                analysisLogId: latestLog.id,
                stepId: step.id,
                stepName: step.name,
                stepIndex,
                eventType: 'error',
                stepOrder: prevRecords.length,
                status: 'failed',
                errorMessage: step.error,
              })
              .catch((e) => console.error('[analysisService] createStepEvent error:', e))
          })
          .catch((e) => console.error('[analysisService] getLatestAnalysisLog error:', e))
      },
    })

    const { result: rawResult, steps: stepSummaries, totalTokens, isMock } = aiResult
    const totalLatencyMs = Date.now() - startTime

    const validatedRisks = rawResult.risks.map((risk) => ({
      ...risk,
      level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
    }))

    const result: AnalyzeResult = {
      ...rawResult,
      risks: validatedRisks,
      summary: {
        critical: validatedRisks.filter((r) => r.level === 'critical').length,
        warning: validatedRisks.filter((r) => r.level === 'warning').length,
        info: validatedRisks.filter((r) => r.level === 'info').length,
        total: validatedRisks.length,
      },
    }

    if (persist && logGroupId) {
      const completedLog = await getAnalysisLogRepo().appendAnalysisLog(logGroupId, 'completed', {
        taskId: options?.taskId || null,
        userId: options?.userId ?? null,
        sessionId: options?.sessionId ?? null,
        scenarioType: scenarioType || 'custom',
        sourceCount: sources.length,
        riskCount: result.summary.total,
        durationMs: totalLatencyMs,
        model: stepSummaries[0]?.modelVersion || '',
        isMock,
        status: 'success',
        errorMessage: null,
        reasoningTrace: result.reasoningTrace || null,
        rawOutput: null,
        tokenPrompt: totalTokens,
        tokenCompletion: 0,
      })

      for (let i = 0; i < stepSummaries.length; i++) {
        const step = stepSummaries[i]
        await getAnalysisStepRepo().createAnalysisStep({
          analysisLogId: completedLog.id,
          stepId: step.id,
          stepName: step.name,
          stepIndex: i,
          status: step.status,
          promptVersion: step.promptVersion,
          model: step.modelVersion,
          inputSnapshot: null,
          outputSnapshot: null,
          rawInput: null,
          rawOutput: null,
          tokenPrompt: step.tokenPrompt,
          tokenCompletion: step.tokenCompletion,
          latencyMs: step.latencyMs,
          retryCount: 0,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          eventType: 'step_summary',
          stepOrder: 0,
        })
      }

      if (options?.taskId) {
        await getTaskResultRepo().createTaskResult(options.taskId, result, completedLog.id)
      }

      if (result.risks && result.risks.length > 0) {
        await getScenarioKnowledgeRepo().accumulateScenarioKnowledge(
          scenarioType || 'custom',
          result.risks.map((r) => ({
            type: r.type,
            dimension: r.dimension,
            confidence: r.confidence || 0.5,
          })),
        )
      }
    }

    callbacks.onComplete?.(result)
    return result
  } catch (error) {
    callbacks.onError?.(error as Error)
    throw error
  }
}

export async function generateDraft(
  risk: {
    title: string
    description: string
    evidence: { sourceName: string; sourceType: string; quote: string; confidence: number }[]
  },
  context?: string,
  stylePref?: {
    formality?: number
    friendliness?: number
    conciseness?: number
    preferredTone?: string
  },
): Promise<string> {
  const port = getDraftPort()
  return port.generateDraft(risk, context, stylePref)
}

export async function resumeAnalysisFromCheckpoint(
  analysisLogId: string,
  sources: Source[],
  options?: {
    userId?: number | null
    sessionId?: string | null
    taskId?: string | null
  },
): Promise<AnalyzeResult> {
  const port = getAnalysisPort()

  // 从 DB 获取 checkpoint
  const checkpoint = await getAnalysisLogRepo().getCheckpoint(analysisLogId)
  if (!checkpoint) {
    throw new Error(`Checkpoint not found for analysis log: ${analysisLogId}`)
  }

  const startTime = Date.now()

  const aiResult = await port.resumeFromCheckpoint?.(
    sources,
    checkpoint as {
      stepOutputs: Record<string, unknown>
      lastCompletedStepId: string
      lastCompletedStepIndex: number
    },
    {
      scenarioType: undefined,
      scenarioKnowledge: [],
    },
  )

  if (!aiResult) {
    throw new Error('resumeFromCheckpoint not implemented in AI port')
  }

  const {
    result: rawResult,
    steps: _stepSummaries,
    totalTokens: _totalTokens,
    isMock: _isMock,
  } = aiResult
  const totalLatencyMs = Date.now() - startTime

  const validatedRisks = rawResult.risks.map((risk) => ({
    ...risk,
    level: classifyRiskLevel(risk.type, risk.dimension, risk.evidence?.length || 0),
  }))

  const result: AnalyzeResult = {
    ...rawResult,
    risks: validatedRisks,
    summary: {
      critical: validatedRisks.filter((r) => r.level === 'critical').length,
      warning: validatedRisks.filter((r) => r.level === 'warning').length,
      info: validatedRisks.filter((r) => r.level === 'info').length,
      total: validatedRisks.length,
    },
  }

  // 更新 analysis log
  const existingLog = await getAnalysisLogRepo().getLatestAnalysisLog(analysisLogId)
  if (existingLog) {
    const logGroupId = existingLog.logGroupId || analysisLogId
    await getAnalysisLogRepo().appendAnalysisLog(logGroupId, 'resumed', {
      riskCount: result.summary.total,
      durationMs: totalLatencyMs,
      status: 'success',
    })
  }

  if (options?.taskId) {
    await getTaskResultRepo().createTaskResult(options.taskId, result)
  }

  return result
}

export async function retryAnalysisStep(
  analysisLogId: string,
  stepIndex: number,
  sources: Source[],
  _options?: {
    userId?: number | null
    sessionId?: string | null
  },
): Promise<{ success: boolean; stepStatus: string; checkpoint: unknown }> {
  const port = getAnalysisPort()

  const checkpoint = await getAnalysisLogRepo().getCheckpoint(analysisLogId)
  if (!checkpoint) {
    throw new Error(`Checkpoint not found for analysis log: ${analysisLogId}`)
  }

  const checkpointData = checkpoint as {
    stepOutputs: Record<string, unknown>
    lastCompletedStepId: string
    lastCompletedStepIndex: number
    savedAt: string
  }

  // 如果 stepIndex > lastCompletedStepIndex + 1，说明该步骤还没执行，不能 retry
  if (stepIndex > checkpointData.lastCompletedStepIndex + 1) {
    throw new Error(`Step ${stepIndex} has not been executed yet, cannot retry`)
  }

  // 从 checkpoint 恢复，从 stepIndex 开始重新执行
  const aiResult = await port.resumeFromCheckpoint?.(
    sources,
    {
      stepOutputs: checkpointData.stepOutputs,
      lastCompletedStepId: checkpointData.lastCompletedStepId,
      lastCompletedStepIndex: stepIndex - 1, // 从 stepIndex 开始
    },
    {
      scenarioType: undefined,
      scenarioKnowledge: [],
    },
  )

  if (!aiResult) {
    throw new Error('resumeFromCheckpoint not implemented')
  }

  // 更新 checkpoint
  const newCheckpoint = {
    stepOutputs: aiResult.steps.reduce(
      (acc, s) => {
        if (s.status === 'completed') {
          acc[s.id] = true
        }
        return acc
      },
      {} as Record<string, unknown>,
    ),
    lastCompletedStepId: aiResult.steps[aiResult.steps.length - 1]?.id || '',
    lastCompletedStepIndex: aiResult.steps.filter((s) => s.status === 'completed').length - 1,
    savedAt: new Date().toISOString(),
  }

  const existingLog = await getAnalysisLogRepo().getLatestAnalysisLog(analysisLogId)
  if (existingLog) {
    const _logGroupId = existingLog.logGroupId || analysisLogId
    await getAnalysisLogRepo().saveCheckpoint(existingLog.id, newCheckpoint)
  }

  const stepStatus = aiResult.steps[stepIndex]?.status || 'unknown'

  return {
    success: stepStatus === 'completed',
    stepStatus,
    checkpoint: newCheckpoint,
  }
}

export async function skipAnalysisStep(
  analysisLogId: string,
  stepIndex: number,
  _options?: {
    userId?: number | null
    sessionId?: string | null
  },
): Promise<{ success: boolean; checkpoint: unknown }> {
  const checkpoint = await getAnalysisLogRepo().getCheckpoint(analysisLogId)
  if (!checkpoint) {
    throw new Error(`Checkpoint not found for analysis log: ${analysisLogId}`)
  }

  const checkpointData = checkpoint as {
    stepOutputs: Record<string, unknown>
    lastCompletedStepId: string
    lastCompletedStepIndex: number
    savedAt: string
  }

  // 标记该步骤为 skipped
  const stepIds = Object.keys(checkpointData.stepOutputs)
  if (stepIndex >= stepIds.length) {
    throw new Error(`Invalid step index: ${stepIndex}`)
  }

  const stepIdToSkip = stepIds[stepIndex]
  checkpointData.stepOutputs[stepIdToSkip] = 'skipped'

  // 更新 checkpoint
  const newCheckpoint = {
    ...checkpointData,
    savedAt: new Date().toISOString(),
  }

  const existingLog = await getAnalysisLogRepo().getLatestAnalysisLog(analysisLogId)
  if (existingLog) {
    await getAnalysisLogRepo().saveCheckpoint(existingLog.id, newCheckpoint)
  }

  return {
    success: true,
    checkpoint: newCheckpoint,
  }
}

export async function getAnalysisCheckpoint(analysisLogId: string): Promise<unknown | null> {
  return getAnalysisLogRepo().getCheckpoint(analysisLogId)
}

export async function analyzeIncremental(
  existingSources: Source[],
  newSources: Source[],
  existingResult: AnalyzeResult,
  scenarioType?: string,
  scenarioKnowledge?: ScenarioKnowledge[],
  options?: {
    userId?: number | null
    sessionId?: string | null
    taskId?: string | null
    persist?: boolean
  },
): Promise<AnalyzeResult> {
  const allSources = mergeSourceLists(existingSources, newSources)
  const diff = computeSourceDiff(existingSources, newSources)
  const affectedSteps = determineAffectedSteps(diff)

  console.log(
    `[增量分析] 新增 ${diff.addedSources.length} 份，修改 ${diff.modifiedSources.length} 份，删除 ${diff.removedSources.length} 份，影响 ${affectedSteps.length} 个步骤`,
  )

  if (affectedSteps.length === 0) {
    return {
      ...existingResult,
      meta: { ...existingResult.meta, sourceCount: allSources.length },
    }
  }

  const modifiedIds = new Set(diff.modifiedSources.map((s) => s.name))
  const removedIds = new Set(diff.removedSources.map((s) => s.name))
  const hasModifications = diff.modifiedSources.length > 0 || diff.removedSources.length > 0

  let baseResult = existingResult

  if (hasModifications) {
    console.log(`[增量分析] 存在修改/删除，先清理受影响的风险`)
    baseResult = filterOutAffectedRisks(existingResult, modifiedIds, removedIds)
  }

  const sourcesToAnalyze = [...diff.addedSources, ...diff.modifiedSources]

  if (sourcesToAnalyze.length === 0) {
    console.log(`[增量分析] 无材料需要重新分析，直接返回清理后的结果`)
    return {
      ...baseResult,
      meta: { ...baseResult.meta, sourceCount: allSources.length },
    }
  }

  console.log(`[增量分析] 对 ${sourcesToAnalyze.length} 份材料执行局部分析`)
  const partialResult = await analyzeSources(sourcesToAnalyze, scenarioType, scenarioKnowledge, {
    ...options,
    persist: false,
  })
  return mergeAnalyzeResults(baseResult, partialResult, allSources)
}

function mergeSourceLists(existing: Source[], updates: Source[]): Source[] {
  const updateMap = new Map(updates.map((s) => [s.id, s]))
  const existingIds = new Set(existing.map((s) => s.id))

  const result: Source[] = []
  for (const src of existing) {
    const updated = updateMap.get(src.id)
    result.push(updated || src)
  }
  for (const src of updates) {
    if (!existingIds.has(src.id)) {
      result.push(src)
    }
  }
  return result
}

function filterOutAffectedRisks(
  result: AnalyzeResult,
  modifiedSourceNames: Set<string>,
  removedSourceNames: Set<string>,
): AnalyzeResult {
  const affectedNames = new Set([...modifiedSourceNames, ...removedSourceNames])

  const filteredRisks = result.risks.filter((risk) => {
    const riskSources = risk.sources || []
    const allFromAffected = riskSources.length > 0 && riskSources.every((s) => affectedNames.has(s))
    return !allFromAffected
  })

  const filteredEvidenceRisks = filteredRisks
    .map((risk) => ({
      ...risk,
      evidence: (risk.evidence || []).filter((e) => !affectedNames.has(e.sourceName)),
      sources: (risk.sources || []).filter((s) => !affectedNames.has(s)),
    }))
    .filter((risk) => (risk.evidence || []).length > 0)

  const summary = {
    critical: filteredEvidenceRisks.filter((r) => r.level === 'critical').length,
    warning: filteredEvidenceRisks.filter((r) => r.level === 'warning').length,
    info: filteredEvidenceRisks.filter((r) => r.level === 'info').length,
    total: filteredEvidenceRisks.length,
  }

  return {
    ...result,
    risks: filteredEvidenceRisks,
    summary,
  }
}

function computeSourceDiff(
  existing: Source[],
  updated: Source[],
): {
  addedSources: Source[]
  removedSources: Source[]
  modifiedSources: Source[]
} {
  const existingMap = new Map(existing.map((s) => [s.id, s]))
  const updatedIds = new Set(updated.map((s) => s.id))

  const addedSources: Source[] = []
  const modifiedSources: Source[] = []
  const removedSources: Source[] = []

  for (const src of updated) {
    const existingSrc = existingMap.get(src.id)
    if (!existingSrc) {
      addedSources.push(src)
    } else if (existingSrc.content !== src.content) {
      modifiedSources.push(src)
    }
  }

  for (const src of existing) {
    if (!updatedIds.has(src.id)) {
      removedSources.push(src)
    }
  }

  return {
    addedSources,
    removedSources,
    modifiedSources,
  }
}

function determineAffectedSteps(diff: {
  addedSources: Source[]
  removedSources: Source[]
  modifiedSources: Source[]
}): string[] {
  if (
    diff.addedSources.length === 0 &&
    diff.modifiedSources.length === 0 &&
    diff.removedSources.length === 0
  ) {
    return []
  }
  return [...SOURCE_AFFECTED_STEPS]
}

const SIMILARITY_THRESHOLD_MERGE = 0.5
const SIMILARITY_THRESHOLD_DESCRIPTION = 0.7

export function mergeAnalyzeResults(
  existing: AnalyzeResult,
  incremental: AnalyzeResult,
  allSources: Source[],
): AnalyzeResult {
  const mergedRisks = mergeRisks(existing.risks, incremental.risks)
  const mergedChecklist = mergeChecklist(existing.checklist, incremental.checklist)
  const mergedTrace = mergeReasoningTrace(existing.reasoningTrace, incremental.reasoningTrace)
  const mergedRelations = computeRiskRelationsSimple(mergedRisks, allSources)
  const mergedUncertainties = [
    ...new Set([...(existing.uncertainties || []), ...(incremental.uncertainties || [])]),
  ]

  const summary = {
    critical: mergedRisks.filter((r) => r.level === 'critical').length,
    warning: mergedRisks.filter((r) => r.level === 'warning').length,
    info: mergedRisks.filter((r) => r.level === 'info').length,
    total: mergedRisks.length,
  }

  return {
    ...existing,
    summary,
    risks: mergedRisks,
    checklist: mergedChecklist,
    riskRelations: mergedRelations,
    reasoningTrace: mergedTrace,
    uncertainties: mergedUncertainties.length > 0 ? mergedUncertainties : undefined,
    meta: {
      ...existing.meta,
      sourceCount: allSources.length,
    },
  }
}

function similarity(a: string, b: string): number {
  if (a === b) return 1
  const shorter = a.length < b.length ? a : b
  const longer = a.length < b.length ? b : a
  if (longer.length === 0) return 1

  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++
  }
  return matches / longer.length
}

function mergeRisks(existing: Risk[], newRisks: Risk[]): Risk[] {
  const merged = [...existing]

  for (const newRisk of newRisks) {
    let matched = false
    for (let i = 0; i < merged.length; i++) {
      const existingRisk = merged[i]
      const typeMatch = existingRisk.type === newRisk.type
      const titleSim = similarity(existingRisk.title, newRisk.title)

      if (typeMatch && titleSim > SIMILARITY_THRESHOLD_MERGE) {
        const mergedEvidence = mergeEvidence(existingRisk.evidence || [], newRisk.evidence || [])
        merged[i] = {
          ...existingRisk,
          description: mergeDescriptions(existingRisk.description, newRisk.description),
          evidence: mergedEvidence,
          sources: [...new Set([...(existingRisk.sources || []), ...(newRisk.sources || [])])],
          confidence: Math.max(existingRisk.confidence || 0, newRisk.confidence || 0),
        }
        matched = true
        break
      }
    }

    if (!matched) {
      merged.push({
        ...newRisk,
        id: `r${merged.length + 1}`,
      })
    }
  }

  return merged
}

function mergeEvidence(a: Evidence[], b: Evidence[]): Evidence[] {
  const seen = new Set<string>()
  const result: Evidence[] = []

  for (const e of [...a, ...b]) {
    const key = `${e.sourceName}:${e.quote.substring(0, 50)}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(e)
    }
  }

  return result
}

function mergeDescriptions(a: string, b: string): string {
  if (a.includes(b)) return a
  if (b.includes(a)) return b
  if (similarity(a, b) > SIMILARITY_THRESHOLD_DESCRIPTION) return a
  return `${a}\n\n补充：${b}`
}

function mergeChecklist(existing: ChecklistItem[], newItems: ChecklistItem[]): ChecklistItem[] {
  const merged = [...existing]
  const existingTexts = new Set(existing.map((c) => c.text))

  for (const item of newItems) {
    if (!existingTexts.has(item.text)) {
      merged.push({
        ...item,
        id: `t${merged.length + 1}`,
      })
    }
  }

  return merged
}

function mergeReasoningTrace(
  existing: ReasoningStep[] | undefined,
  newSteps: ReasoningStep[] | undefined,
): ReasoningStep[] | undefined {
  if (!existing && !newSteps) return undefined
  if (!existing) return newSteps
  if (!newSteps) return existing

  const incrementalStep = {
    step: existing.length + 1,
    title: '增量分析',
    description: '补充新材料后的增量核验过程',
    details: '基于新增材料进行补充分析，合并到已有结果中。',
    result: 'completed',
    timestamp: new Date().toISOString(),
  }

  return [
    ...existing,
    incrementalStep,
    ...newSteps.map((s, i) => ({
      ...s,
      step: existing.length + 2 + i,
    })),
  ]
}

function computeRiskRelationsSimple(risks: Risk[], sources: Source[]) {
  const associations: RiskAssociation[] = []
  const relatedRiskIds: Record<string, string[]> = {}
  const conflictPairs: Array<{ risk1Id: string; risk2Id: string; reason: string }> = []

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
