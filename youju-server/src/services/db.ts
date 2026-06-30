import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '../../data/youju.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT UNIQUE,
    nickname TEXT,
    avatar TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    meta TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    title TEXT NOT NULL,
    scenario_type TEXT DEFAULT 'custom',
    source_ids TEXT DEFAULT '[]',
    result TEXT,
    checklist_state TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    expires_at TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS analysis_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    user_id INTEGER,
    session_id TEXT,
    scenario_type TEXT,
    source_count INTEGER DEFAULT 0,
    risk_count INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    model TEXT,
    is_mock INTEGER DEFAULT 1,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    reasoning_trace TEXT,
    raw_output TEXT,
    token_prompt INTEGER DEFAULT 0,
    token_completion INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    pref_key TEXT NOT NULL,
    pref_value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS scenario_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_type TEXT NOT NULL,
    dimension TEXT NOT NULL,
    risk_type TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    avg_confidence REAL DEFAULT 0,
    last_seen TEXT DEFAULT (datetime('now')),
    UNIQUE(scenario_type, dimension, risk_type)
  );
`)

// 数据库迁移：为旧表添加缺失的列
function addColumnIfNotExists(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[]
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

addColumnIfNotExists('sources', 'session_id', 'TEXT')
addColumnIfNotExists('tasks', 'session_id', 'TEXT')
addColumnIfNotExists('tasks', 'scenario_type', "TEXT DEFAULT 'custom'")
addColumnIfNotExists('tasks', 'checklist_state', "TEXT DEFAULT '[]'")
addColumnIfNotExists('analysis_logs', 'feedback', 'TEXT')

// 创建索引（放在迁移之后，确保列存在）
function createIndexIfNotExists(indexName: string, table: string, column: string) {
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column})`)
  } catch (e) {
    // 索引创建失败忽略（可能是列不存在等原因）
  }
}

createIndexIfNotExists('idx_sources_user', 'sources', 'user_id')
createIndexIfNotExists('idx_sources_session', 'sources', 'session_id')
createIndexIfNotExists('idx_tasks_user', 'tasks', 'user_id')
createIndexIfNotExists('idx_tasks_session', 'tasks', 'session_id')
createIndexIfNotExists('idx_shares_token', 'shares', 'share_token')
createIndexIfNotExists('idx_analysis_logs_user', 'analysis_logs', 'user_id')
createIndexIfNotExists('idx_analysis_logs_session', 'analysis_logs', 'session_id')
createIndexIfNotExists('idx_analysis_logs_task', 'analysis_logs', 'task_id')
createIndexIfNotExists('idx_user_prefs_user', 'user_preferences', 'user_id')
createIndexIfNotExists('idx_user_prefs_key', 'user_preferences', 'pref_key')
createIndexIfNotExists('idx_scenario_knowledge_type', 'scenario_knowledge', 'scenario_type')
createIndexIfNotExists('idx_scenario_knowledge_freq', 'scenario_knowledge', 'frequency')

// User 相关
export function findOrCreateUser(openid: string, nickname: string, avatar: string) {
  const existing = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid) as any
  if (existing) return existing
  const info = db.prepare('INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)').run(openid, nickname, avatar)
  return { id: info.lastInsertRowid, openid, nickname, avatar }
}

export function getUserById(id: number) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

