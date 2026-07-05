import { DB_DRIVER, driver } from '../data/db.js'

const MAX_LOG_DAYS = 30 // 保留最近 30 天的详细日志
const MAX_STEP_RECORDS_PER_LOG = 100 // 每个 log 最多保留 100 条 step 记录

export async function cleanupOldAnalysisLogs(daysToKeep: number = MAX_LOG_DAYS): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  const cutoffStr = cutoffDate.toISOString()

  // 先删除关联的 analysis_steps
  const stepsDeletedInfo = await driver.run(
    `
    DELETE FROM analysis_steps
    WHERE analysis_log_id IN (
      SELECT id FROM analysis_logs
      WHERE created_at < ? AND status IN ('success', 'failed')
    )
  `,
    [cutoffStr],
  )

  // 再删除 analysis_logs
  const logsDeletedInfo = await driver.run(
    `
    DELETE FROM analysis_logs
    WHERE created_at < ? AND status IN ('success', 'failed')
  `,
    [cutoffStr],
  )

  const stepsDeleted = Number(stepsDeletedInfo.changes)
  const logsDeleted = Number(logsDeletedInfo.changes)

  console.log(
    `[Cleanup] 删除了 ${logsDeleted} 条旧日志（保留 ${daysToKeep} 天），${stepsDeleted} 条步骤记录`,
  )

  return logsDeleted
}

export async function cleanupExcessiveStepRecords(): Promise<number> {
  // 找出 step 记录过多的 log
  const excessiveLogs = await driver.all<{ analysis_log_id: string; step_count: number }>(
    `
    SELECT analysis_log_id, COUNT(*) as step_count
    FROM analysis_steps
    GROUP BY analysis_log_id
    HAVING COUNT(*) > ?
  `,
    [MAX_STEP_RECORDS_PER_LOG],
  )

  let totalDeleted = 0

  for (const log of excessiveLogs) {
    // 保留最新的 MAX_STEP_RECORDS_PER_LOG 条记录
    const toDeleteInfo = await driver.run(
      `
      DELETE FROM analysis_steps
      WHERE analysis_log_id = ?
      AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM analysis_steps
          WHERE analysis_log_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        ) AS temp
      )
    `,
      [log.analysis_log_id, log.analysis_log_id, MAX_STEP_RECORDS_PER_LOG],
    )

    totalDeleted += Number(toDeleteInfo.changes)
  }

  if (totalDeleted > 0) {
    console.log(
      `[Cleanup] 清理了 ${excessiveLogs.length} 个 log 的冗余 step 记录，共删除 ${totalDeleted} 条`,
    )
  }

  return totalDeleted
}

export async function vacuumDatabase(): Promise<void> {
  if (DB_DRIVER === 'neon') {
    console.log('[Cleanup] Neon 数据库无需执行 VACUUM 优化')
    return
  }
  console.log('[Cleanup] 执行数据库 VACUUM 优化')
  await driver.exec('VACUUM')
  console.log('[Cleanup] VACUUM 完成')
}

export async function getCleanupStats() {
  const totalLogs = await driver.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM analysis_logs',
  )
  const totalSteps = await driver.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM analysis_steps',
  )
  const oldestLog = await driver.get<{ oldest: string | null }>(
    'SELECT MIN(created_at) as oldest FROM analysis_logs',
  )
  const newestLog = await driver.get<{ newest: string | null }>(
    'SELECT MAX(created_at) as newest FROM analysis_logs',
  )

  const logsCount = totalLogs?.count || 0
  const stepsCount = totalSteps?.count || 0

  return {
    totalLogs: logsCount,
    totalSteps: stepsCount,
    oldestLog: oldestLog?.oldest || null,
    newestLog: newestLog?.newest || null,
    recommendedCleanup: logsCount > 1000 || stepsCount > 5000,
  }
}
