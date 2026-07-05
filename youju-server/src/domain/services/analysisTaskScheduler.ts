import type { AnalyzeResult, ScenarioKnowledge, Source } from '../types.js'
import type { AnalysisService } from './analysisService.js'

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface TaskStep {
  id: string
  name: string
  index: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: unknown
  error?: string
  startedAt?: string
  completedAt?: string
}

export interface CompletedStepInfo {
  stepId: string
  stepName: string
  stepIndex: number
  partialResult: unknown
}

export interface CurrentStepInfo {
  stepId: string
  stepName: string
  stepIndex: number
}

export interface TaskState {
  taskId: string
  status: TaskStatus
  steps: TaskStep[]
  result?: AnalyzeResult
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  userId: number | null
  sessionId: string | null
  scenarioType: string
  sourceCount: number
}

export interface TaskStatusResponse {
  taskId: string
  status: TaskStatus
  currentStep: CurrentStepInfo | null
  completedSteps: CompletedStepInfo[]
  partialResult?: unknown
  result?: AnalyzeResult
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

interface TaskInternalState extends TaskState {
  timeoutId?: ReturnType<typeof setTimeout>
}

interface TaskQueue {
  run<T>(fn: () => Promise<T>): Promise<T>
}

const TASK_TTL_MS = 30 * 60 * 1000

export class AnalysisTaskScheduler {
  private tasks = new Map<string, TaskInternalState>()
  private taskQueue: TaskQueue | null = null
  private analysisService: AnalysisService | null = null

  constructor(taskQueue?: TaskQueue, analysisService?: AnalysisService) {
    if (taskQueue) this.taskQueue = taskQueue
    if (analysisService) this.analysisService = analysisService
  }

  setTaskQueue(queue: TaskQueue): void {
    this.taskQueue = queue
  }

  setAnalysisService(service: AnalysisService): void {
    this.analysisService = service
  }

  private getTaskQueue(): TaskQueue {
    if (!this.taskQueue) {
      throw new Error('TaskQueue not set. Call setTaskQueue() first.')
    }
    return this.taskQueue
  }

  private getAnalysisService(): AnalysisService {
    if (!this.analysisService) {
      throw new Error('AnalysisService not set. Call setAnalysisService() first.')
    }
    return this.analysisService
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  }

  private scheduleCleanup(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    if (task.timeoutId) {
      clearTimeout(task.timeoutId)
    }

    task.timeoutId = setTimeout(() => {
      this.tasks.delete(taskId)
      console.log(`[TaskScheduler] 任务已过期并清理: ${taskId}`)
    }, TASK_TTL_MS)
  }

  createTask(params: {
    sources: Source[]
    scenarioType: string
    scenarioKnowledge?: ScenarioKnowledge[]
    userId: number | null
    sessionId: string | null
  }): string {
    const taskId = this.generateTaskId()
    const now = new Date().toISOString()

    const taskState: TaskInternalState = {
      taskId,
      status: 'queued',
      steps: [],
      createdAt: now,
      userId: params.userId,
      sessionId: params.sessionId,
      scenarioType: params.scenarioType,
      sourceCount: params.sources.length,
    }

    this.tasks.set(taskId, taskState)

    this.getTaskQueue()
      .run(() => this.executeTask(taskId, params))
      .catch((error) => {
        console.error(`[TaskScheduler] 任务执行异常: ${taskId}`, error)
      })

    return taskId
  }

  private async executeTask(
    taskId: string,
    params: {
      sources: Source[]
      scenarioType: string
      scenarioKnowledge?: ScenarioKnowledge[]
      userId: number | null
      sessionId: string | null
    },
  ): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = 'running'
    task.startedAt = new Date().toISOString()