// Source 相关
export function createSource(userId: number | null, sessionId: string | null, type: string, name: string, content: string, meta?: string) {
  const info = db.prepare('INSERT INTO sources (user_id, session_id, type, name, content, meta) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, sessionId, type, name, content, meta || null)
  return {
    id: String(info.lastInsertRowid),
    user_id: userId,
    session_id: sessionId,
    type,
    name,
    content,
    meta
  }
}

export function getSourcesByUser(userId: number | null, sessionId?: string | null) {
  let rows: any[]
  if (userId) {
    rows = db.prepare('SELECT * FROM sources WHERE user_id = ? ORDER BY id DESC').all(userId)
  } else if (sessionId) {
    rows = db.prepare('SELECT * FROM sources WHERE session_id = ? ORDER BY id DESC').all(sessionId)
  } else {
    rows = db.prepare('SELECT * FROM sources WHERE user_id IS NULL AND session_id IS NULL ORDER BY id DESC').all()
  }
  return rows.map((r: any) => ({ ...r, id: String(r.id) }))
}

// 获取材料ID列表
export function getSourceIds(sourceIds: string[]): any[] {
  if (!sourceIds || sourceIds.length === 0) return []
  const placeholders = sourceIds.map(() => '?').join(',')
  const rows = db.prepare(`SELECT id FROM sources WHERE id IN (${placeholders})`).all(...sourceIds) as any[]
  return rows.map(r => String(r.id))
}

// 删除材料（级联处理相关任务）
export function deleteSource(userId: number | null, sessionId: string | null, id: string) {
  if (userId) {
    // 查找使用此材料的任务
    const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(userId) as any[]
    for (const task of tasks) {
      const sourceIds = JSON.parse(task.source_ids || '[]')
      if (sourceIds.includes(id)) {
        // 从任务中移除此材料ID
        const newSourceIds = sourceIds.filter((sid: string) => sid !== id)
        db.prepare('UPDATE tasks SET source_ids = ? WHERE id = ?').run(JSON.stringify(newSourceIds), task.id)
      }
    }
    return db.prepare('DELETE FROM sources WHERE id = ? AND user_id = ?').run(id, userId).changes > 0
  } else if (sessionId) {
    // 查找使用此材料的任务
    const tasks = db.prepare('SELECT * FROM tasks WHERE session_id = ?').all(sessionId) as any[]
    for (const task of tasks) {
      const sourceIds = JSON.parse(task.source_ids || '[]')
      if (sourceIds.includes(id)) {
        // 从任务中移除此材料ID
        const newSourceIds = sourceIds.filter((sid: string) => sid !== id)
        db.prepare('UPDATE tasks SET source_ids = ? WHERE id = ?').run(JSON.stringify(newSourceIds), task.id)
      }
    }
    return db.prepare('DELETE FROM sources WHERE id = ? AND session_id = ?').run(id, sessionId).changes > 0
  }
  return db.prepare('DELETE FROM sources WHERE id = ? AND user_id IS NULL AND session_id IS NULL').run(id).changes > 0
}

export function getSourceById(id: string) {
  const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(id) as any
  return row ? { ...row, id: String(row.id) } : null
}

// Task 相关
export function createTask(userId: number | null, sessionId: string | null, title: string, scenarioType: string, sourceIds: string[], result: unknown) {
  const info = db.prepare('INSERT INTO tasks (user_id, session_id, title, scenario_type, source_ids, result) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, sessionId, title, scenarioType, JSON.stringify(sourceIds), JSON.stringify(result))
  return {
    id: String(info.lastInsertRowid),
    user_id: userId,
    session_id: sessionId,
    title,
    scenarioType,
    sourceIds,
    result,
    createdAt: new Date().toISOString()
  }
}

export function getTasksByUser(userId: number | null, sessionId?: string | null) {
  let rows: any[]
  if (userId) {
    rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC').all(userId)
  } else if (sessionId) {
    rows = db.prepare('SELECT * FROM tasks WHERE session_id = ? ORDER BY id DESC').all(sessionId)
  } else {
    rows = db.prepare('SELECT * FROM tasks WHERE user_id IS NULL AND session_id IS NULL ORDER BY id DESC').all()
  }
  return rows.map((r: any) => ({
    id: String(r.id),
    user_id: r.user_id,
    session_id: r.session_id,
    title: r.title,
    scenarioType: r.scenario_type,
    sourceIds: JSON.parse(r.source_ids || '[]'),
    result: JSON.parse(r.result || 'null'),
    createdAt: new Date(r.created_at).toISOString()
  }))
}

export function getTaskById(userId: number | null, sessionId: string | null, id: string) {
  let row: any
  if (userId) {
    row = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId)
  } else if (sessionId) {
    row = db.prepare('SELECT * FROM tasks WHERE id = ? AND session_id = ?').get(id, sessionId)
  } else {
    row = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id IS NULL AND session_id IS NULL').get(id)
  }
  if (!row) return null
  return {
    id: String(row.id),
    user_id: row.user_id,
    session_id: row.session_id,
    title: row.title,
    scenarioType: row.scenario_type,
    sourceIds: JSON.parse(row.source_ids || '[]'),
    result: JSON.parse(row.result || 'null'),
    createdAt: new Date(row.created_at).toISOString()
  }
}

export function deleteTask(userId: number | null, sessionId: string | null, id: string) {
  if (userId) {
    return db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId).changes > 0
  } else if (sessionId) {
    return db.prepare('DELETE FROM tasks WHERE id = ? AND session_id = ?').run(id, sessionId).changes > 0
  }
  return db.prepare('DELETE FROM tasks WHERE id = ? AND user_id IS NULL AND session_id IS NULL').run(id).changes > 0
}

// 检查清单状态相关
export function updateTaskChecklistState(taskId: string, checklistState: string[]) {
  return db.prepare('UPDATE tasks SET checklist_state = ? WHERE id = ?').run(JSON.stringify(checklistState), taskId).changes > 0
}

export function getTaskChecklistState(taskId: string): string[] {
  const row = db.prepare('SELECT checklist_state FROM tasks WHERE id = ?').get(taskId) as any
  if (!row) return []
  return JSON.parse(row.checklist_state || '[]')
}

