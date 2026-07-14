import type { AIDraftPort } from '../ports/aiPorts.js'
import type { ModeCheckerPort } from '../ports/infrastructurePorts.js'
import type {
  AnalysisLogRepository,
  AnalysisStepRepository,
  ScenarioKnowledgeRepository,
  TaskResultRepository,
} from '../ports/repositories.js'
import type {
  AnalysisCheckpointPort,
  IncrementalAnalysisPort,
  RiskPreferencePort,
} from '../ports/servicePorts.js'
import type {
  AIAnalysisPort,
  AIConfig,
  AIStepOutput,
  AnalyzeResult,
  ScenarioKnowledge,
  Source,
} from '../types.js'
import { AnalysisCache } from './analysisCache.js'
import { AnalysisCoreService } from './analysisCoreService.js'
import { AnalysisResultPersister } from './analysisResultPersister.js'
import { AnalysisStreamOrchestrator } from './analysisStreamOrchestrator.js'

export interface StreamAnalysisCallbacks {
  onStepStart?: (step: { id: string; name: string; index: number }) => void
  onStepComplete?: (step: { id: string; name: string; index: number; output: AIStepOutput }) => void
  onStepError?: (step: { id: string; name: string; index: number; error: string }) => void
  onComplete?: (result: AnalyzeResult) => void
  onError?: (error: Error) => void
}

export class AnalysisService {
  private readonly coreService: AnalysisCoreService
  private readonly persister: AnalysisResultPersister
  private readonly cacheService: AnalysisCache

  constructor(
    private readonly analysisPort: AIAnalysisPort,
    private readonly draftPort: AIDraftPort,
    private readonly incrementalPort: IncrementalAnalysisPort,
    private readonly checkpointPort: AnalysisCheckpointPort,
    private readonly riskPreferencePort: RiskPreferencePort,
    analysisLogRepo: AnalysisLogRepository,
    analysisStepRepo: AnalysisStepRepository,
    taskResultRepo: TaskResultRepository,
    scenarioKnowledgeRepo: ScenarioKnowledgeRepository,
    modeChecker: ModeCheckerPort,
  ) {
    this.persister = new AnalysisResultPersister(
      analysisLogRepo,
      analysisStepRepo,
      taskResultRepo,
      scenarioKnowledgeRepo,
      modeChecker,
    )
    this.coreService = new AnalysisCoreService(
      analysisPort,
      new AnalysisStreamOrchestrator(analysisPort, this.persister),
    )
    this.cacheService = new AnalysisCache(modeChecker)
  }

  private async sortRisksByPreference(
    result: AnalyzeResult,
    userId: number | null,
    sessionId: string | null,
  ): Promise<AnalyzeResult> {
    const weights = await this.riskPreferencePort.getUserRiskWeights(userId, sessionId)
    const sortedRisks = this.riskPreferencePort.sortRisksByPreference(result.risks, weights)
    return { ...result, risks: sortedRisks }
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
    isDemo?: boolean,
    userId?: number | null,
    sessionId?: string | null,
  ): Promise<AnalyzeResult> {
    const useCache = this.cacheService.shouldUseCache({ isDemo })
    const cacheKey = useCache
      ? this.cacheService.computeAnalysisFingerprint(sources, scenarioType, scenarioKnowledge)
      : null

    let cachedResult: AnalyzeResult | null = null
    if (cacheKey) {
      cachedResult = this.cacheService.getCachedAnalysis(cacheKey)
      if (cachedResult) {
        console.log(
          `[Analyze Stream] 缓存命中 (key=${cacheKey.substring(0, 12)}…, hitCount=${cachedResult.meta?.cacheHitCount ?? 0})，快速回放步骤`,
        )
      }
    }

    const result = await this.coreService.analyzeWithStreaming(
      analysisLogId,
      sources,
      scenarioType,
      scenarioKnowledge,
      callbacks,
      aiConfig,
      isDemo,
      cachedResult ?? undefined,
    )

    if (cacheKey && !cachedResult) {
      this.cacheService.setCachedAnalysis(cacheKey, result)
    }

    return this.sortRisksByPreference(result, userId ?? null, sessionId ?? null)
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
      isDemo?: boolean
    },
  ): Promise<AnalyzeResult> {
    const useCache = this.cacheService.shouldUseCache(options)
    const cacheKey = useCache
      ? this.cacheService.computeAnalysisFingerprint(sources, scenarioType, scenarioKnowledge)
      : null

    if (cacheKey) {
      const cached = this.cacheService.getCachedAnalysis(cacheKey)
      if (cached) {
        console.log(
          `[Analyze] 缓存命中 (key=${cacheKey.substring(0, 12)}…, hitCount=${cached.meta?.cacheHitCount ?? 0})，跳过 AI 调用`,
        )
        return this.sortRisksByPreference(
          cached,
          options?.userId ?? null,
          options?.sessionId ?? null,
        )
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
      this.cacheService.setCachedAnalysis(cacheKey, result)
    }

    return this.sortRisksByPreference(result, options?.userId ?? null, options?.sessionId ?? null)
  }

  async preheatScenarioPresets(): Promise<{
    preheated: string[]
    skipped: string[]
    failed: Array<{ id: string; error: string }>
  }> {
    const { SCENARIO_PRESETS } = await import('../scenarioPresets.js')
    return this.cacheService.preheatScenarios(SCENARIO_PRESETS, (sources, scenarioType) =>
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
      isDemo?: boolean
    },
  ): Promise<AnalyzeResult> {
    return this.coreService.analyzeSourcesStream(
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
    return this.coreService.analyzeIncremental(
      existingSources,
      newSources,
      existingResult,
      (sources, type, knowledge, opts) =>
        this.analyzeSources(sources, type, knowledge, { ...options, ...opts }),
      scenarioType,
      scenarioKnowledge,
    )
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
    const result = await this.checkpointPort.resumeAnalysisFromCheckpoint(
      analysisLogId,
      sources,
      options,
    )
    return this.sortRisksByPreference(result, options?.userId ?? null, options?.sessionId ?? null)
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

  getAnalysisCacheStats() {
    return this.cacheService.getAnalysisCacheStats()
  }

  clearAnalysisCache() {
    return this.cacheService.clearAnalysisCache()
  }
}
