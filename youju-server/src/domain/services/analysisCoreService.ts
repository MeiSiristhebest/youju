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
  AIStepOutput,
  AnalyzeResult,
  ScenarioKnowledge,
  Source,
} from '../types.js'
import type { AnalysisStreamOrchestrator } from './analysisStreamOrchestrator.js'

export interface StreamAnalysisCallbacks {
  onStepStart?: (step: { id: string; name: string; index: number }) => void
  onStepComplete?: (step: { id: string; name: string; index: number; output: AIStepOutput }) => void
  onStepError?: (step: { id: string; name: string; index: number; error: string }) => void
  onComplete?: (result: AnalyzeResult) => void
  onError?: (error: Error) => void
}

const PIPELINE_STEPS = [
  { id: 'step-scenario-discovery', name: '场景发现' },
  { id: 'step-input-parsing', name: '输入解析' },
  { id: 'step-dimension-discovery', name: '维度发现' },
  { id: 'step-cross-source-extraction', name: '跨源提取' },
  { id: 'step-discrepancy-detection', name: '差异检测' },
  { id: 'step-self-check', name: '自检' },
  { id: 'step-final-output', name: '最终输出' },
]

export class AnalysisCoreService {
  constructor(
    private readonly analysisPort: AIAnalysisPort,
    private readonly orchestrator: AnalysisStreamOrchestrator,
  ) {}

  async analyzeWithStreaming(
    analysisLogId: string,
    sources: Source[],
    scenarioType?: string,
    scenarioKnowledge?: ScenarioKnowledge[],
    callbacks: StreamAnalysisCallbacks = {},
    aiConfig?: AIConfig,
    isDemo?: boolean,
    cachedResult?: AnalyzeResult,
  ): Promise<AnalyzeResult> {
    if (cachedResult) {
      for (let i = 0; i < PIPELINE_STEPS.length; i++) {
        const step = PIPELINE_STEPS[i]
        callbacks.onStepStart?.({ id: step.id, name: step.name, index: i })
        callbacks.onStepComplete?.({
          id: step.id,
          name: step.name,
          index: i,
          output: { data: null } as AIStepOutput,
        })
      }
      callbacks.onComplete?.(cachedResult)
      return cachedResult
    }

    return this.orchestrator.analyzeWithStreaming(
      analysisLogId,
      sources,
      scenarioType,
      scenarioKnowledge,
      callbacks,
      aiConfig,
      isDemo,
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
    return this.orchestrator.analyzeSourcesStream(
      sources,
      scenarioType,
      scenarioKnowledge,
      callbacks,
      options,
    )
  }

  async analyzeIncremental(
    existingSources: Source[],
    newSources: Source[],
    existingResult: AnalyzeResult,
    analyzeFn: (
      sources: Source[],
      scenarioType?: string,
      scenarioKnowledge?: ScenarioKnowledge[],
      options?: { persist?: boolean },
    ) => Promise<AnalyzeResult>,
    scenarioType?: string,
    scenarioKnowledge?: ScenarioKnowledge[],
  ): Promise<AnalyzeResult> {
    const allSources = mergeSourceLists(existingSources, newSources)
    const diff = computeSourceDiff(existingSources, newSources)
    const affectedSteps = determineAffectedSteps(diff)

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
      baseResult = filterOutAffectedRisks(existingResult, modifiedIds, removedIds)
    }

    const sourcesToAnalyze = [...diff.addedSources, ...diff.modifiedSources]

    if (sourcesToAnalyze.length === 0) {
      return {
        ...baseResult,
        meta: { ...baseResult.meta, sourceCount: allSources.length },
      }
    }

    const partialResult = await analyzeFn(sourcesToAnalyze, scenarioType, scenarioKnowledge, {
      persist: false,
    })
    return mergeAnalyzeResults(baseResult, partialResult, allSources)
  }
}
