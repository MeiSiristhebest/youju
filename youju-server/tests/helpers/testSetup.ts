import Database from 'better-sqlite3'
import { createApp } from '../../src/app.js'
import type { DatabaseDriver, TransactionDriver } from '../../src/data/DatabaseDriver.js'
import { NeonDriver } from '../../src/data/drivers/NeonDriver.js'
import {
  POSTGRES_ADD_COLUMNS,
  POSTGRES_INDEXES,
  POSTGRES_RLS_POLICIES,
  POSTGRES_SCHEMA_SQL,
} from '../../src/data/schema/postgresSchema.js'
import {
  SQLITE_ADD_COLUMNS,
  SQLITE_INDEXES,
  SQLITE_SCHEMA_SQL,
} from '../../src/data/schema/sqliteSchema.js'

const TEST_DB_DRIVER = (process.env.TEST_DB_DRIVER || 'sqlite') as 'sqlite' | 'neon'

function createSqliteTestDriver(): DatabaseDriver & {
  getRawWriter: () => Database.Database
  getRawReader: () => Database.Database
  backup: (dest: string, options?: any) => Promise<any>
} {
  const db = new Database(':memory:')
  db.pragma('journal_mode = MEMORY')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  db.pragma('busy_timeout = 5000')

  db.exec(SQLITE_SCHEMA_SQL)

  const addColumnIfNotExists = (table: string, column: string, definition: string) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[]
    if (!cols.find((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    }
  }

  for (const col of SQLITE_ADD_COLUMNS) {
    addColumnIfNotExists(col.table, col.column, col.definition)
  }

  const createIndexIfNotExists = (indexName: string, table: string, column: string) => {
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column})`)
    } catch (_e) {
      // ignore
    }
  }

  for (const idx of SQLITE_INDEXES) {
    if (idx.definition) {
      try {
        db.exec(idx.definition)
      } catch (_e) {
        // ignore
      }
    } else {
      createIndexIfNotExists(idx.name, idx.table!, idx.column!)
    }
  }

  // 创建事务驱动实现
  function createTransactionDriver(txDb: Database.Database): TransactionDriver {
    return {
      all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        return Promise.resolve(txDb.prepare(sql).all(...params) as T[])
      },
      get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
        return Promise.resolve(txDb.prepare(sql).get(...params) as T | undefined)
      },
      run(
        sql: string,
        params: any[] = [],
      ): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
        const info = txDb.prepare(sql).run(...params)
        return Promise.resolve({ changes: info.changes, lastInsertRowid: info.lastInsertRowid })
      },
      exec(sql: string): Promise<void> {
        txDb.exec(sql)
        return Promise.resolve()
      },
    }
  }

  const driver = {
    all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      return Promise.resolve(db.prepare(sql).all(...params) as T[])
    },
    get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      return Promise.resolve(db.prepare(sql).get(...params) as T | undefined)
    },
    run(
      sql: string,
      params: any[] = [],
    ): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
      const info = db.prepare(sql).run(...params)
      return Promise.resolve({ changes: info.changes, lastInsertRowid: info.lastInsertRowid })
    },
    exec(sql: string): Promise<void> {
      db.exec(sql)
      return Promise.resolve()
    },
    transaction<T>(fn: (tx: TransactionDriver) => Promise<T>): Promise<T> {
      // 手动管理事务：BEGIN / COMMIT / ROLLBACK
      return new Promise((resolve, reject) => {
        db.exec('BEGIN')
        const txDriver = createTransactionDriver(db)
        fn(txDriver)
          .then((result) => {
            db.exec('COMMIT')
            resolve(result)
          })
          .catch((error) => {
            db.exec('ROLLBACK')
            reject(error)
          })
      })
    },
    close(): Promise<void> {
      try {
        db.close()
      } catch {
        // ignore
      }
      return Promise.resolve()
    },
    getRawWriter() {
      return db
    },
    getRawReader() {
      return db
    },
    backup(destination: string, options?: any) {
      return db.backup(destination, options)
    },
  }

  return driver as any
}

async function createNeonTestDriver(): Promise<DatabaseDriver> {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL environment variable is required for Neon tests')
  }

  const driver = new NeonDriver(process.env.TEST_DATABASE_URL)

  await driver.exec(POSTGRES_SCHEMA_SQL)

  for (const col of POSTGRES_ADD_COLUMNS) {
    try {
      await driver.exec(
        `ALTER TABLE ${col.table} ADD COLUMN IF NOT EXISTS ${col.column} ${col.definition}`,
      )
    } catch (_e) {
      // ignore
    }
  }

  for (const idx of POSTGRES_INDEXES) {
    try {
      if (idx.definition) {
        await driver.exec(idx.definition)
      } else {
        await driver.exec(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column})`)
      }
    } catch (_e) {
      // ignore
    }
  }

  // 启用 RLS 策略
  try {
    await driver.exec(POSTGRES_RLS_POLICIES)
  } catch (e) {
    console.warn('RLS policies setup failed:', e)
  }

  return driver
}

export function createTestDriver(): DatabaseDriver & {
  getRawWriter: () => Database.Database
  getRawReader: () => Database.Database
  backup: (dest: string, options?: any) => Promise<any>
} {
  if (TEST_DB_DRIVER === 'neon') {
    throw new Error('Neon test driver is async, use createTestDriverAsync instead')
  }
  return createSqliteTestDriver()
}

export async function createTestDriverAsync(): Promise<DatabaseDriver> {
  if (TEST_DB_DRIVER === 'neon') {
    return createNeonTestDriver()
  }
  return createSqliteTestDriver()
}

export async function clearDatabase(driver: DatabaseDriver) {
  const tables = [
    'analysis_steps',
    'task_results',
    'analysis_logs',
    'shares',
    'tasks',
    'sources',
    'user_preferences',
    'users',
    'scenario_knowledge',
  ]
  for (const table of tables) {
    await driver.run(`DELETE FROM ${table}`)
  }
}

export async function clearDatabaseAsync(driver: DatabaseDriver) {
  const tables = [
    'analysis_steps',
    'task_results',
    'analysis_logs',
    'shares',
    'tasks',
    'sources',
    'user_preferences',
    'users',
    'scenario_knowledge',
  ]
  for (const table of tables) {
    await driver.run(`DELETE FROM ${table}`)
  }
}

export function createTestApp() {
  const driver = createTestDriver()
  const { app, dependencies } = createApp(driver)
  return { app, driver, ...dependencies }
}

export async function createTestAppAsync() {
  const driver = await createTestDriverAsync()
  const { app, dependencies } = createApp(driver)
  return { app, driver, ...dependencies }
}

export type TestApp = ReturnType<typeof createTestApp>
