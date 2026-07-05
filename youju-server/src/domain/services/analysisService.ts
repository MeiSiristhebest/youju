import type {
  AnalysisLogRepository,
  AnalysisStepRepository,
  ScenarioKnowledgeRepository,
  TaskResultRepository,
} from '../ports/repositories.js'
import type { AnalysisCheckpointPort, IncrementalAnalysisPort } from '../ports/servicePorts.js'
import {
  computeSourceDiff,
  determineAffectedSteps,
  filterOutAffectedRisks,
  mergeAnalyzeResults,
  mergeSourceLists,
} from '../rules/analysisRules.js'
import type {
  AIAnalysisPort,
  AIConfig,
  AIDraftPort,
  AIStepOutput,
  AnalyzeResult,
  ScenarioKnowledge,
  Source,
} from '../types.js'
import type { AnalysisCache } from './analysisCache.js'
import { AnalysisResultPersister } from './analysisResultPersister.js'
import { AnalysisStreamOrchestrator } from './analysisStreamOrchestrator.js'

export interface StreamAnalysisCallbacks {
  onStepStart?: (step: { id: string; name: string; index: number }) => void
  onStepComplete?: (step: { id: string; name: string; index: number; output: AIStepOutput }) => void
  onComplete?: (result: AnalyzeResult) => void
  onError?: (error: Error) => void
}

export class AnalysisService {
  private readonly persister: AnalysisResultPersister
  private readonly orchestrator: AnalysisStreamOrchestrator

  constructor(
    readonly analysisPort: AIAnalysisPort,
    private readonly draftPort: AIDraftPort,
    readonly analysisLogRepo: AnalysisLogRepository,
    readonly analysisStepRepo: AnalysisStepRepository,
    readonly taskResultRepo: TaskResultRepository,
    readonly scenarioKnowledgeRepo: ScenarioKnowledgeRepository,
    private readonly incrementalPort: IncrementalAnalysisPort,
    private readonly checkpointPort: AnalysisCheckpointPort,
    private readonly analysisCache: AnalysisCache,
  ) {
    this.persister = new AnalysisResultPersister(
      analysisLogRepo,
      analysisStepRepo,
      taskResultRepo,
      scenarioKnowledgeRepo,
    )
    this.orchestrator = new AnalysisStreamOrchestrator(analysisPort, this.persister)
  }

  async createAnalysisLogEntry(input: {
    userId: number | null
    sessionId: string | null
    scenarioType: string
    sourceCount: number
  }): Promise<{ id: string; logGroupId: string }> {
    return this.persister.createAnalysisLog({
      taskId: null,
      userId: input.userId,
      sessionId: input.sessionId,
      scenarioType: input.scenarioType,
      sourceCount: input.sourceCount,
    })
  }

  async analyzeWithStreaming(
    analysisLogId: string,
    sources: Source[],
    scenarioType?: string,
    scenarioKnowledge?: ScenarioKnowledge[],
    callbacks: StreamAnalysisCallbacks = {},
    aiConfig?: AIConfig,
  ): Promise<AnalyzeResult> {
    return this.orchestrator.analyzeWithStreaming(
      analysisLogId,
      sources,
      scenarioType,
      scenarioKnowledge,
      callbacks,
      aiConfig,
    )
  }

  async analyzeSources(
    sources: Source[],
    scenarioType?: string,
    scenarioKnowledge?: ScenarioKnowledge[],
    options?: {
      userId?: number | null
      sessionId?: string | null
      taskId?: string | null
      persist?: boolean
      aiConfig?: AIConfig
    },
  ): Promise<AnalyzeResult> {
    const useCache = this.analysisCache.shouldUseCache(options)
    const cacheKey = useCache
      ? this.analysisCache.computeAnalysisFingerprint(sources, scenarioType, scenarioKnowledge)
      : null
    if (cacheKey) {
      const cached = this.analysisCache.getCachedAnalysis(cacheKey)
      if (cached) {
        console.log(
          `[Analyze] 缓存命中 (key=${cacheKey.substring(0, 12)}…, hitCount=${cached.meta?.cacheHitCount ?? 0})，跳过 AI 调用`,
        )
        return cached
      }
    }

    const result = await this.analyzeSourcesStream(
      sources,
      scenarioType,
      scenarioKnowledge,
      {},
      options,
    )

    if (cacheKey) {
      this.analysisCache.setCachedAnalysis(cacheKey, result)
    }

    return result
  }

