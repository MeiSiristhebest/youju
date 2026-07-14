import { Pool } from '@neondatabase/serverless';
import { POSTGRES_ADD_COLUMNS, POSTGRES_INDEXES, POSTGRES_RLS_POLICIES } from '../src/data/schema/postgresSchema.ts';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const client = await pool.connect();

try {
  await client.query('CREATE EXTENSION IF NOT EXISTS vector');
  console.log('vector extension OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      openid TEXT UNIQUE,
      nickname TEXT,
      avatar TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('users OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      session_id TEXT,
      title TEXT NOT NULL,
      scenario_type TEXT DEFAULT 'custom',
      source_ids TEXT DEFAULT '[]',
      result TEXT,
      checklist_state TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('tasks OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS sources (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      session_id TEXT,
      task_id INTEGER,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      meta TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
  `);
  console.log('sources OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS shares (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL,
      share_token TEXT UNIQUE NOT NULL,
      expires_at TEXT,
      view_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);
  console.log('shares OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS analysis_logs (
      id SERIAL PRIMARY KEY,
      log_group_id TEXT,
      version INTEGER DEFAULT 1,
      event_type TEXT DEFAULT 'created',
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
      checkpoint_data TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('analysis_logs OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS task_results (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL,
      result TEXT,
      analysis_log_id INTEGER,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (analysis_log_id) REFERENCES analysis_logs(id) ON DELETE SET NULL
    )
  `);
  console.log('task_results OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS analysis_steps (
      id SERIAL PRIMARY KEY,
      analysis_log_id INTEGER NOT NULL,
      step_id TEXT NOT NULL,
      step_name TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      status TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      model TEXT,
      input_snapshot TEXT,
      output_snapshot TEXT,
      raw_input TEXT,
      raw_output TEXT,
      token_prompt INTEGER DEFAULT 0,
      token_completion INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (analysis_log_id) REFERENCES analysis_logs(id) ON DELETE CASCADE
    )
  `);
  console.log('analysis_steps OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      session_id TEXT,
      pref_key TEXT NOT NULL,
      pref_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('user_preferences OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS scenario_knowledge (
      id SERIAL PRIMARY KEY,
      scenario_type TEXT NOT NULL,
      dimension TEXT NOT NULL,
      risk_type TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      avg_confidence REAL DEFAULT 0,
      last_seen TIMESTAMP DEFAULT NOW(),
      UNIQUE(scenario_type, dimension, risk_type)
    )
  `);
  console.log('scenario_knowledge OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS user_model_configs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      session_id TEXT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'openai-compatible',
      api_key TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      model_mappings TEXT DEFAULT '[]',
      is_default INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('user_model_configs OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS source_chunks (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      parent_chunk_id TEXT,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      char_offset_start INTEGER,
      char_offset_end INTEGER,
      heading_path TEXT,
      token_count INTEGER,
      embedding vector(1024),
      embed_status TEXT DEFAULT 'pending',
      tsv tsvector,
      user_id TEXT,
      session_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('source_chunks OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      task_id TEXT,
      title TEXT DEFAULT '新对话',
      scenario_type TEXT,
      source_ids TEXT,
      context_source_ids TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('conversations OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
      content TEXT NOT NULL,
      tool_calls TEXT,
      citations TEXT,
      parent_message_id TEXT,
      is_archived INTEGER DEFAULT 0,
      is_partial INTEGER DEFAULT 0,
      feedback TEXT,
      langfuse_trace_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);
  console.log('messages OK');

  await client.query(`
    CREATE TABLE IF NOT EXISTS chat_memories (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      content TEXT NOT NULL,
      embedding vector(1024),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('chat_memories OK');

  for (const col of POSTGRES_ADD_COLUMNS) {
    try {
      await client.query(`ALTER TABLE ${col.table} ADD COLUMN IF NOT EXISTS ${col.column} ${col.definition}`);
    } catch {
      // 已存在则跳过
    }
  }
  console.log('add columns OK');

  for (const idx of POSTGRES_INDEXES) {
    try {
      if (idx.definition) {
        await client.query(idx.definition);
      } else {
        await client.query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column})`);
      }
    } catch (e: any) {
      console.log('  index skip:', idx.name, e.message);
    }
  }
  console.log('indexes OK');

  try {
    await client.query(POSTGRES_RLS_POLICIES);
  } catch (e: any) {
    console.log('RLS skip:', e.message);
  }
  console.log('RLS OK');

  console.log('\n✅ Database schema initialized successfully!');
} catch (e: any) {
  console.error('Error:', e.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
