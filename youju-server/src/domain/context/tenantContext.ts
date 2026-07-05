export interface TenantContext {
  userId: number | null
  sessionId: string | null
  tenantId: string | null
  isAuthenticated: boolean
}

export function createTenantContext(
  userId: number | null,
  sessionId: string | null,
  tenantId: string | null = null,
): TenantContext {
  return {
    userId,
    sessionId,
    tenantId: tenantId || (userId ? `user:${userId}` : sessionId ? `session:${sessionId}` : null),
    isAuthenticated: userId !== null,
  }
}

export function getContextIdentifier(ctx: TenantContext): string | null {
  return ctx.tenantId
}

export function buildDataScopeWhere(
  ctx: TenantContext,
  userIdColumn: string = 'user_id',
  sessionIdColumn: string = 'session_id',
): { clause: string; params: unknown[] } {
  if (ctx.userId !== null) {
    return {
      clause: `${userIdColumn} = ?`,
      params: [ctx.userId],
    }
  }
  if (ctx.sessionId !== null) {
    return {
      clause: `${sessionIdColumn} = ? AND ${userIdColumn} IS NULL`,
      params: [ctx.sessionId],
    }
  }
  return {
    clause: '1 = 0',
    params: [],
  }
}

/**
 * 与 buildDataScopeWhere 相同，但将 userId 转换为字符串。
 * 用于 user_id 列为 TEXT 类型的表（source_chunks / conversations / messages）。
 */
export function buildTextScopeWhere(
  ctx: TenantContext,
  userIdColumn: string = 'user_id',
  sessionIdColumn: string = 'session_id',
): { clause: string; params: unknown[] } {
  if (ctx.userId !== null) {
    return {
      clause: `${userIdColumn} = ?`,
      params: [String(ctx.userId)],
    }
  }
  if (ctx.sessionId !== null) {
    return {
      clause: `${sessionIdColumn} = ? AND ${userIdColumn} IS NULL`,
      params: [ctx.sessionId],
    }
  }
  return {
    clause: '1 = 0',
    params: [],
  }
}

const TENANT_TABLES = [
  'users',
  'sources',
  'tasks',
  'shares',
  'analysis_logs',
  'analysis_steps',
  'preferences',
  'user_preferences',
  'user_model_configs',
]

export function validateTenantAccess(
  ctx: TenantContext,
  tableName: string,
  recordUserId: number | null,
  recordSessionId: string | null,
): boolean {
  if (!TENANT_TABLES.includes(tableName)) {
    return true
  }

  if (ctx.userId !== null) {
    return recordUserId === ctx.userId
  }

  if (ctx.sessionId !== null) {
    return recordSessionId === ctx.sessionId && recordUserId === null
  }

  return false
}

export interface TenantScopedRepository<T> {
  list(ctx: TenantContext, options?: Record<string, unknown>): T[]
  getById(ctx: TenantContext, id: string): T | null
  create(ctx: TenantContext, data: Partial<T>): T
  update(ctx: TenantContext, id: string, data: Partial<T>): T | null
  delete(ctx: TenantContext, id: string): boolean
}