  async preheatScenarioPresets(): Promise<{
    preheated: string[]
    skipped: string[]
    failed: Array<{ id: string; error: string }>
  }> {
    if (!process.env.AI_API_KEY) {
      console.log('[Preheat] 未配置 AI_API_KEY，跳过预热')
      return { preheated: [], skipped: [], failed: [] }
    }

    const { SCENARIO_PRESETS } = await import('../scenarioPresets.js')
    return this.analysisCache.preheatScenarios(SCENARIO_PRESETS, (sources, scenarioType) =>
      this.analyzeSources(sources, scenarioType, undefined, { persist: false }),
    )
  }

  async analyzeSourcesStream(
    sources: Source[],
    scenarioType?: string,
    scenarioKnowledge?: ScenarioKnowledge[],
    callbacks: StreamAnalysisCallbacks = {},
    options?: {
      userId?: number | null
      sessionId?: string | null
      taskId?: string | null
      persist?: boolean
      aiConfig?: AIConfig
    },
  ): Promise<AnalyzeResult> {
    return this.orchestrator.analyzeSourcesStream(
      sources,
      scenarioType,
      scenarioKnowledge,
      callbacks,
      options,
    )
  }

  async generateDraft(
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
    return this.draftPort.generateDraft(risk, context, stylePref)
  }

  async analyzeIncremental(
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
    const partialResult = await this.analyzeSources(
      sourcesToAnalyze,
      scenarioType,
      scenarioKnowledge,
      {
        ...options,
        persist: false,
      },
    )
    return mergeAnalyzeResults(baseResult, partialResult, allSources)
  }

  async resumeAnalysisFromCheckpoint(
    analysisLogId: string,
    sources: Source[],
    options?: {
      userId?: number | null
      sessionId?: string | null
      taskId?: string | null
    },
  ): Promise<AnalyzeResult> {
    return this.checkpointPort.resumeAnalysisFromCheckpoint(analysisLogId, sources, options)
  }

  async retryAnalysisStep(
    analysisLogId: string,
    stepIndex: number,
    sources: Source[],
    options?: {
      userId?: number | null
      sessionId?: string | null
    },
  ): Promise<{ success: boolean; stepStatus: string; checkpoint: unknown }> {
    return this.checkpointPort.retryAnalysisStep(analysisLogId, stepIndex, sources, options)
  }

  async skipAnalysisStep(
    analysisLogId: string,
    stepIndex: number,
    options?: {
      userId?: number | null
      sessionId?: string | null
    },
  ): Promise<{ success: boolean; checkpoint: unknown }> {
    return this.checkpointPort.skipAnalysisStep(analysisLogId, stepIndex, options)
  }

  async getAnalysisCheckpoint(analysisLogId: string): Promise<unknown | null> {
    return this.checkpointPort.getAnalysisCheckpoint(analysisLogId)
  }

  async performDiffBasedIncrementalAnalysis(
    existingResult: AnalyzeResult,
    existingSources: Source[],
    newSources: Source[],
    scenarioType: string,
    scenarioKnowledge: ScenarioKnowledge[],
    options?: {
      userId?: number | null
      sessionId?: string | null
      analysisLogId?: string | null
    },
  ) {
    return this.incrementalPort.performDiffBasedIncrementalAnalysis(
      existingResult,
      existingSources,
      newSources,
      scenarioType,
      scenarioKnowledge,
      options,
    )
  }
}
