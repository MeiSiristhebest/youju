import { aiRequestQueue } from '../../ai/concurrencyLimiter.js'
import type { AnalyzeResult, ScenarioKnowledge, Source } from '../types.js'
import { analyzeSourcesStream } from './analysisService.js'

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

const TASK_TTL_MS = 30 * 60 * 1000
const tasks = new Map<string, TaskInternalState>()

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

function scheduleCleanup(taskId: string): void {
  const task = tasks.get(taskId)
  if (!task) return

  if (task.timeoutId) {
    clearTimeout(task.timeoutId)
  }

  task.timeoutId = setTimeout(() => {
    tasks.delete(taskId)
    console.log(`[TaskManager] 任务已过期并清理: ${taskId}`)
  }, TASK_TTL_MS)
}

export function createTask(params: {
  sources: Source[]
  scenarioType: string
  scenarioKnowledge?: ScenarioKnowledge[]
  userId: number | null
  sessionId: string | null
}): string {
  const taskId = generateTaskId()
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

  tasks.set(taskId, taskState)

  aiRequestQueue
    .run(() => executeTask(taskId, params))
    .catch((error) => {
      console.error(`[TaskManager] 任务执行异常: ${taskId}`, error)
    })

  return taskId
}

async function executeTask(
  taskId: string,
  params: {
    sources: Source[]
    scenarioType: string
    scenarioKnowledge?: ScenarioKnowledge[]
    userId: number | null
    sessionId: string | null
  },
): Promise<void> {
  const task = tasks.get(taskId)
  if (!task) return

  task.status = 'running'
  task.startedAt = new Date().toISOString()

  try {
    await analyzeSourcesStream(
      params.sources,
      params.scenarioType,
      params.scenarioKnowledge,
      {
        onStepStart: (step) => {
          const t = tasks.get(taskId)
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
        onStepComplete: (step) => {
          const t = tasks.get(taskId)
          if (!t) return

          let taskStep = t.steps.find((s) => s.id === step.id)
          if (!taskStep) {
            taskStep = {
              id: step.id,
              name: step.name,
              index: step.index,
              status: 'completed',
              output: step.output?.data || null,
              completedAt: new Date().toISOString(),
            }
            t.steps.push(taskStep)
          } else {
            taskStep.status = 'completed'
            taskStep.output = step.output?.data || null
            taskStep.completedAt = new Date().toISOString()
          }
        },
        onComplete: (result) => {
          const t = tasks.get(taskId)
          if (!t) return

          t.status = 'completed'
          t.result = result
          t.completedAt = new Date().toISOString()
          scheduleCleanup(taskId)
        },
        onError: (error) => {
          const t = tasks.get(taskId)
          if (!t) return

          t.status = 'failed'
          t.error = error.message
          t.completedAt = new Date().toISOString()
          scheduleCleanup(taskId)
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
    const t = tasks.get(taskId)
    if (t) {
      t.status = 'failed'
      t.error = (error as Error).message
      t.completedAt = new Date().toISOString()
      scheduleCleanup(taskId)
    }
  }
}

export function getTaskStatus(taskId: string): TaskStatusResponse | null {
  const task = tasks.get(taskId)
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

export function getTaskResult(taskId: string): AnalyzeResult | null {
  const task = tasks.get(taskId)
  if (task?.status !== 'completed') return null
  return task.result || null
}

export function getTaskStats(): {
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

  for (const task of tasks.values()) {
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
    total: tasks.size,
    queued,
    running,
    completed,
    failed,
  }
}

export function cleanupExpiredTasks(): void {
  const now = Date.now()
  for (const [taskId, task] of tasks.entries()) {
    if (task.completedAt) {
      const completedTime = new Date(task.completedAt).getTime()
      if (now - completedTime > TASK_TTL_MS) {
        tasks.delete(taskId)
      }
    }
  }
}
