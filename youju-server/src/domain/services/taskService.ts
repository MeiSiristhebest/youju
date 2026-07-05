import type { TaskRepository } from '../ports/repositories.js'
import type { AnalyzeResult, ScenarioKnowledge, Source, Task } from '../types.js'

interface AnalysisService {
  analyzeSources(
    sources: Source[],
    scenarioType?: string,
    scenarioKnowledge?: ScenarioKnowledge[],
    options?: {
      userId?: number | null
      sessionId?: string | null
      taskId?: string | null
      persist?: boolean
    },
  ): Promise<AnalyzeResult>
}

interface SourceService {
  createSource(
    userId: number | null,
    sessionId: string | null,
    type: string,
    name: string,
    content: string,
    meta?: string,
  ): Promise<Source>
  listSources(userId: number | null, sessionId: string | null): Promise<Source[]>
}

/**
 * TaskService（构造注入模式）
 *
 * 历史反模式：let _taskRepo + setTaskRepository() 模块级可变单例 + 跨 service 直接 import
 * 当前：通过构造函数接收三个依赖
 *   - TaskRepository（必填）
 *   - AnalysisService（必填，接口注入）
 *   - SourceService（必填，接口注入）
 */
export class TaskService {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly analysisService: AnalysisService,
    private readonly sourceService: SourceService,
  ) {}

  async createTask(
    userId: number | null,
    sessionId: string | null,
    title: string,
    scenarioType?: string,
  ): Promise<Task> {
    const result = await this.taskRepo.createTask(userId, sessionId, title, scenarioType)
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

  async getTask(userId: number | null, sessionId: string | null, id: string): Promise<Task | null> {
    const task = await this.taskRepo.getTaskById(userId, sessionId, id)
    if (!task) return null
    const sources = await this.sourceService.listSources(userId, sessionId)
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

  async listTasks(userId: number | null, sessionId: string | null): Promise<Task[]> {
    const tasks = await this.taskRepo.getTasksByUser(userId, sessionId)
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

  async updateTask(
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
    const task = await this.taskRepo.updateTask(userId, sessionId, id, data)
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

  async deleteTask(userId: number | null, sessionId: string | null, id: string): Promise<boolean> {
    return this.taskRepo.deleteTask(userId, sessionId, id)
  }

  async getTaskChecklistState(taskId: string): Promise<string[]> {
    const state = await this.taskRepo.getTaskChecklistState(taskId)
    return (state as string[]) ?? []
  }

  async updateTaskChecklistState(taskId: string, checklistState: string[]): Promise<boolean> {
    await this.taskRepo.updateTaskChecklistState(taskId, checklistState)
    return true
  }

  async addSourceToTask(
    userId: number | null,
    sessionId: string | null,
    _taskId: string,
    type: string,
    name: string,
    content: string,
    meta?: string,
  ): Promise<Source> {
    return this.sourceService.createSource(userId, sessionId, type, name, content, meta)
  }

  async runAnalysis(userId: number | null, sessionId: string | null, taskId: string) {
    const task = await this.taskRepo.getTaskById(userId, sessionId, taskId)
    if (!task) throw new Error('Task not found')

    const sources = await this.sourceService.listSources(userId, sessionId)

    await this.taskRepo.updateTask(userId, sessionId, taskId, { status: 'analyzing' })

    try {
      const result = await this.analysisService.analyzeSources(sources, task.scenarioType, [], {
        userId,
        sessionId,
        taskId,
        persist: true,
      })

      await this.taskRepo.updateTask(userId, sessionId, taskId, {
        status: 'completed',
        riskCount: result.summary.total,
        result,
      })

      return result
    } catch (e) {
      await this.taskRepo.updateTask(userId, sessionId, taskId, { status: 'failed' })
      throw e
    }
  }

  async getTaskMetaForShare(id: string): Promise<Partial<Task> | null> {
    if (this.taskRepo.getTaskMetaByIdForShare) {
      return this.taskRepo.getTaskMetaByIdForShare(id)
    }
    return null
  }
}
