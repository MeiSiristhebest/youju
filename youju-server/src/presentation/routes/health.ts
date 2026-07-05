import express from 'express'
import type { ObservabilityService } from '../../domain/services/observabilityService.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getBackgroundJobsStatus } from '../../infrastructure/backgroundJobs.js'
import { getCleanupStats } from '../../infrastructure/dataCleanup.js'
import {
  backupDatabase,
  getBackupStats,
  listBackups,
  restoreFromBackup,
  rotateBackups,
} from '../../infrastructure/dbBackup.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'

function getObservabilityService(): ObservabilityService {
  return getService<ObservabilityService>(Tokens.ObservabilityService)
}

const router = express.Router()

router.get('/health', (_req, res) => {
  res.json({ code: 200, data: { status: 'ok', hasAiKey: !!process.env.AI_API_KEY } })
})

router.get('/admin/stats', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  try {
    const costStats = await getObservabilityService().getCostStats(userId, sessionId)
    const stepStats = await getObservabilityService().getStepPerformanceStats(userId, sessionId)
    const knowledgeStats = await getObservabilityService().getKnowledgeStats()

    res.json({
      code: 200,
      data: {
        ...costStats,
        stepPerformance: stepStats,
        knowledge: knowledgeStats,
      },
    })
  } catch (e) {
    console.error('Stats error:', e)
    res.status(500).json({ code: 500, msg: '获取统计失败' })
  }
})

// === 数据库运维端点 ===

// 数据库综合统计（含清理建议、后台任务状态、备份概览）
router.get('/admin/db-stats', async (_req, res) => {
  try {
    const cleanupStats = await getCleanupStats()
    const jobsStatus = getBackgroundJobsStatus()
    const backupStats = getBackupStats()
    res.json({
      code: 200,
      data: {
        cleanup: cleanupStats,
        backgroundJobs: jobsStatus,
        backups: backupStats,
      },
    })
  } catch (e) {
    console.error('DB stats error:', e)
    res.status(500).json({ code: 500, msg: '获取数据库统计失败' })
  }
})

// 列出所有备份
router.get('/admin/backups', (_req, res) => {
  try {
    const backups = listBackups()
    res.json({ code: 200, data: backups })
  } catch (e) {
    console.error('List backups error:', e)
    res.status(500).json({ code: 500, msg: '获取备份列表失败' })
  }
})

// 手动触发备份
router.post('/admin/backups', async (req, res) => {
  try {
    const type = (req.body?.type as 'daily' | 'weekly' | 'manual') || 'manual'
    const backup = await backupDatabase(type)
    // 备份后自动轮转
    rotateBackups()
    res.json({ code: 200, data: backup })
  } catch (e) {
    console.error('Backup error:', e)
    res.status(500).json({ code: 500, msg: '备份失败' })
  }
})

// 从备份恢复
router.post('/admin/backups/restore', async (req, res) => {
  const filename = req.body?.filename
  if (!filename) {
    return res.status(400).json({ code: 400, msg: '缺少 filename 参数' })
  }
  try {
    const result = await restoreFromBackup(filename)
    if (result.success) {
      res.json({ code: 200, msg: result.message })
    } else {
      res.status(400).json({ code: 400, msg: result.message })
    }
  } catch (e) {
    console.error('Restore error:', e)
    res.status(500).json({ code: 500, msg: '恢复失败' })
  }
})

// 手动轮转备份
router.post('/admin/backups/rotate', (_req, res) => {
  try {
    const result = rotateBackups()
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('Rotate error:', e)
    res.status(500).json({ code: 500, msg: '轮转失败' })
  }
})

export default router