// Share 相关
export function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function createShare(taskId: string, expiresInDays?: number) {
  const token = generateShareToken()
  let expiresAt: string | null = null
  
  if (expiresInDays) {
    const date = new Date()
    date.setDate(date.getDate() + expiresInDays)
    expiresAt = date.toISOString()
  }

  const info = db.prepare('INSERT INTO shares (task_id, share_token, expires_at) VALUES (?, ?, ?)')
    .run(taskId, token, expiresAt)
  
  return {
    id: String(info.lastInsertRowid),
    taskId,
    token,
    expiresAt,
    createdAt: new Date().toISOString()
  }
}

export function getShareByToken(token: string) {
  const row = db.prepare('SELECT * FROM shares WHERE share_token = ?').get(token) as any
  if (!row) return null
  
  // 检查是否过期
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    // 删除过期的分享
    db.prepare('DELETE FROM shares WHERE share_token = ?').run(token)
    return null
  }
  
  // 增加浏览次数
  db.prepare('UPDATE shares SET view_count = view_count + 1 WHERE share_token = ?').run(token)
  
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    token: row.share_token,
    expiresAt: row.expires_at,
    viewCount: row.view_count,
    createdAt: new Date(row.created_at).toISOString()
  }
}

export function deleteShare(taskId: string, token?: string) {
  if (token) {
    return db.prepare('DELETE FROM shares WHERE task_id = ? AND share_token = ?').run(taskId, token).changes > 0
  }
  return db.prepare('DELETE FROM shares WHERE task_id = ?').run(taskId).changes > 0
}

