import { validateAndBuildResult } from '../rules/analysisRules.js'
import type {
  AIAnalysisPort,
  AIConfig,
  AIStepOutput,
  AnalyzeResult,
  ScenarioKnowledge,
  Source,
} from '../types.js'
import type { AnalysisResultPersister } from './analysisResultPersister.js'

export interface StreamAnalysisCallbacks {
  onStepStart?: (step: { id: string; name: string; index: number }) => void
  onStepComplete?: (step: { id: string; name: string; index: number; output: AIStepOutput }) => void
  onComplete?: (result: AnalyzeResult) => void
  onError?: (error: Error) => void
}

export class AnalysisStreamOrchestrator {
  constructor(
    private readonly analysisPort: AIAnalysisPort,
    private readonly persister: AnalysisResultPersister,
  ) {}

  async analyzeWithStreaming(
    analysisLogId: string,
    sources: Source[],
    scenarioType?: string,
    scenarioKnowledge?: ScenarioKnowledge[],
    callbacks: StreamAnalysisCallbacks = {},
    aiConfig?: AIConfig,
  ): Promise<AnalyzeResult> {
    const startTime = Date.now()
    const stepDbRecords: Record<string, string[]> = {}
    const stepIndexMap: Record<string, number> = {}
    const logGroupId = analysisLogId

    try {
      const aiResult = await this.analysisPort.analyze(sources, {
        scenarioType,
        scenarioKnowledge,
        aiConfig,
        onStepStart: (step: { id: string; name: string }) => {
          const stepIndex = Object.keys(stepIndexMap).length
          stepIndexMap[step.id] = stepIndex
          callbacks.onStepStart?.({ id: step.id, name: step.name, index: stepIndex })

          this.persister
            .persistStepStart({
              analysisLogId,
              step,
              stepIndex,
              sources,
              scenarioType,
            })
            .then((stepRecId) => {
              if (!stepDbRecords[step.id]) {
                stepDbRecords[step.id] = []
              }
              stepDbRecords[step.id].push(stepRecId)
            })
            .catch((e) => console.error('[AnalysisStreamOrchestrator] persistStepStart error:', e))
        },
        onStepComplete: (step: { id: string; name: string; output: AIStepOutput }) => {
          const stepIndex = stepIndexMap[step.id] ?? 0
          callbacks.onStepComplete?.({
            id: step.id,
            name: step.name,
            index: stepIndex,
            output: step.output,
          })

          const completedOutputs: Record<string, unknown> = {}
          for (const [sid] of Object.entries(stepIndexMap)) {
            if (sid !== step.id) {
              completedOutputs[sid] = stepDbRecords[sid]?.length > 0 ? true : null
            }
          }
          completedOutputs[step.id] = step.output?.data || null

          this.persister
            .persistStepComplete({
              analysisLogId,
              step,
              stepIndex,
              stepDbRecords,
              completedOutputs,
            })
            .then((stepRecId) => {
              const prevRecords = stepDbRecords[step.id] || []
              prevRecords.push(stepRecId)
            })
            .catch((e) =>
              console.error('[AnalysisStreamOrchestrator] persistStepComplete error:', e),
            )

          this.persister
            .saveCheckpoint(analysisLogId, {
              stepOutputs: completedOutputs,
              lastCompletedStepId: step.id,
              lastCompletedStepIndex: stepIndex,
              savedAt: new Date().toISOString(),
            })
            .catch((e) => console.error('[AnalysisStreamOrchestrator] saveCheckpoint error:', e))
        },
        onStepError: (step: { id: string; name: string; error: string }) => {
          const stepIndex = stepIndexMap[step.id] ?? 0
          this.persister
            .persistStepError({
              analysisLogId,
              step,
              stepIndex,
              stepDbRecords,
            })
            .catch((e) => console.error('[AnalysisStreamOrchestrator] persistStepError error:', e))
        },
      })

      const { result: rawResult, steps: stepSummaries, totalTokens, isMock } = aiResult
      const totalLatencyMs = Date.now() - startTime

      const result = validateAndBuildResult(rawResult)

      await this.persister.persistAnalysisSuccess({
        logGroupId,
        result,
        stepSummaries,
        totalTokens,
        totalLatencyMs,
        isMock,
        sources,
        scenarioType,
      })

      callbacks.onComplete?.(result)
      return result
    } catch (error) {
      await this.persister.persistAnalysisFailure({
        logGroupId,
        error: error as Error,
        startTime,
      })
      callbacks.onError?.(error as Error)
      throw error
    }
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
    const persist = options?.persist ?? true
    let logGroupId: string | null = null
    const startTime = Date.now()

    const stepDbRecords: Record<string, string[]> = {}
    const stepIndexMap: Record<string, number> = {}

    if (persist) {
      const initialLog = await this.persister.createAnalysisLog({
        taskId: options?.taskId || null,
        userId: options?.userId ?? null,
        sessionId: options?.sessionId ?? null,
        scenarioType: scenarioType || 'custom',
        sourceCount: sources.length,
      })
      logGroupId = initialLog.logGroupId
    }

    try {
      const aiResult = await this.analysisPort.analyze(sources, {
        scenarioType,
        scenarioKnowledge,
        aiConfig: options?.aiConfig,
        onStepStart: (step: { id: string; name: string }) => {
          const stepIndex = Object.keys(stepIndexMap).length
          stepIndexMap[step.id] = stepIndex

          callbacks.onStepStart?.({ id: step.id, name: step.name, index: stepIndex })

          if (!persist || !logGroupId) return
          this.persister
            .getLatestAnalysisLog(logGroupId)
            .then((latestLog) => {
              if (!latestLog) return
              this.persister
                .persistStepStart({
                  analysisLogId: latestLog.id,
                  step,
                  stepIndex,
                  sources,
                  scenarioType,
                })
                .then((stepRecId) => {
                  if (!stepDbRecords[step.id]) {
                    stepDbRecords[step.id] = []
                  }
                  stepDbRecords[step.id].push(stepRecId)
                })
                .catch((e) =>
                  console.error('[AnalysisStreamOrchestrator] persistStepStart error:', e),
                )
            })
            .catch((e) =>
              console.error('[AnalysisStreamOrchestrator] getLatestAnalysisLog error:', e),
            )
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
          this.persister
            .getLatestAnalysisLog(logGroupId)
            .then((latestLog) => {
              if (!latestLog) return
              const prevRecords = stepDbRecords[step.id] || []

              const completedOutputs: Record<string, unknown> = {}
              for (const [sid, recs] of Object.entries(stepDbRecords)) {
                if (recs.length > 0 && sid !== step.id) {
                  completedOutputs[sid] = true
                }
              }
              completedOutputs[step.id] = step.output?.data || null

              this.persister
                .persistStepComplete({
                  analysisLogId: latestLog.id,
                  step,
                  stepIndex,
                  stepDbRecords,
                  completedOutputs,
                })
                .then((stepRecId) => {
                  prevRecords.push(stepRecId)
                })
                .catch((e) =>
                  console.error('[AnalysisStreamOrchestrator] persistStepComplete error:', e),
                )

              this.persister
                .saveCheckpoint(latestLog.id, {
                  stepOutputs: completedOutputs,
                  lastCompletedStepId: step.id,
                  lastCompletedStepIndex: stepIndex,
                  savedAt: new Date().toISOString(),
                })
                .catch((e) =>
                  console.error('[AnalysisStreamOrchestrator] saveCheckpoint error:', e),
                )
            })
            .catch((e) =>
              console.error('[AnalysisStreamOrchestrator] getLatestAnalysisLog error:', e),
            )
        },
        onStepError: (step: { id: string; name: string; error: string }) => {
          const stepIndex = stepIndexMap[step.id] ?? 0

          if (!persist || !logGroupId) return
          this.persister
            .getLatestAnalysisLog(logGroupId)
            .then((latestLog) => {
              if (!latestLog) return
              this.persister
                .persistStepError({
                  analysisLogId: latestLog.id,
                  step,
                  stepIndex,
                  stepDbRecords,
                })
                .catch((e) =>
                  console.error('[AnalysisStreamOrchestrator] persistStepError error:', e),
                )
            })
            .catch((e) =>
              console.error('[AnalysisStreamOrchestrator] getLatestAnalysisLog error:', e),
            )
        },
      })

      const { result: rawResult, steps: stepSummaries, totalTokens, isMock } = aiResult
      const totalLatencyMs = Date.now() - startTime

      const result = validateAndBuildResult(rawResult)

      if (persist && logGroupId) {
        await this.persister.persistAnalysisSuccess({
          logGroupId,
          result,
          stepSummaries,
          totalTokens,
          totalLatencyMs,
          isMock,
          sources,
          scenarioType,
          options: {
            userId: options?.userId,
            sessionId: options?.sessionId,
            taskId: options?.taskId,
          },
        })
      }

      callbacks.onComplete?.(result)
      return result
    } catch (error) {
      callbacks.onError?.(error as Error)
      throw error
    }
  }
}
