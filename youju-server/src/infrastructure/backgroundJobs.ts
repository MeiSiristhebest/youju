/**
 * 传统部署模式定时任务（基于 setInterval）
 *
 * 适用场景：
 * - 本地开发环境
 * - 传统服务器/容器长期运行部署
 *
 * Serverless 部署注意：
 * - 在 EdgeOne Pages 等 Serverless 环境中，函数执行完即结束，setInterval 不可靠
 * - Serverless 部署应使用 Cron Triggers 调用 HTTP 端点触发任务
 * - 详见 src/infrastructure/cronHandlers.ts 和 edgeone/cron/jobs.json
 * - 部署时设置 ENABLE_BACKGROUND_JOBS=false 禁用本文件的 setInterval 方式
 */

import { driver } from '../data/db.js'
import { createScenarioKnowledgeRepository } from '../data/repositories/scenarioKnowledgeRepository.js'
import { backupDatabase, rotateBackups } from './dbBackup.js'

const scenarioKnowledgeRepository = createScenarioKnowledgeRepository(driver)
const { applyTimeDecay, pruneLowQualityKnowledge, recalculateWeightedFrequencies } =
  scenarioKnowledgeRepository

// 传统部署模式的时间间隔配置
const DECAY_INTERVAL_MS = 24 * 60 * 60 * 1000 // 每 24 小时执行一次
const CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000 // 每 7 天清理一次
const BACKUP_DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000 // 每 24 小时备份一次
const BACKUP_WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000 // 每 7 天备份一次
const BACKUP_ROTATE_INTERVAL_MS = 24 * 60 * 60 * 1000 // 每 24 小时轮转一次

let decayTimer: ReturnType<typeof setInterval> | null = null
let cleanupTimer: ReturnType<typeof setInterval> | null = null
let dailyBackupTimer: ReturnType<typeof setInterval> | null = null
let weeklyBackupTimer: ReturnType<typeof setInterval> | null = null
let rotateTimer: ReturnType<typeof setInterval> | null = null

export function startBackgroundJobs() {
  console.log('[Background Jobs] 启动定时任务系统')

  // 启动 scenario knowledge decay 任务（每天执行）
  decayTimer = setInterval(() => {
    console.log('[Background Jobs] 执行 scenario_knowledge 时间衰减')
    try {
      applyTimeDecay()
      console.log('[Background Jobs] 时间衰减完成')
    } catch (e) {
      console.error('[Background Jobs] 时间衰减失败:', e)
    }
  }, DECAY_INTERVAL_MS)

  // 启动数据清理任务（每周执行）
  cleanupTimer = setInterval(() => {
    console.log('[Background Jobs] 执行历史数据清理')
    try {
      const prunedCount = pruneLowQualityKnowledge(0.1)
      console.log(`[Background Jobs] 清理了 ${prunedCount} 条低质量知识`)

      recalculateWeightedFrequencies()
      console.log('[Background Jobs] 重新计算加权频率完成')
    } catch (e) {
      console.error('[Background Jobs] 数据清理失败:', e)
    }
  }, CLEANUP_INTERVAL_MS)

  // 启动每日数据库备份任务
  dailyBackupTimer = setInterval(() => {
    console.log('[Background Jobs] 执行每日数据库备份')
    backupDatabase('daily')
      .then(() => rotateBackups())
      .catch((e) => console.error('[Background Jobs] 每日备份失败:', e))
  }, BACKUP_DAILY_INTERVAL_MS)

  // 启动每周数据库备份任务（独立于每日备份，便于长期保留）
  weeklyBackupTimer = setInterval(() => {
    console.log('[Background Jobs] 执行每周数据库备份')
    backupDatabase('weekly')
      .then(() => rotateBackups())
      .catch((e) => console.error('[Background Jobs] 每周备份失败:', e))
  }, BACKUP_WEEKLY_INTERVAL_MS)

  // 备份轮转清理任务（每天执行）
  rotateTimer = setInterval(() => {
    console.log('[Background Jobs] 执行备份轮转清理')
    try {
      rotateBackups()
    } catch (e) {
      console.error('[Background Jobs] 备份轮转失败:', e)
    }
  }, BACKUP_ROTATE_INTERVAL_MS)

  // 启动时立即执行一次（可选）
  if (process.env.RUN_JOBS_ON_START === 'true') {
    console.log('[Background Jobs] 启动时立即执行一次')
    try {
      applyTimeDecay()
      pruneLowQualityKnowledge(0.1)
      recalculateWeightedFrequencies()
      console.log('[Background Jobs] 启动任务执行完成')
    } catch (e) {
      console.error('[Background Jobs] 启动任务执行失败:', e)
    }

    // 启动时也创建一个备份（如果配置）
    if (process.env.BACKUP_ON_START === 'true') {
      backupDatabase('manual')
        .then(() => rotateBackups())
        .catch((e) => console.error('[Background Jobs] 启动备份失败:', e))
    }
  }
}

export function stopBackgroundJobs() {
  console.log('[Background Jobs] 停止定时任务系统')
  if (decayTimer) {
    clearInterval(decayTimer)
    decayTimer = null
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  if (dailyBackupTimer) {
    clearInterval(dailyBackupTimer)
    dailyBackupTimer = null
  }
  if (weeklyBackupTimer) {
    clearInterval(weeklyBackupTimer)
    weeklyBackupTimer = null
  }
  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
}

export function getBackgroundJobsStatus() {
  const dayMs = 24 * 60 * 60 * 1000
  const hourMs = 60 * 60 * 1000
  return {
    decayJobActive: decayTimer !== null,
    cleanupJobActive: cleanupTimer !== null,
    dailyBackupActive: dailyBackupTimer !== null,
    weeklyBackupActive: weeklyBackupTimer !== null,
    rotateJobActive: rotateTimer !== null,
    decayIntervalMs: DECAY_INTERVAL_MS,
    cleanupIntervalMs: CLEANUP_INTERVAL_MS,
    dailyBackupIntervalMs: BACKUP_DAILY_INTERVAL_MS,
    weeklyBackupIntervalMs: BACKUP_WEEKLY_INTERVAL_MS,
    nextDecayRun: decayTimer ? `将在 ${DECAY_INTERVAL_MS / hourMs} 小时后执行` : '未启动',
    nextCleanupRun: cleanupTimer ? `将在 ${CLEANUP_INTERVAL_MS / dayMs} 天后执行` : '未启动',
    nextDailyBackupRun: dailyBackupTimer
      ? `将在 ${BACKUP_DAILY_INTERVAL_MS / hourMs} 小时后执行`
      : '未启动',
    nextWeeklyBackupRun: weeklyBackupTimer
      ? `将在 ${BACKUP_WEEKLY_INTERVAL_MS / dayMs} 天后执行`
      : '未启动',
  }
}
