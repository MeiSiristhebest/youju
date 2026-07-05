import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDriver } from './helpers/testSetup.js'

let driver: ReturnType<typeof createTestDriver>

beforeAll(() => {
  driver = createTestDriver()
})

afterAll(async () => {
  await driver.close()
})

function getTableNames(): string[] {
  const rows = driver
    .getRawWriter()
    .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
    .all() as { name: string }[]
  return rows.map((r) => r.name)
}

function getColumns(table: string): { name: string; type: string }[] {
  return driver.getRawWriter().prepare(`PRAGMA table_info(${table})`).all() as {
    name: string
    type: string
  }[]
}

function getIndexNames(): string[] {
  const rows = driver
    .getRawWriter()
    .prepare(`SELECT name FROM sqlite_master WHERE type='index'`)
    .all() as { name: string }[]
  return rows.map((r) => r.name)
}

describe('Migration: RAG 新表创建（SQLite 驱动）', () => {
  describe('source_chunks 表', () => {
    it('表创建成功', () => {
      expect(getTableNames()).toContain('source_chunks')
    })

    it('包含所有字段', () => {
      const colNames = getColumns('source_chunks').map((c) => c.name)
      const expected = [
        'id',
        'source_id',
        'parent_chunk_id',
        'chunk_index',
        'content',
        'char_offset_start',
        'char_offset_end',
        'heading_path',
        'token_count',
        'embedding',
        'embed_status',
        'user_id',
        'session_id',
        'created_at',
      ]

      for (const col of expected) {
        expect(colNames).toContain(col)
      }
    })

    it('SQLite 降级：不包含 tsv 字段', () => {
      const colNames = getColumns('source_chunks').map((c) => c.name)
      expect(colNames).not.toContain('tsv')
    })

    it('SQLite 降级：embedding 字段类型为 TEXT', () => {
      const embeddingCol = getColumns('source_chunks').find((c) => c.name === 'embedding')
      expect(embeddingCol).toBeDefined()
      expect(embeddingCol?.type).toBe('TEXT')
    })
  })

  describe('conversations 表', () => {
    it('表创建成功', () => {
      expect(getTableNames()).toContain('conversations')
    })

    it('包含所有字段', () => {
      const colNames = getColumns('conversations').map((c) => c.name)
      const expected = [
        'id',
        'user_id',
        'session_id',
        'title',
        'scenario_type',
        'source_ids',
        'context_source_ids',
        'deleted_at',
        'created_at',
        'updated_at',
      ]

      for (const col of expected) {
        expect(colNames).toContain(col)
      }
    })
  })

  describe('messages 表', () => {
    it('表创建成功', () => {
      expect(getTableNames()).toContain('messages')
    })

    it('包含所有字段', () => {
      const colNames = getColumns('messages').map((c) => c.name)
      const expected = [
        'id',
        'conversation_id',
        'role',
        'content',
        'tool_calls',
        'citations',
        'parent_message_id',
        'is_archived',
        'is_partial',
        'feedback',
        'langfuse_trace_id',
        'created_at',
      ]

      for (const col of expected) {
        expect(colNames).toContain(col)
      }
    })

    it('role 字段有 CHECK 约束', () => {
      const row = driver
        .getRawWriter()
        .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='messages'`)
        .get() as { sql: string } | undefined
      expect(row?.sql).toContain("CHECK (role IN ('user','assistant','system'))")
    })
  })

  describe('索引创建', () => {
    it('source_chunks 索引创建成功', () => {
      const indexNames = getIndexNames()
      expect(indexNames).toContain('idx_source_chunks_source')
      expect(indexNames).toContain('idx_source_chunks_user')
      expect(indexNames).toContain('idx_source_chunks_session')
    })

    it('conversations 索引创建成功', () => {
      const indexNames = getIndexNames()
      expect(indexNames).toContain('idx_conversations_user')
      expect(indexNames).toContain('idx_conversations_session')
      expect(indexNames).toContain('idx_conversations_updated')
    })

    it('messages 索引创建成功', () => {
      const indexNames = getIndexNames()
      expect(indexNames).toContain('idx_messages_conversation')
    })
  })
})
