import express from 'express'
import type { AnalysisService } from '../../domain/services/analysisService.js'
import type { SourceService } from '../../domain/services/sourceService.js'
import type { TaskService } from '../../domain/services/taskService.js'
import type { AnalyzeResult, Source, Task } from '../../domain/types.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { validateBody } from '../middleware/zodValidator.js'
import { checklistUpdateSchema, taskCreateSchema } from '../validation/schemas.js'

function getAnalysisService(): AnalysisService {
  return getService<AnalysisService>(Tokens.AnalysisService)
}

function getSourceService(): SourceService {
  return getService<SourceService>(Tokens.SourceService)
}

function getTaskService(): TaskService {
  return getService<TaskService>(Tokens.TaskService)
}

const router = express.Router()

router.get('/tasks', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const tasks = await getTaskService().listTasks(userId, sessionId)
  const taskList = tasks
    .sort((a: Task, b: Task) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((t: Task) => ({
      id: t.id,
      title: t.title,
      scenarioType: t.scenarioType,
      sourceCount: t.sourceIds?.length || 0,
      createdAt: t.createdAt,
    }))
  res.json({ code: 200, data: taskList })
})

router.post('/tasks', validateBody(taskCreateSchema), async (req, res) => {
  const { title, scenarioType, sourceIds } = req.body

  const { userId, sessionId } = await getUserIdAndSessionId(req)

  try {
    const task = await getTaskService().createTask(userId, sessionId, title, scenarioType)

    if (sourceIds && sourceIds.length > 0) {
      const allSources = await getSourceService().listSources(userId, sessionId)
      const selectedSources = sourceIds
        .map((id: string) => allSources.find((s: Source) => s.id === id))
        .filter(Boolean)

      if (selectedSources.length === 0) {
        return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
      }

      const result = await getAnalysisService().analyzeSources(selectedSources, scenarioType, [], {
        userId,
        sessionId,
        taskId: task.id,
        persist: true,
      })
      res.json({ code: 200, data: { taskId: task.id, ...task, result } })
    } else {
      res.json({ code: 200, data: { taskId: task.id, ...task } })
    }
  } catch (e) {
    console.error('Create task error:', e)
    res.status(500).json({ code: 500, msg: '创建任务失败' })
  }
})

router.get('/tasks/:id', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const task = await getTaskService().getTask(userId, sessionId, req.params.id)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  res.json({ code: 200, data: task })
})

router.delete('/tasks/:id', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const success = await getTaskService().deleteTask(userId, sessionId, req.params.id)
  res.json({ code: 200, data: { success } })
})

router.get('/tasks/:id/checklist', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const task = await getTaskService().getTask(userId, sessionId, req.params.id)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  const checkedItems = await getTaskService().getTaskChecklistState(req.params.id)
  res.json({ code: 200, data: { checkedItems } })
})

router.put('/tasks/:id/checklist', validateBody(checklistUpdateSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const taskId = String(req.params.id)
  const task = await getTaskService().getTask(userId, sessionId, taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  const { checkedItems } = req.body
  await getTaskService().updateTaskChecklistState(taskId, checkedItems)
  res.json({ code: 200, data: { success: true } })
})

router.put('/tasks/:id/title', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const taskId = String(req.params.id)
  const { title } = req.body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ code: 400, msg: '标题不能为空' })
  }

  const updatedTask = await getTaskService().updateTask(userId, sessionId, taskId, {
    title: title.trim(),
  })
  if (!updatedTask) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  res.json({ code: 200, data: { id: updatedTask.id, title: updatedTask.title } })
})

router.get('/report/:taskId', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const task = await getTaskService().getTask(userId, sessionId, req.params.taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  const result = task.result as AnalyzeResult | undefined
  res.json({
    code: 200,
    data: {
      summary: result?.summary || { critical: 0, warning: 0, info: 0, total: 0 },
      risks: result?.risks || [],
      checklist: result?.checklist || [],
      alignedVersion: result?.alignedVersion || '',
    },
  })
})

export default router
