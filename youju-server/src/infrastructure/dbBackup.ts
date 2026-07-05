import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DB_DRIVER, sqliteDriver } from '../data/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BACKUP_DIR = path.join(__dirname, '../../data/backups')
const MAX_DAILY_BACKUPS = 7 // 保留最近 7 个每日备份
const MAX_WEEKLY_BACKUPS = 4 // 保留最近 4 个每周备份
const MAX_MANUAL_BACKUPS = 10 // 保留最近 10 个手动备份

export type BackupType = 'daily' | 'weekly' | 'manual'

export interface BackupInfo {
  filename: string
  path: string
  sizeBytes: number
  sizeMB: number
  createdAt: string
  type: BackupType
}

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function parseBackupFilename(filename: string): { type: BackupType; date: Date } | null {
  // 格式: youju-{type}-{ISO timestamp}.db
  const match = filename.match(/^youju-(daily|weekly|manual)-(.+)\.db$/)
  if (!match) return null
  const type = match[1] as BackupType
  // 时间戳格式: 2026-07-02T12-30-45-123Z (ISO 中 : 和 . 被替换为 -)
  const dateStr = match[2].replace(/-(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2:$3.$4Z')
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  return { type, date }
}

/**
 * 执行在线备份
 * 使用 better-sqlite3 的 backup API，不阻塞读写操作
 */
export async function backupDatabase(type: BackupType = 'manual'): Promise<BackupInfo> {
  if (DB_DRIVER === 'neon') {
    console.log('[Backup] Neon 数据库备份由云平台托管，跳过本地备份')
    return {
      filename: 'neon-managed-backup.db',
      path: 'neon-cloud',
      sizeBytes: 0,
      sizeMB: 0,
      createdAt: new Date().toISOString(),
      type,
    }
  }

  ensureBackupDir()

  const now = new Date()
  // 文件名中的 : 和 . 替换为 -，避免 Windows 文件名问题
  const timestamp = now.toISOString().replace(/[:.]/g, '-')
  const filename = `youju-${type}-${timestamp}.db`
  const backupPath = path.join(BACKUP_DIR, filename)

  // 如果文件已存在（极小概率），追加序号
  let finalPath = backupPath
  let finalFilename = filename
  if (fs.existsSync(finalPath)) {
    let seq = 1
    while (fs.existsSync(path.join(BACKUP_DIR, `${filename}.${seq}`))) {
      seq++
    }
    finalFilename = `${filename}.${seq}`
    finalPath = path.join(BACKUP_DIR, finalFilename)
  }

  const start = Date.now()
  try {
    // better-sqlite3 backup: 原子性在线备份，WAL 模式下不阻塞
    // 通过 sqliteDriver 懒获取原始 DB 实例，避免在 neon 驱动下 null 引用
    const rawDb = sqliteDriver?.getRawWriter()
    if (!rawDb) {
      throw new Error('[Backup] SQLite driver 未初始化，无法执行本地备份')
    }
    await rawDb.backup(finalPath, {
      progress: (info: { totalPages: number; remainingPages: number }) => {
        const pct = (((info.totalPages - info.remainingPages) / info.totalPages) * 100).toFixed(1)
        if (Number(pct) % 25 === 0) {
          console.log(`[Backup] 进度: ${pct}%`)
        }
      },
    })
    const durationMs = Date.now() - start

    const stats = fs.statSync(finalPath)
    const sizeMB = Number((stats.size / 1024 / 1024).toFixed(2))
    console.log(`[Backup] ${type} 备份完成: ${finalFilename} (${sizeMB} MB, ${durationMs}ms)`)

    return {
      filename: finalFilename,
      path: finalPath,
      sizeBytes: stats.size,
      sizeMB,
      createdAt: now.toISOString(),
      type,
    }
  } catch (e) {
    console.error(`[Backup] ${type} 备份失败:`, e)
    // 清理可能产生的不完整备份文件
    if (fs.existsSync(finalPath)) {
      try {
        fs.unlinkSync(finalPath)
      } catch {
        // ignore
      }
    }
    throw e
  }
}

/**
 * 列出所有备份
 */
export function listBackups(): BackupInfo[] {
  ensureBackupDir()
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db'))

  const backups: BackupInfo[] = []
  for (const filename of files) {
    const filePath = path.join(BACKUP_DIR, filename)
    try {
      const stats = fs.statSync(filePath)
      const parsed = parseBackupFilename(filename)
      backups.push({
        filename,
        path: filePath,
        sizeBytes: stats.size,
        sizeMB: Number((stats.size / 1024 / 1024).toFixed(2)),
        createdAt: parsed?.date.toISOString() || stats.mtime.toISOString(),
        type: parsed?.type || 'manual',
      })
    } catch {
      // skip invalid files
    }
  }

  // 按创建时间倒序
  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * 轮转清理：按类型保留最近 N 个备份，删除更旧的
 */
export function rotateBackups(): { deleted: string[]; kept: number } {
  ensureBackupDir()
  const backups = listBackups()
  const deleted: string[] = []

  const limits: Record<BackupType, number> = {
    daily: MAX_DAILY_BACKUPS,
    weekly: MAX_WEEKLY_BACKUPS,
    manual: MAX_MANUAL_BACKUPS,
  }

  for (const type of ['daily', 'weekly', 'manual'] as BackupType[]) {
    const typedBackups = backups.filter((b) => b.type === type)
    const limit = limits[type]
    if (typedBackups.length > limit) {
      // 列表已按时间倒序，删除超出限制的旧备份
      const toDelete = typedBackups.slice(limit)
      for (const backup of toDelete) {
        try {
          fs.unlinkSync(backup.path)
          deleted.push(backup.filename)
          console.log(`[Backup] 轮转删除: ${backup.filename}`)
        } catch (e) {
          console.warn(`[Backup] 删除失败 ${backup.filename}:`, e)
        }
      }
    }
  }

  const kept = backups.length - deleted.length
  console.log(`[Backup] 轮转完成: 删除 ${deleted.length} 个，保留 ${kept} 个`)
  return { deleted, kept }
}

/**
 * 从备份恢复数据库
 * 注意：恢复前必须停止所有写入操作，建议在维护窗口执行
 */
export async function restoreFromBackup(
  backupFilename: string,
): Promise<{ success: boolean; message: string }> {
  if (DB_DRIVER === 'neon') {
    return { success: false, message: '云端 Neon PostgreSQL 不支持直接从本地 SQLite 备份恢复' }
  }

  const backupPath = path.join(BACKUP_DIR, backupFilename)
  if (!fs.existsSync(backupPath)) {
    return { success: false, message: `备份文件不存在: ${backupFilename}` }
  }

  // 安全检查：备份文件必须是有效的 SQLite 数据库
  try {
    const Database = (await import('better-sqlite3')).default
    const testDb = new Database(backupPath, { readonly: true })
    const tableCount = testDb
      .prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table'")
      .get() as { c: number }
    testDb.close()
    if (tableCount.c === 0) {
      return { success: false, message: '备份文件不包含任何表，可能已损坏' }
    }
  } catch (e) {
    return { success: false, message: `备份文件验证失败: ${(e as Error).message}` }
  }

  // 执行恢复前先创建当前状态的备份
  try {
    await backupDatabase('manual')
    console.log('[Backup] 恢复前已创建当前状态备份')
  } catch {
    console.warn('[Backup] 恢复前备份失败，继续恢复')
  }

  // 使用 backup API 反向恢复（从备份文件覆盖到主库）
  try {
    const Database = (await import('better-sqlite3')).default
    const backupDb = new Database(backupPath, { readonly: true })
    // 反向 backup：从备份库 → 主库
    // better-sqlite3 的 backup 方法是 "this → destination"
    // 所以需要从备份库调用 backup 到主库路径
    const mainDbPath = path.join(__dirname, '../../data/youju.db')
    await backupDb.backup(mainDbPath)
    backupDb.close()
    console.log(`[Backup] 已从 ${backupFilename} 恢复数据库`)
    return { success: true, message: `已从 ${backupFilename} 恢复` }
  } catch (e) {
    return { success: false, message: `恢复失败: ${(e as Error).message}` }
  }
}

/**
 * 获取备份统计信息
 */
export function getBackupStats() {
  const backups = listBackups()
  const totalSize = backups.reduce((sum, b) => sum + b.sizeBytes, 0)

  return {
    totalBackups: backups.length,
    totalSizeMB: Number((totalSize / 1024 / 1024).toFixed(2)),
    byType: {
      daily: backups.filter((b) => b.type === 'daily').length,
      weekly: backups.filter((b) => b.type === 'weekly').length,
      manual: backups.filter((b) => b.type === 'manual').length,
    },
    latestBackup: backups[0] || null,
    oldestBackup: backups[backups.length - 1] || null,
    limits: {
      daily: MAX_DAILY_BACKUPS,
      weekly: MAX_WEEKLY_BACKUPS,
      manual: MAX_MANUAL_BACKUPS,
    },
  }
}

export { BACKUP_DIR }
