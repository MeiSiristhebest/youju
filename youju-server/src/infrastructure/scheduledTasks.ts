import { driver } from '../data/db.js'
import { createScenarioKnowledgeRepository } from '../data/repositories/scenarioKnowledgeRepository.js'
import { backupDatabase, rotateBackups } from './dbBackup.js'

const scenarioKnowledgeRepository = createScenarioKnowledgeRepository(driver)
const { applyTimeDecay, pruneLowQualityKnowledge, recalculateWeightedFrequencies } =
  scenarioKnowledgeRepository

export interface CronHandlerResult {
  success: boolean
  message: string
  details?: unknown
}

export async function handleTimeDecay(): Promise<CronHandlerResult> {
  const startTime = Date.now()
  console.log('[Cron] 开始执行时间衰减任务')

  try {
    await applyTimeDecay()
    const duration = Date.now() - startTime
    console.log(`[Cron] 时间衰减任务完成，耗时 ${duration}ms`)
    return {
      success: true,
      message: '时间衰减执行成功',
      details: { durationMs: duration },
    }
  } catch (e) {
    const duration = Date.now() - startTime
    const error = e as Error
    console.error(`[Cron] 时间衰减任务失败，耗时 ${duration}ms:`, error)
    return {
      success: false,
      message: `时间衰减执行失败: ${error.message}`,
      details: { durationMs: duration, error: error.message },
    }
  }
}

export async function handleCleanup(): Promise<CronHandlerResult> {
  const startTime = Date.now()
  console.log('[Cron] 开始执行数据清理任务')

  try {
    const prunedCount = await pruneLowQualityKnowledge(0.1)
    console.log(`[Cron] 清理了 ${prunedCount} 条低质量知识`)

    await recalculateWeightedFrequencies()
    console.log('[Cron] 重新计算加权频率完成')

    const duration = Date.now() - startTime
    console.log(`[Cron] 数据清理任务完成，耗时 ${duration}ms`)
    return {
      success: true,
      message: '数据清理执行成功',
      details: {
        durationMs: duration,
        prunedCount,
      },
    }
  } catch (e) {
    const duration = Date.now() - startTime
    const error = e as Error
    console.error(`[Cron] 数据清理任务失败，耗时 ${duration}ms:`, error)
    return {
      success: false,
      message: `数据清理执行失败: ${error.message}`,
      details: { durationMs: duration, error: error.message },
    }
  }
}

export async function handleDailyBackup(): Promise<CronHandlerResult> {
  const startTime = Date.now()
  console.log('[Cron] 开始执行每日备份任务')

  try {
    const backupInfo = await backupDatabase('daily')
    console.log(`[Cron] 每日备份完成: ${backupInfo.filename}`)

    const rotateResult = rotateBackups()
    console.log(
      `[Cron] 备份轮转完成: 删除 ${rotateResult.deleted.length} 个，保留 ${rotateResult.kept} 个`,
    )

    const duration = Date.now() - startTime
    console.log(`[Cron] 每日备份任务完成，耗时 ${duration}ms`)
    return {
      success: true,
      message: '每日备份执行成功',
      details: {
        durationMs: duration,
        backup: backupInfo,
        rotate: rotateResult,
      },
    }
  } catch (e) {
    const duration = Date.now() - startTime
    const error = e as Error
    console.error(`[Cron] 每日备份任务失败，耗时 ${duration}ms:`, error)
    return {
      success: false,
      message: `每日备份执行失败: ${error.message}`,
      details: { durationMs: duration, error: error.message },
    }
  }
}

export async function handleWeeklyBackup(): Promise<CronHandlerResult> {
  const startTime = Date.now()
  console.log('[Cron] 开始执行每周备份任务')

  try {
    const backupInfo = await backupDatabase('weekly')
    console.log(`[Cron] 每周备份完成: ${backupInfo.filename}`)

    const rotateResult = rotateBackups()
    console.log(
      `[Cron] 备份轮转完成: 删除 ${rotateResult.deleted.length} 个，保留 ${rotateResult.kept} 个`,
    )

    const duration = Date.now() - startTime
    console.log(`[Cron] 每周备份任务完成，耗时 ${duration}ms`)
    return {
      success: true,
      message: '每周备份执行成功',
      details: {
        durationMs: duration,
        backup: backupInfo,
        rotate: rotateResult,
      },
    }
  } catch (e) {
    const duration = Date.now() - startTime
    const error = e as Error
    console.error(`[Cron] 每周备份任务失败，耗时 ${duration}ms:`, error)
    return {
      success: false,
      message: `每周备份执行失败: ${error.message}`,
      details: { durationMs: duration, error: error.message },
    }
  }
}

export async function handleRotateBackups(): Promise<CronHandlerResult> {
  const startTime = Date.now()
  console.log('[Cron] 开始执行备份轮转任务')

  try {
    const result = rotateBackups()
    const duration = Date.now() - startTime
    console.log(`[Cron] 备份轮转任务完成，耗时 ${duration}ms`)
    return {
      success: true,
      message: '备份轮转执行成功',
      details: {
        durationMs: duration,
        deleted: result.deleted,
        kept: result.kept,
      },
    }
  } catch (e) {
    const duration = Date.now() - startTime
    const error = e as Error
    console.error(`[Cron] 备份轮转任务失败，耗时 ${duration}ms:`, error)
    return {
      success: false,
      message: `备份轮转执行失败: ${error.message}`,
      details: { durationMs: duration, error: error.message },
    }
  }
}
