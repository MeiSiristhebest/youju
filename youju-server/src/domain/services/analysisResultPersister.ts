import type {
  AnalysisLogRepository,
  AnalysisStepRepository,
  ScenarioKnowledgeRepository,
  TaskResultRepository,
} from '../ports/repositories.js'
import type { AIStepOutput, AnalyzeResult, Risk, Source } from '../types.js'

export interface PersistStepStartInput {
  analysisLogId: string
  step: { id: string; name: string }
  stepIndex: number
  sources: Source[]
  scenarioType?: string
}

export interface PersistStepCompleteInput {
  analysisLogId: string
  step: { id: string; name: string; output: AIStepOutput }
  stepIndex: number
  stepDbRecords: Record<string, string[]>
  completedOutputs: Record<string, unknown>
}

export interface PersistStepErrorInput {
  analysisLogId: string
  step: { id: string; name: string; error: string }
  stepIndex: number
  stepDbRecords: Record<string, string[]>
}

export interface PersistAnalysisSuccessInput {
  logGroupId: string
  result: AnalyzeResult
  stepSummaries: Array<{
    id: string
    name: string
    status: string
    modelVersion: string
    promptVersion: string
    tokenPrompt: number
    tokenCompletion: number
    latencyMs: number
  }>
  totalTokens: number
  totalLatencyMs: number
  isMock: boolean
  sources: Source[]
  scenarioType?: string
  options?: {
    userId?: number | null
    sessionId?: string | null
    taskId?: string | null
  }
}

export interface PersistAnalysisFailureInput {
  logGroupId: string
  error: Error
  startTime: number
}

export interface CreateAnalysisLogInput {
  taskId: string | null
  userId: number | null
  sessionId: string | null
  scenarioType: string
  sourceCount: number
}

export class AnalysisResultPersister {
  constructor(
    private readonly analysisLogRepo: AnalysisLogRepository,
    private readonly analysisStepRepo: AnalysisStepRepository,
    private readonly taskResultRepo: TaskResultRepository,
    private readonly scenarioKnowledgeRepo: ScenarioKnowledgeRepository,
  ) {}

  async createAnalysisLog(
    input: CreateAnalysisLogInput,
  ): Promise<{ id: string; logGroupId: string }> {
    const log = await this.analysisLogRepo.createAnalysisLog({
      taskId: input.taskId,
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

  async getLatestAnalysisLog(logGroupId: string) {
    return this.analysisLogRepo.getLatestAnalysisLog(logGroupId)
  }

  persistStepStart(input: PersistStepStartInput): Promise<string> {
    return this.analysisStepRepo
      .createAnalysisStep({
        analysisLogId: input.analysisLogId,
        stepId: input.step.id,
        stepName: input.step.name,
        stepIndex: input.stepIndex,
        status: 'running',
        promptVersion: '',
        model: '',
        inputSnapshot: { sourceCount: input.sources.length, scenarioType: input.scenarioType },
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
      .then((stepRec) => stepRec.id)
  }

  persistStepComplete(input: PersistStepCompleteInput): Promise<string> {
    const prevRecords = input.stepDbRecords[input.step.id] || []
    const prevRecId = prevRecords[prevRecords.length - 1] || null

    return this.analysisStepRepo
      .createAnalysisStep({
        analysisLogId: input.analysisLogId,
        stepId: input.step.id,
        stepName: input.step.name,
        stepIndex: input.stepIndex,
        status: 'completed',
        promptVersion: input.step.output?.promptVersion || '',
        model: input.step.output?.modelVersion || '',
        inputSnapshot: null,
        outputSnapshot: input.step.output?.data || null,
        rawInput: null,
        rawOutput: input.step.output?.rawOutput || null,
        tokenPrompt: input.step.output?.tokenPrompt || 0,
        tokenCompletion: input.step.output?.tokenCompletion || 0,
        latencyMs: input.step.output?.latencyMs || 0,
        retryCount: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: new Date().toISOString(),
        parentStepId: prevRecId,
        eventType: 'step_completed',
        stepOrder: prevRecords.length,
      })
      .then((stepRec) => stepRec.id)
  }

  persistStepError(input: PersistStepErrorInput): Promise<void> {
    const prevRecords = input.stepDbRecords[input.step.id] || []
    this.analysisStepRepo
      .createStepEvent({
        analysisLogId: input.analysisLogId,
        stepId: input.step.id,
        stepName: input.step.name,
        stepIndex: input.stepIndex,
        eventType: 'error',
        stepOrder: prevRecords.length,
        status: 'failed',
        errorMessage: input.step.error,
      })
      .catch((e) => console.error('[AnalysisResultPersister] createStepEvent error:', e))
    return Promise.resolve()
  }

  saveCheckpoint(
    analysisLogId: string,
    checkpoint: {
      stepOutputs: Record<string, unknown>
      lastCompletedStepId: string
      lastCompletedStepIndex: number
      savedAt: string
    },
  ): Promise<void> {
    return this.analysisLogRepo.saveCheckpoint(analysisLogId, checkpoint)
  }

  async persistAnalysisSuccess(input: PersistAnalysisSuccessInput): Promise<void> {
    const completedLog = await this.analysisLogRepo.appendAnalysisLog(
      input.logGroupId,
      'completed',
      {
        taskId: input.options?.taskId || null,
        userId: input.options?.userId ?? null,
        sessionId: input.options?.sessionId ?? null,
        scenarioType: input.scenarioType || 'custom',
        sourceCount: input.sources.length,
        riskCount: input.result.summary.total,
        durationMs: input.totalLatencyMs,
        model: input.stepSummaries[0]?.modelVersion || '',
        isMock: input.isMock,
        status: 'success',
        errorMessage: null,
        reasoningTrace: input.result.reasoningTrace || null,
        rawOutput: null,
        tokenPrompt: input.totalTokens,
        tokenCompletion: 0,
      },
    )

    for (let i = 0; i < input.stepSummaries.length; i++) {
      const step = input.stepSummaries[i]
      await this.analysisStepRepo.createAnalysisStep({
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

    if (input.options?.taskId) {
      await this.taskResultRepo.createTaskResult(
        input.options.taskId,
        input.result,
        completedLog.id,
      )
    }

    if (input.result.risks && input.result.risks.length > 0) {
      await this.scenarioKnowledgeRepo.accumulateScenarioKnowledge(
        input.scenarioType || 'custom',
        input.result.risks.map((r: Risk) => ({
          type: r.type,
          dimension: r.dimension,
          confidence: r.confidence || 0.5,
        })),
      )
    }
  }

  async persistAnalysisFailure(input: PersistAnalysisFailureInput): Promise<void> {
    await this.analysisLogRepo.appendAnalysisLog(input.logGroupId, 'failed', {
      durationMs: Date.now() - input.startTime,
      status: 'failed',
      errorMessage: input.error.message,
    })
  }

  async accumulateScenarioKnowledge(
    scenarioType: string,
    risks: Array<{ type: string; dimension: string; confidence: number }>,
  ): Promise<void> {
    await this.scenarioKnowledgeRepo.accumulateScenarioKnowledge(scenarioType, risks)
  }
}