    try {
      await this.getAnalysisService().analyzeSourcesStream(
        params.sources,
        params.scenarioType,
        params.scenarioKnowledge,
        {
          onStepStart: (step: { id: string; name: string; index: number }) => {
            const t = this.tasks.get(taskId)
            if (!t) return

            let taskStep = t.steps.find((s) => s.id === step.id)
            if (!taskStep) {
              taskStep = {
                id: step.id,
                name: step.name,
                index: step.index,
                status: 'running',
                startedAt: new Date().toISOString(),
              }
              t.steps.push(taskStep)
            } else {
              taskStep.status = 'running'
              taskStep.startedAt = new Date().toISOString()
            }
          },
          onStepComplete: (step: { id: string; name: string; index: number; output: unknown }) => {
            const t = this.tasks.get(taskId)
            if (!t) return

            let taskStep = t.steps.find((s) => s.id === step.id)
            if (!taskStep) {
              taskStep = {
                id: step.id,
                name: step.name,
                index: step.index,
                status: 'completed',
                output: step.output,
                completedAt: new Date().toISOString(),
              }
              t.steps.push(taskStep)
            } else {
              taskStep.status = 'completed'
              taskStep.output = step.output
              taskStep.completedAt = new Date().toISOString()
            }
          },
          onComplete: (result: AnalyzeResult) => {
            const t = this.tasks.get(taskId)
            if (!t) return

            t.status = 'completed'
            t.result = result
            t.completedAt = new Date().toISOString()
            this.scheduleCleanup(taskId)
          },
          onError: (error: Error) => {
            const t = this.tasks.get(taskId)
            if (!t) return

            t.status = 'failed'
            t.error = error.message
            t.completedAt = new Date().toISOString()
            this.scheduleCleanup(taskId)
          },
        },
        {
          userId: params.userId,
          sessionId: params.sessionId,
          taskId,
          persist: true,
        },
      )
    } catch (error) {
      const t = this.tasks.get(taskId)
      if (t) {
        t.status = 'failed'
        t.error = (error as Error).message
        t.completedAt = new Date().toISOString()
        this.scheduleCleanup(taskId)
      }
    }
  }

  getTaskStatus(taskId: string): TaskStatusResponse | null {
    const task = this.tasks.get(taskId)
    if (!task) return null

    const completedSteps: CompletedStepInfo[] = task.steps
      .filter((s) => s.status === 'completed')
      .map((s) => ({
        stepId: s.id,
        stepName: s.name,
        stepIndex: s.index,
        partialResult: s.output,
      }))

    const currentStep = task.steps.find((s) => s.status === 'running')

    const response: TaskStatusResponse = {
      taskId: task.taskId,
      status: task.status,
      currentStep: currentStep
        ? {
            stepId: currentStep.id,
            stepName: currentStep.name,
            stepIndex: currentStep.index,
          }
        : null,
      completedSteps,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    }

    if (completedSteps.length > 0) {
      response.partialResult = completedSteps[completedSteps.length - 1].partialResult
    }

    if (task.status === 'completed' && task.result) {
      response.result = task.result
    }

    if (task.status === 'failed' && task.error) {
      response.error = task.error
    }

    return response
  }

  getTaskResult(taskId: string): AnalyzeResult | null {
    const task = this.tasks.get(taskId)
    if (task?.status !== 'completed') return null
    return task.result || null
  }

  getTaskStats(): {
    total: number
    queued: number
    running: number
    completed: number
    failed: number
  } {
    let queued = 0
    let running = 0
    let completed = 0
    let failed = 0

    for (const task of this.tasks.values()) {
      switch (task.status) {
        case 'queued':
          queued++
          break
        case 'running':
          running++
          break
        case 'completed':
          completed++
          break
        case 'failed':
          failed++
          break
      }
    }

    return {
      total: this.tasks.size,
      queued,
      running,
      completed,
      failed,
    }
  }

  cleanupExpiredTasks(): void {
    const now = Date.now()
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.completedAt) {
        const completedTime = new Date(task.completedAt).getTime()
        if (now - completedTime > TASK_TTL_MS) {
          this.tasks.delete(taskId)
        }
      }
    }
  }
}
