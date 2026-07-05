import express from 'express'
import type { ShareService } from '../../domain/services/shareService.js'
import type { TaskService } from '../../domain/services/taskService.js'
import type { AnalyzeResult, Share } from '../../domain/types.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { validateBody } from '../middleware/zodValidator.js'
import { shareCreateSchema, shareDeleteSchema } from '../validation/schemas.js'

function getShareService(): ShareService {
  return getService<ShareService>(Tokens.ShareService)
}

function getTaskService(): TaskService {
  return getService<TaskService>(Tokens.TaskService)
}

const router = express.Router()

router.post(
  '/share/:taskId',
  validateBody(shareCreateSchema.optional().default({})),
  async (req, res) => {
    const { userId, sessionId } = await getUserIdAndSessionId(req)
    const taskId = String(req.params.taskId)
    const task = await getTaskService().getTask(userId, sessionId, taskId)
    if (!task) {
      return res.status(404).json({ code: 404, msg: '任务不存在' })
    }

    const expiresInDays = req.body.expiresInDays || 7
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    const share = await getShareService().createShare(
      userId,
      sessionId,
      taskId,
      task.title,
      task.result as AnalyzeResult,
      expiresAt,
    )

    const shareUrl = `/share/${share.token}`
    res.json({
      code: 200,
      data: {
        token: share.token,
        url: shareUrl,
        expiresAt: share.expiresAt,
        viewCount: 0,
      },
    })
  },
)

router.get('/share/:token', async (req, res) => {
  const token = String(req.params.token)
  const share = await getShareService().getShareByToken(token)
  if (!share) {
    return res.status(404).json({ code: 404, msg: '分享不存在或已过期' })
  }

  const task = await getTaskService().getTaskMetaForShare(String(share.taskId))
  if (!task) {
    return res.status(404).json({ code: 404, msg: '关联的任务不存在' })
  }

  const result = share.snapshot as AnalyzeResult | undefined
  res.json({
    code: 200,
    data: {
      title: task.title,
      scenarioType: task.scenarioType,
      createdAt: task.createdAt,
      viewCount: share.viewCount,
      expiresAt: share.expiresAt,
      result: {
        summary: result?.summary || { critical: 0, warning: 0, info: 0, total: 0 },
        risks: result?.risks || [],
        checklist: result?.checklist || [],
        alignedVersion: result?.alignedVersion || '',
        extractedEntities: result?.extractedEntities || {},
      },
    },
  })
})

router.get('/share/task/:taskId', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const taskId = String(req.params.taskId)
  const task = await getTaskService().getTask(userId, sessionId, taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }

  const shares = await getShareService().getSharesByTask(taskId)
  res.json({
    code: 200,
    data: shares.map((s: Share) => ({
      token: s.token,
      url: `/share/${s.token}`,
      expiresAt: s.expiresAt,
      viewCount: s.viewCount,
      createdAt: s.createdAt,
    })),
  })
})

router.delete('/share/:taskId', validateBody(shareDeleteSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const taskId = String(req.params.taskId)
  const task = await getTaskService().getTask(userId, sessionId, taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }

  const { token } = req.body
  const success = await getShareService().deleteShare(userId, sessionId, token)
  res.json({ code: 200, data: { success } })
})

export default router
