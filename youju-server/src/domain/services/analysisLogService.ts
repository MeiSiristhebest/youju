import type {
  AnalysisLogRepository,
  AnalysisStepRepository,
  ScenarioKnowledgeRepository,
  TaskResultRepository,
} from '../ports/repositories.js'
import type { AIStepOutput, AnalyzeResult, Source } from '../types.js'

export interface CreateAnalysisLogInput {
  taskId: string | null
  userId: number | null
  sessionId: string | null
  scenarioType: string
  sourceCount: number
  isMock: boolean
}

export interface UpdateAnalysisLogInput {
  riskCount?: number
  durationMs?: number
  model?: string
  isMock?: boolean
  status?: 'success' | 'failed' | 'running'
  errorMessage?: string | null
  reasoningTrace?: string | null
  tokenPrompt?: number
  tokenCompletion?: number
  taskId?: string | null
  userId?: number | null
  sessionId?: string | null
  scenarioType?: string
  sourceCount?: number
}

export interface CreateStepInput extends Record<string, unknown> {
  analysisLogId: string
  stepId: string
  stepName: string
  stepIndex: number
  status: 'running' | 'completed' | 'failed'
  eventType: 'step_running' | 'step_completed' | 'step_summary' | 'error'
  promptVersion?: string
  model?: string
  inputSnapshot?: unknown
  outputSnapshot?: unknown
  rawInput?: unknown
  rawOutput?: unknown
  tokenPrompt?: number
  tokenCompletion?: number
  latencyMs?: number
  retryCount?: number
  errorMessage?: string | null
  startedAt?: string | null
  completedAt?: string | null
  parentStepId?: string | null
  stepOrder?: number
}

export interface StepRecordManager {
  stepDbRecords: Record<string, string[]>
  stepIndexMap: Record<string, number>

  handleStepStart(
    step: { id: string; name: string },
    analysisLogId: string,
    sources: Source[],
    scenarioType?: string,
  ): number

  handleStepComplete(
    step: { id: string; name: string; output: AIStepOutput },
    analysisLogId: string,
  ): { stepIndex: number; completedOutputs: Record<string, unknown> }

  handleStepError(step: { id: string; name: string; error: string }, analysisLogId: string): number
}

export class AnalysisLogService {
  constructor(
    private readonly analysisLogRepo: AnalysisLogRepository,
    private readonly analysisStepRepo: AnalysisStepRepository,
    private readonly scenarioKnowledgeRepo: ScenarioKnowledgeRepository,
    private readonly taskResultRepo: TaskResultRepository,
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
      isMock: input.isMock,
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

  async appendAnalysisLog(logGroupId: string, event: string, updates: UpdateAnalysisLogInput) {
    return this.analysisLogRepo.appendAnalysisLog(logGroupId, event, updates)
  }

  async createAnalysisStep(input: CreateStepInput) {
    return this.analysisStepRepo.createAnalysisStep(input)
  }

  async createStepEvent(input: {
    analysisLogId: string
    stepId: string
    stepName: string
    stepIndex: number
    eventType: string
    stepOrder: number
    status: string
    errorMessage?: string
  }) {
    return this.analysisStepRepo.createStepEvent(input)
  }

  async saveCheckpoint(
    analysisLogId: string,
    checkpoint: {
      stepOutputs: Record<string, unknown>
      lastCompletedStepId: string
      lastCompletedStepIndex: number
      savedAt: string
    },
  ) {
    return this.analysisLogRepo.saveCheckpoint(analysisLogId, checkpoint)
  }

  async getCheckpoint(analysisLogId: string) {
    return this.analysisLogRepo.getCheckpoint(analysisLogId)
  }

  async accumulateScenarioKnowledge(
    scenarioType: string,
    risks: Array<{ type: string; dimension: string; confidence: number }>,
  ) {
    return this.scenarioKnowledgeRepo.accumulateScenarioKnowledge(scenarioType, risks)
  }

  async createTaskResult(taskId: string, result: AnalyzeResult, analysisLogId?: string) {
    return this.taskResultRepo.createTaskResult(taskId, result, analysisLogId)
  }

  createStepRecordManager(): StepRecordManager {
    const stepDbRecords: Record<string, string[]> = {}
    const stepIndexMap: Record<string, number> = {}
    const analysisStepRepo = this.analysisStepRepo

    return {
      stepDbRecords,
      stepIndexMap,

      handleStepStart(step, analysisLogId, sources, scenarioType) {
        const stepIndex = Object.keys(stepIndexMap).length
        stepIndexMap[step.id] = stepIndex

        analysisStepRepo
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
          .then((stepRec) => {
            if (!stepDbRecords[step.id]) {
              stepDbRecords[step.id] = []
            }
            stepDbRecords[step.id].push(stepRec.id)
          })
          .catch((e) => console.error('[analysisLogService] createAnalysisStep error:', e))

        return stepIndex
      },

      handleStepComplete(step, analysisLogId) {
        const stepIndex = stepIndexMap[step.id] ?? 0
        const prevRecords = stepDbRecords[step.id] || []
        const prevRecId = prevRecords[prevRecords.length - 1] || null

        analysisStepRepo
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
            parentStepId: prevRecId,
            eventType: 'step_completed',
            stepOrder: prevRecords.length,
          })
          .then((stepRec) => {
            prevRecords.push(stepRec.id)
          })
          .catch((e) => console.error('[analysisLogService] createAnalysisStep error:', e))

        const completedOutputs: Record<string, unknown> = {}
        for (const [sid, recs] of Object.entries(stepDbRecords)) {
          if (recs.length > 0 && sid !== step.id) {
            completedOutputs[sid] = true
          }
        }
        completedOutputs[step.id] = step.output?.data || null

        return { stepIndex, completedOutputs }
      },

      handleStepError(step, analysisLogId) {
        const stepIndex = stepIndexMap[step.id] ?? 0
        const prevRecords = stepDbRecords[step.id] || []

        analysisStepRepo
          .createStepEvent({
            analysisLogId,
            stepId: step.id,
            stepName: step.name,
            stepIndex,
            eventType: 'error',
            stepOrder: prevRecords.length,
            status: 'failed',
            errorMessage: step.error,
          })
          .catch((e) => console.error('[analysisLogService] createStepEvent error:', e))

        return stepIndex
      },
    }
  }
}
