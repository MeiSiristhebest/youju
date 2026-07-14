import express from 'express'
import { getEnv } from '../../infrastructure/env.js'
import {
  handleCleanup,
  handleDailyBackup,
  handleRotateBackups,
  handleTimeDecay,
  handleWeeklyBackup,
} from '../../infrastructure/scheduledTasks.js'

const router = express.Router()

function verifyCronSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const cronSecret = getEnv().CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET 环境变量未配置')
    res.status(500).json({ code: 500, msg: '服务器未配置 Cron 密钥' })
    return
  }

  const requestSecret = req.headers['x-cron-secret']
  if (!requestSecret || requestSecret !== cronSecret) {
    console.warn('[Cron] 未授权的 Cron 请求，密钥不匹配')
    res.status(401).json({ code: 401, msg: '未授权的 Cron 请求' })
    return
  }

  next()
}

router.post('/cron/time-decay', verifyCronSecret, async (_req, res) => {
  try {
    const result = await handleTimeDecay()
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('[Cron] 时间衰减端点异常:', e)
    res.status(500).json({ code: 500, msg: '时间衰减任务异常' })
  }
})

router.post('/cron/cleanup', verifyCronSecret, async (_req, res) => {
  try {
    const result = await handleCleanup()
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('[Cron] 数据清理端点异常:', e)
    res.status(500).json({ code: 500, msg: '数据清理任务异常' })
  }
})

router.post('/cron/backup/daily', verifyCronSecret, async (_req, res) => {
  try {
    const result = await handleDailyBackup()
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('[Cron] 每日备份端点异常:', e)
    res.status(500).json({ code: 500, msg: '每日备份任务异常' })
  }
})

router.post('/cron/backup/weekly', verifyCronSecret, async (_req, res) => {
  try {
    const result = await handleWeeklyBackup()
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('[Cron] 每周备份端点异常:', e)
    res.status(500).json({ code: 500, msg: '每周备份任务异常' })
  }
})

router.post('/cron/backup/rotate', verifyCronSecret, async (_req, res) => {
  try {
    const result = await handleRotateBackups()
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('[Cron] 备份轮转端点异常:', e)
    res.status(500).json({ code: 500, msg: '备份轮转任务异常' })
  }
})

export default router