export function getSharesByTask(taskId: string) {
  const rows = db.prepare('SELECT * FROM shares WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as any[]
  return rows.map((r: any) => ({
    id: String(r.id),
    taskId: String(r.task_id),
    token: r.share_token,
    expiresAt: r.expires_at,
    viewCount: r.view_count,
    createdAt: new Date(r.created_at).toISOString()
  }))
}

// Analysis Log 相关（可观测性 & 记忆系统
export function createAnalysisLog(data: {
  taskId?: string | null
  userId: number | null
  sessionId: string | null
  scenarioType: string
  sourceCount: number
  riskCount: number
  durationMs: number
  model?: string | null
  isMock: boolean
  status: 'success' | 'failed'
  errorMessage?: string | null
  reasoningTrace?: unknown | null
  rawOutput?: string | null
  tokenPrompt?: number
  tokenCompletion?: number
}) {
  const info = db.prepare(`
    INSERT INTO analysis_logs
    (task_id, user_id, session_id, scenario_type, source_count, risk_count,
     duration_ms, model, is_mock, status, error_message, reasoning_trace,
     raw_output, token_prompt, token_completion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.taskId ? Number(data.taskId) : null,
    data.userId,
    data.sessionId,
    data.scenarioType,
    data.sourceCount,
    data.riskCount,
    data.durationMs,
    data.model || null,
    data.isMock ? 1 : 0,
    data.status,
    data.errorMessage || null,
    data.reasoningTrace ? JSON.stringify(data.reasoningTrace) : null,
    data.rawOutput || null,
    data.tokenPrompt || 0,
    data.tokenCompletion || 0
  )
  return { id: String(info.lastInsertRowid) }
}

export function getAnalysisLogsByUser(
  userId: number | null,
  sessionId?: string | null,
  limit: number = 50
) {
  let rows: any[]
  if (userId) {
    rows = db.prepare('SELECT * FROM analysis_logs WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit)
  } else if (sessionId) {
    rows = db.prepare('SELECT * FROM analysis_logs WHERE session_id = ? ORDER BY id DESC LIMIT ?').all(sessionId, limit)
  } else {
    return []
  }
  return rows.map((r: any) => ({
    id: String(r.id),
    taskId: r.task_id ? String(r.task_id) : null,
    userId: r.user_id,
    sessionId: r.session_id,
    scenarioType: r.scenario_type,
    sourceCount: r.source_count,
    riskCount: r.risk_count,
    durationMs: r.duration_ms,
    model: r.model,
    isMock: r.is_mock === 1,
    status: r.status,
    errorMessage: r.error_message,
    reasoningTrace: r.reasoning_trace ? JSON.parse(r.reasoning_trace) : null,
    tokenPrompt: r.token_prompt,
    tokenCompletion: r.token_completion,
    createdAt: new Date(r.created_at).toISOString()
  }))
}

export function getAnalysisStats(userId: number | null, sessionId?: string | null) {
  let whereClause = ''
  let params: any[] = []
  if (userId) {
    whereClause = 'WHERE user_id = ?'
    params = [userId]
  } else if (sessionId) {
    whereClause = 'WHERE session_id = ?'
    params = [sessionId]
  } else {
    whereClause = 'WHERE 1 = 0'
  }

  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCount,
      AVG(duration_ms) as avgDuration,
      AVG(token_prompt) as avgTokenPrompt,
      AVG(token_completion) as avgTokenCompletion,
      AVG(token_prompt + token_completion) as avgTokenTotal
    FROM analysis_logs
    ${whereClause}
  `).get(...params) as any

  const recent = db.prepare(`
    SELECT scenario_type, status, duration_ms, model, is_mock, created_at
    FROM analysis_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 10
  `).all(...params) as any[]

  return {
    total: summary.total || 0,
    successRate: summary.total > 0 ? Math.round((summary.successCount / summary.total) * 1000) / 10 : 0,
    avgDurationMs: Math.round(summary.avgDuration || 0),
    avgTokens: {
      prompt: Math.round(summary.avgTokenPrompt || 0),
      completion: Math.round(summary.avgTokenCompletion || 0),
      total: Math.round(summary.avgTokenTotal || 0)
    },
    recent: recent.map(r => ({
      scenarioType: r.scenario_type,
      status: r.status,
      durationMs: r.duration_ms,
      model: r.model,
      isMock: r.is_mock === 1,
      createdAt: r.created_at
    }))
  }
}

// User Preferences 相关（记忆系统 - 用户偏好）
export function getUserPreference(
  userId: number | null,
  sessionId: string | null,
  key: string
): string | null {
  let row: any
  if (userId) {
    row = db.prepare('SELECT * FROM user_preferences WHERE user_id = ? AND pref_key = ?').get(userId, key)
  } else if (sessionId) {
    row = db.prepare('SELECT * FROM user_preferences WHERE session_id = ? AND pref_key = ?').get(sessionId, key)
  } else {
    return null
  }
  return row ? row.pref_value : null
}

export function setUserPreference(
  userId: number | null,
  sessionId: string | null,
  key: string,
  value: string
) {
  const existing = userId
    ? db.prepare('SELECT id FROM user_preferences WHERE user_id = ? AND pref_key = ?').get(userId, key)
    : sessionId
    ? db.prepare('SELECT id FROM user_preferences WHERE session_id = ? AND pref_key = ?').get(sessionId, key)
    : null

  if (existing) {
    if (userId) {
      db.prepare('UPDATE user_preferences SET pref_value = ?, updated_at = datetime(\'now\') WHERE user_id = ? AND pref_key = ?')
        .run(value, userId, key)
    } else if (sessionId) {
      db.prepare('UPDATE user_preferences SET pref_value = ?, updated_at = datetime(\'now\') WHERE session_id = ? AND pref_key = ?')
        .run(value, sessionId, key)
    }
  } else {
    db.prepare('INSERT INTO user_preferences (user_id, session_id, pref_key, pref_value) VALUES (?, ?, ?, ?)')
      .run(userId, sessionId, key, value)
  }
  return true
}

// Scenario Knowledge 相关（记忆系统 - 公共场景知识积累）
export function accumulateScenarioKnowledge(
  scenarioType: string,
  risks: Array<{ type: string; dimension?: string; confidence?: number }>
) {
  const stmt = db.prepare(`
    INSERT INTO scenario_knowledge (scenario_type, dimension, risk_type, frequency, avg_confidence, last_seen)
    VALUES (?, ?, ?, 1, ?, datetime('now'))
    ON CONFLICT(scenario_type, dimension, risk_type) DO UPDATE SET
      frequency = frequency + 1,
      avg_confidence = (avg_confidence * (frequency - 1) + excluded.avg_confidence) / frequency,
      last_seen = datetime('now')
  `)

  for (const risk of risks) {
    const dimension = risk.dimension || 'default'
    const confidence = risk.confidence !== undefined ? risk.confidence : 0.8
    stmt.run(scenarioType, dimension, risk.type, confidence)
  }
}

export function getScenarioKnowledge(scenarioType: string, limit: number = 10) {
  const rows = db.prepare(`
    SELECT dimension, risk_type, frequency, avg_confidence
    FROM scenario_knowledge
    WHERE scenario_type = ?
    ORDER BY frequency DESC
    LIMIT ?
  `).all(scenarioType, limit) as Array<{
    dimension: string
    risk_type: string
    frequency: number
    avg_confidence: number
  }>

  return rows.map(r => ({
    dimension: r.dimension,
    riskType: r.risk_type,
    frequency: r.frequency,
    avgConfidence: r.avg_confidence
  }))
}

export function getTopRiskTypesByScenario(scenarioType: string, limit: number = 5): string[] {
  const rows = db.prepare(`
    SELECT risk_type, SUM(frequency) as total_freq
    FROM scenario_knowledge
    WHERE scenario_type = ?
    GROUP BY risk_type
    ORDER BY total_freq DESC
    LIMIT ?
  `).all(scenarioType, limit) as Array<{ risk_type: string; total_freq: number }>

  return rows.map(r => r.risk_type)
}

export default db
