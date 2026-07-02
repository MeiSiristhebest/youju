import type { TaskRepository } from '../ports/repositories.js'
import type { Source, Task } from '../types.js'
import { analyzeSources } from './analysisService.js'
import { createSource as createSourceService, listSources } from './sourceService.js'

let _taskRepo: TaskRepository | null = null

export function setTaskRepository(repo: TaskRepository): void {
  _taskRepo = repo
}

function getTaskRepo(): TaskRepository {
  if (!_taskRepo) {
    throw new Error('TaskRepository not set.')
  }
  return _taskRepo
}

export async function createTask(
  userId: number | null,
  sessionId: string | null,
  title: string,
  scenarioType?: string,
): Promise<Task> {
  const result = await getTaskRepo().createTask(userId, sessionId, title, scenarioType)
  return {
    id: result.id,
    userId: result.userId,
    sessionId: result.sessionId,
    title: result.title,
    status: result.status,
    scenarioType: result.scenarioType,
    riskCount: result.riskCount,
    sourceIds: result.sourceIds,
    result: result.result,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    sources: [],
  }
}

export async function getTask(
  userId: number | null,
  sessionId: string | null,
  id: string,
): Promise<Task | null> {
  const task = await getTaskRepo().getTaskById(userId, sessionId, id)
  if (!task) return null
  const sources = await listSources(userId, sessionId)
  return {
    id: task.id,
    userId: task.userId,
    sessionId: task.sessionId,
    title: task.title,
    status: task.status,
    scenarioType: task.scenarioType,
    riskCount: task.riskCount,
    sourceIds: task.sourceIds,
    result: task.result,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    sources,
  }
}

export async function listTasks(userId: number | null, sessionId: string | null): Promise<Task[]> {
  const tasks = await getTaskRepo().getTasksByUser(userId, sessionId)
  return tasks.map((t) => ({
    id: t.id,
    userId: t.userId,
    sessionId: t.sessionId,
    title: t.title,
    status: t.status,
    scenarioType: t.scenarioType,
    riskCount: t.riskCount,
    sourceIds: t.sourceIds,
    result: t.result,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    sources: [],
  }))
}

export async function updateTask(
  userId: number | null,
  sessionId: string | null,
  id: string,
  data: Partial<{
    title: string
    status: string
    riskCount: number
    sourceIds: string[]
    result: unknown
  }>,
): Promise<Task | null> {
  const task = await getTaskRepo().updateTask(userId, sessionId, id, data)
  if (!task) return null
  return {
    id: task.id,
    userId: task.userId,
    sessionId: task.sessionId,
    title: task.title,
    status: task.status,
    scenarioType: task.scenarioType,
    riskCount: task.riskCount,
    sourceIds: task.sourceIds,
    result: task.result,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    sources: [],
  }
}

export async function deleteTask(
  userId: number | null,
  sessionId: string | null,
  id: string,
): Promise<boolean> {
  return getTaskRepo().deleteTask(userId, sessionId, id)
}

export async function getTaskChecklistState(taskId: string): Promise<string[]> {
  const state = await getTaskRepo().getTaskChecklistState(taskId)
  return (state as string[]) ?? []
}

export async function updateTaskChecklistState(
  taskId: string,
  checklistState: string[],
): Promise<boolean> {
  await getTaskRepo().updateTaskChecklistState(taskId, checklistState)
  return true
}

export async function addSourceToTask(
  userId: number | null,
  sessionId: string | null,
  _taskId: string,
  type: string,
  name: string,
  content: string,
  meta?: string,
): Promise<Source> {
  return createSourceService(userId, sessionId, type, name, content, meta)
}

export async function runAnalysis(userId: number | null, sessionId: string | null, taskId: string) {
  const task = await getTaskRepo().getTaskById(userId, sessionId, taskId)
  if (!task) throw new Error('Task not found')

  const sources = await listSources(userId, sessionId)

  await getTaskRepo().updateTask(userId, sessionId, taskId, { status: 'analyzing' })

  try {
    const result = await analyzeSources(sources, task.scenarioType, [], {
      userId,
      sessionId,
      taskId,
      persist: true,
    })

    await getTaskRepo().updateTask(userId, sessionId, taskId, {
      status: 'completed',
      riskCount: result.summary.total,
      result,
    })

    return result
  } catch (e) {
    await getTaskRepo().updateTask(userId, sessionId, taskId, { status: 'failed' })
    throw e
  }
}
