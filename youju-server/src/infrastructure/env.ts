import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-3.5-turbo'),

  JWT_SECRET: z.string().min(16).default('youju-dev-secret-key-change-in-production-please'),

  AI_MAX_CONCURRENCY: z.coerce.number().int().positive().default(3),

  ANALYSIS_CACHE_TTL_MS: z.coerce.number().int().positive().default(86_400_000),
  ANALYSIS_CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(50),

  ENABLE_SCENARIO_PREHEAT: z.enum(['true', 'false']).default('true'),
  ENABLE_BACKGROUND_JOBS: z.enum(['true', 'false']).default('true'),
  RUN_JOBS_ON_START: z.enum(['true', 'false']).default('false'),

  BACKUP_ON_START: z.enum(['true', 'false']).default('false'),

  DATABASE_URL: z.string().optional(),
  DATABASE_PATH: z.string().default('youju.db'),

  RATE_LIMIT_STORE: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().url().optional(),

  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_BASE_URL: z.string().url().default('https://api.siliconflow.cn/v1'),
  EMBEDDING_MODEL: z.string().default('bge-m3'),

  RERANKER_API_KEY: z.string().optional(),
  RERANKER_BASE_URL: z.string().url().default('https://api.siliconflow.cn/v1'),
  RERANKER_MODEL: z.string().default('bge-reranker-v2-m3'),

  VECTOR_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
  CHAT_MAX_TOKENS: z.coerce.number().int().positive().default(4096),

  LANGFUSE_SECRET: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().url().default('https://cloud.langfuse.com'),

  DB_DRIVER: z.enum(['sqlite', 'postgres']).default('sqlite'),

  CRON_SECRET: z.string().optional(),

  URL_FETCH_ALLOWLIST: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    ),
  URL_FETCH_DENYLIST: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    ),
})

function parseEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
    console.error('[env] 环境变量验证失败:', JSON.stringify(issues, null, 2))
    throw new Error('环境变量验证失败，请检查 .env 配置')
  }
  return result.data
}

const env = parseEnv()

export function isDev(): boolean {
  return env.NODE_ENV === 'development'
}

export function isTest(): boolean {
  return env.NODE_ENV === 'test'
}

export function isProd(): boolean {
  return env.NODE_ENV === 'production'
}

export function getEnv() {
  return env
}

export type Env = z.infer<typeof envSchema>
