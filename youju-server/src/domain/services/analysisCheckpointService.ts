import type { AnalysisLogRepository, TaskResultRepository } from '../ports/repositories.js'
import type { AnalysisCheckpointPort } from '../ports/servicePorts.js'

export type { AnalysisCheckpointPort } from '../ports/servicePorts.js'

import { classifyRiskLevel } from '../rules/riskRules.js'
import type { AIAnalysisPort, AnalyzeResult, Source } from '../types.js'

export class AnalysisCheckpointService implements AnalysisCheckpointPort {
  constructor(
    private readonly analysisPort: AIAnalysisPort,
    private readonly analysisLogRepo: AnalysisLogRepository,
    private readonly taskResultRepo: TaskResultRepository,
  ) {}

  async resumeAnalysisFromCheckpoint(
    analysisLogId: string,
    sources: Source[],
    options?: {
      userId?: number | null
      sessionId?: string | null
      taskId?: string | null
    },
  ): Promise<AnalyzeResult> {
    const checkpoint = await this.analysisLogRepo.getCheckpoint(analysisLogId)
    if (!checkpoint) {
      throw new Error(`Checkpoint not found for analysis log: ${analysisLogId}`)
    }

    const startTime = Date.now()

    const aiResult = await this.analysisPort.resumeFromCheckpoint?.(
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

    const existingLog = await this.analysisLogRepo.getLatestAnalysisLog(analysisLogId)
    if (existingLog) {
      const logGroupId = existingLog.logGroupId || analysisLogId
      await this.analysisLogRepo.appendAnalysisLog(logGroupId, 'resumed', {
        riskCount: result.summary.total,
        durationMs: totalLatencyMs,
        status: 'success',
      })
    }

    if (options?.taskId) {
      await this.taskResultRepo.createTaskResult(options.taskId, result)
    }

    return result
  }

  async retryAnalysisStep(
    analysisLogId: string,
    stepIndex: number,
    sources: Source[],
    _options?: {
      userId?: number | null
      sessionId?: string | null
    },
  ): Promise<{ success: boolean; stepStatus: string; checkpoint: unknown }> {
    const checkpoint = await this.analysisLogRepo.getCheckpoint(analysisLogId)
    if (!checkpoint) {
      throw new Error(`Checkpoint not found for analysis log: ${analysisLogId}`)
    }

    const checkpointData = checkpoint as {
      stepOutputs: Record<string, unknown>
      lastCompletedStepId: string
      lastCompletedStepIndex: number
      savedAt: string
    }

    if (stepIndex > checkpointData.lastCompletedStepIndex + 1) {
      throw new Error(`Step ${stepIndex} has not been executed yet, cannot retry`)
    }

    const aiResult = await this.analysisPort.resumeFromCheckpoint?.(
      sources,
      {
        stepOutputs: checkpointData.stepOutputs,
        lastCompletedStepId: checkpointData.lastCompletedStepId,
        lastCompletedStepIndex: stepIndex - 1,
      },
      {
        scenarioType: undefined,
        scenarioKnowledge: [],
      },
    )

    if (!aiResult) {
      throw new Error('resumeFromCheckpoint not implemented')
    }

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

    const existingLog = await this.analysisLogRepo.getLatestAnalysisLog(analysisLogId)
    if (existingLog) {
      const _logGroupId = existingLog.logGroupId || analysisLogId
      await this.analysisLogRepo.saveCheckpoint(existingLog.id, newCheckpoint)
    }

    const stepStatus = aiResult.steps[stepIndex]?.status || 'unknown'

    return {
      success: stepStatus === 'completed',
      stepStatus,
      checkpoint: newCheckpoint,
    }
  }

  async skipAnalysisStep(
    analysisLogId: string,
    stepIndex: number,
    _options?: {
      userId?: number | null
      sessionId?: string | null
    },
  ): Promise<{ success: boolean; checkpoint: unknown }> {
    const checkpoint = await this.analysisLogRepo.getCheckpoint(analysisLogId)
    if (!checkpoint) {
      throw new Error(`Checkpoint not found for analysis log: ${analysisLogId}`)
    }

    const checkpointData = checkpoint as {
      stepOutputs: Record<string, unknown>
      lastCompletedStepId: string
      lastCompletedStepIndex: number
      savedAt: string
    }

    const stepIds = Object.keys(checkpointData.stepOutputs)
    if (stepIndex >= stepIds.length) {
      throw new Error(`Invalid step index: ${stepIndex}`)
    }

    const stepIdToSkip = stepIds[stepIndex]
    checkpointData.stepOutputs[stepIdToSkip] = 'skipped'

    const newCheckpoint = {
      ...checkpointData,
      savedAt: new Date().toISOString(),
    }

    const existingLog = await this.analysisLogRepo.getLatestAnalysisLog(analysisLogId)
    if (existingLog) {
      await this.analysisLogRepo.saveCheckpoint(existingLog.id, newCheckpoint)
    }

    return {
      success: true,
      checkpoint: newCheckpoint,
    }
  }

  async getAnalysisCheckpoint(analysisLogId: string): Promise<unknown | null> {
    return this.analysisLogRepo.getCheckpoint(analysisLogId)
  }
}
