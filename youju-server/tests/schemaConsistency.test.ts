import { describe, expect, it } from 'vitest'
import { POSTGRES_ADD_COLUMNS, POSTGRES_SCHEMA_SQL } from '../src/data/schema/postgresSchema.js'
import { SQLITE_ADD_COLUMNS, SQLITE_SCHEMA_SQL } from '../src/data/schema/sqliteSchema.js'

interface TableSchema {
  name: string
  columns: string[]
}

const POSTGRES_ONLY_COLUMNS: Record<string, string[]> = {
  source_chunks: ['tsv'],
}

const SQLITE_ONLY_COLUMNS: Record<string, string[]> = {}

function parseTables(sql: string): TableSchema[] {
  const tables: TableSchema[] = []
  const tableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/gi

  let match: RegExpExecArray | null
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1]
    const body = match[2]

    const columns: string[] = []
    const lines = body.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (
        !trimmed ||
        trimmed.startsWith('--') ||
        trimmed.startsWith('FOREIGN KEY') ||
        trimmed.startsWith('PRIMARY KEY') ||
        trimmed.startsWith('UNIQUE') ||
        trimmed.startsWith('CHECK')
      ) {
        continue
      }
      const colMatch = trimmed.match(/^(\w+)\s+/)
      if (colMatch) {
        columns.push(colMatch[1])
      }
    }

    tables.push({ name: tableName, columns })
  }

  return tables
}

function extractTableNames(tables: TableSchema[]): string[] {
  return tables.map((t) => t.name).sort()
}

function getTableByName(tables: TableSchema[], name: string): TableSchema | undefined {
  return tables.find((t) => t.name === name)
}

describe('PostgreSQL 与 SQLite Schema 一致性', () => {
  const postgresTables = parseTables(POSTGRES_SCHEMA_SQL)
  const sqliteTables = parseTables(SQLITE_SCHEMA_SQL)

  const postgresTableNames = extractTableNames(postgresTables)
  const sqliteTableNames = extractTableNames(sqliteTables)

  it('两套 schema 表名集合一致', () => {
    const onlyInPostgres = postgresTableNames.filter((n) => !sqliteTableNames.includes(n))
    const onlyInSqlite = sqliteTableNames.filter((n) => !postgresTableNames.includes(n))

    expect(onlyInPostgres, `仅在 Postgres 中存在的表: ${onlyInPostgres.join(', ')}`).toEqual([])
    expect(onlyInSqlite, `仅在 SQLite 中存在的表: ${onlyInSqlite.join(', ')}`).toEqual([])
  })

  it('ADD_COLUMNS 表名集合一致', () => {
    const pgAddTables = [...new Set(POSTGRES_ADD_COLUMNS.map((c) => c.table))].sort()
    const sqliteAddTables = [...new Set(SQLITE_ADD_COLUMNS.map((c) => c.table))].sort()

    const onlyInPg = pgAddTables.filter((t) => !sqliteAddTables.includes(t))
    const onlyInSqlite = sqliteAddTables.filter((t) => !pgAddTables.includes(t))

    expect(onlyInPg, `仅在 Postgres ADD_COLUMNS 中存在的表: ${onlyInPg.join(', ')}`).toEqual([])
    expect(onlyInSqlite, `仅在 SQLite ADD_COLUMNS 中存在的表: ${onlyInSqlite.join(', ')}`).toEqual(
      [],
    )
  })

  it('ADD_COLUMNS 列名一一对应', () => {
    const pgColMap = new Map<string, Set<string>>()
    const sqliteColMap = new Map<string, Set<string>>()

    for (const col of POSTGRES_ADD_COLUMNS) {
      if (!pgColMap.has(col.table)) pgColMap.set(col.table, new Set())
      pgColMap.get(col.table)!.add(col.column)
    }
    for (const col of SQLITE_ADD_COLUMNS) {
      if (!sqliteColMap.has(col.table)) sqliteColMap.set(col.table, new Set())
      sqliteColMap.get(col.table)!.add(col.column)
    }

    for (const table of pgColMap.keys()) {
      const pgCols = pgColMap.get(table)!
      const sqliteCols = sqliteColMap.get(table) || new Set()

      const onlyInPg = [...pgCols].filter((c) => !sqliteCols.has(c))
      const onlyInSqlite = [...sqliteCols].filter((c) => !pgCols.has(c))

      expect(
        onlyInPg,
        `表 ${table} 仅在 Postgres ADD_COLUMNS 中存在的列: ${onlyInPg.join(', ')}`,
      ).toEqual([])
      expect(
        onlyInSqlite,
        `表 ${table} 仅在 SQLite ADD_COLUMNS 中存在的列: ${onlyInSqlite.join(', ')}`,
      ).toEqual([])
    }
  })

  for (const tableName of postgresTableNames) {
    it(`表 ${tableName} 列名一致`, () => {
      const pgTable = getTableByName(postgresTables, tableName)
      const sqliteTable = getTableByName(sqliteTables, tableName)

      expect(pgTable, `Postgres 中缺少表 ${tableName}`).toBeDefined()
      expect(sqliteTable, `SQLite 中缺少表 ${tableName}`).toBeDefined()

      if (!pgTable || !sqliteTable) return

      const pgOnlyExceptions = POSTGRES_ONLY_COLUMNS[tableName] || []
      const sqliteOnlyExceptions = SQLITE_ONLY_COLUMNS[tableName] || []

      const pgCols = [...pgTable.columns].filter((c) => !pgOnlyExceptions.includes(c)).sort()
      const sqliteCols = [...sqliteTable.columns]
        .filter((c) => !sqliteOnlyExceptions.includes(c))
        .sort()

      const onlyInPg = pgCols.filter((c) => !sqliteCols.includes(c))
      const onlyInSqlite = sqliteCols.filter((c) => !pgCols.includes(c))

      expect(onlyInPg, `表 ${tableName} 仅在 Postgres 中存在的列: ${onlyInPg.join(', ')}`).toEqual(
        [],
      )
      expect(
        onlyInSqlite,
        `表 ${tableName} 仅在 SQLite 中存在的列: ${onlyInSqlite.join(', ')}`,
      ).toEqual([])
    })
  }
})
