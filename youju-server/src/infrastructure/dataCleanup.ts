import db from '../data/db.js'

const MAX_LOG_DAYS = 30 // 保留最近 30 天的详细日志
const MAX_STEP_RECORDS_PER_LOG = 100 // 每个 log 最多保留 100 条 step 记录

export function cleanupOldAnalysisLogs(daysToKeep: number = MAX_LOG_DAYS): number {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  const cutoffStr = cutoffDate.toISOString()

  // 先删除关联的 analysis_steps
  const stepsDeleted = db
    .prepare(`
    DELETE FROM analysis_steps
    WHERE analysis_log_id IN (
      SELECT id FROM analysis_logs
      WHERE created_at < ? AND status IN ('success', 'failed')
    )
  `)
    .run(cutoffStr).changes

  // 再删除 analysis_logs
  const logsDeleted = db
    .prepare(`
    DELETE FROM analysis_logs
    WHERE created_at < ? AND status IN ('success', 'failed')
  `)
    .run(cutoffStr).changes

  console.log(
    `[Cleanup] 删除了 ${logsDeleted} 条旧日志（保留 ${daysToKeep} 天），${stepsDeleted} 条步骤记录`,
  )

  return logsDeleted
}

export function cleanupExcessiveStepRecords(): number {
  // 找出 step 记录过多的 log
  const excessiveLogs = db
    .prepare(`
    SELECT analysis_log_id, COUNT(*) as step_count
    FROM analysis_steps
    GROUP BY analysis_log_id
    HAVING COUNT(*) > ?
  `)
    .all(MAX_STEP_RECORDS_PER_LOG) as Array<{ analysis_log_id: number; step_count: number }>

  let totalDeleted = 0

  for (const log of excessiveLogs) {
    // 保留最新的 MAX_STEP_RECORDS_PER_LOG 条记录
    const toDelete = db
      .prepare(`
      DELETE FROM analysis_steps
      WHERE analysis_log_id = ?
      AND id NOT IN (
        SELECT id FROM analysis_steps
        WHERE analysis_log_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
    `)
      .run(log.analysis_log_id, log.analysis_log_id, MAX_STEP_RECORDS_PER_LOG).changes

    totalDeleted += toDelete
  }

  if (totalDeleted > 0) {
    console.log(
      `[Cleanup] 清理了 ${excessiveLogs.length} 个 log 的冗余 step 记录，共删除 ${totalDeleted} 条`,
    )
  }

  return totalDeleted
}

export function vacuumDatabase(): void {
  console.log('[Cleanup] 执行数据库 VACUUM 优化')
  db.exec('VACUUM')
  console.log('[Cleanup] VACUUM 完成')
}

export function getCleanupStats() {
  const totalLogs = db.prepare('SELECT COUNT(*) as count FROM analysis_logs').get() as any
  const totalSteps = db.prepare('SELECT COUNT(*) as count FROM analysis_steps').get() as any
  const oldestLog = db.prepare('SELECT MIN(created_at) as oldest FROM analysis_logs').get() as any
  const newestLog = db.prepare('SELECT MAX(created_at) as newest FROM analysis_logs').get() as any

  return {
    totalLogs: totalLogs.count || 0,
    totalSteps: totalSteps.count || 0,
    oldestLog: oldestLog.oldest || null,
    newestLog: newestLog.newest || null,
    recommendedCleanup: totalLogs.count > 1000 || totalSteps.count > 5000,
  }
}
