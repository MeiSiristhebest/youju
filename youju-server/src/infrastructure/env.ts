import { z } from 'zod'

const DEV_JWT_SECRET = 'youju-dev-secret-key-change-in-production-please'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-5.5'),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  AI_PROVIDER: z
    .enum([
      'openai',
      'anthropic',
      'deepseek',
      'zhipu',
      'moonshot',
      'qwen',
      'volcengine',
      'qianfan',
      'yi',
      'spark',
      'openrouter',
      'custom',
    ])
    .default('openai'),

  // AI 调用超时（毫秒）
  AI_CALL_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  AI_LIST_MODELS_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AI_TEST_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  // Prompt 缓存开关
  AI_PROMPT_CACHE_ENABLED: z.enum(['true', 'false']).default('true'),

  JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_ALG: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
  JWT_ISSUER: z.string().default('youju'),

  AI_MAX_CONCURRENCY: z.coerce.number().int().positive().default(3),

  ANALYSIS_CACHE_TTL_MS: z.coerce.number().int().positive().default(86_400_000),
  ANALYSIS_CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(50),

  // Prompt 缓存容量
  PROMPT_CACHE_ANALYSIS_MAX: z.coerce.number().int().positive().default(50),
  PROMPT_CACHE_DRAFT_MAX: z.coerce.number().int().positive().default(100),
  PROMPT_CACHE_EMBEDDING_MAX: z.coerce.number().int().positive().default(200),

  // Prompt 缓存 TTL（毫秒）
  PROMPT_CACHE_ANALYSIS_TTL_MS: z.coerce.number().int().positive().default(21_600_000), // 6h
  PROMPT_CACHE_DRAFT_TTL_MS: z.coerce.number().int().positive().default(43_200_000), // 12h
  PROMPT_CACHE_EMBEDDING_TTL_MS: z.coerce.number().int().positive().default(86_400_000), // 24h
  PROMPT_CACHE_STATS_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000), // 30min

  ENABLE_SCENARIO_PREHEAT: z.enum(['true', 'false']).default('true'),
  ENABLE_BACKGROUND_JOBS: z.enum(['true', 'false']).default('true'),
  RUN_JOBS_ON_START: z.enum(['true', 'false']).default('false'),

  BACKUP_ON_START: z.enum(['true', 'false']).default('false'),

  DATABASE_URL: z.string().optional(),
  DATABASE_PATH: z.string().default('youju.db'),

  RATE_LIMIT_STORE: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().url().optional(),

  // 速率限制
  RATE_LIMIT_GENERAL_PER_MIN: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_AUTH_PER_15MIN: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_ANALYZE_PER_MIN: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_URLFETCH_PER_MIN: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_CHAT_PER_MIN: z.coerce.number().int().positive().default(30),

  // 速率限制时间窗口（毫秒）
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000), // 通用 1min 窗口
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(900_000), // auth 15min 窗口

  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_BASE_URL: z.string().url().default('https://api.siliconflow.cn/v1'),
  EMBEDDING_MODEL: z.string().default('bge-m3'),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().positive().default(64),
  EMBEDDING_RETRIES: z.coerce.number().int().positive().default(3),
  EMBEDDING_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(1000),

  RERANKER_API_KEY: z.string().optional(),
  RERANKER_BASE_URL: z.string().url().default('https://api.siliconflow.cn/v1'),
  RERANKER_MODEL: z.string().default('bge-reranker-v2-m3'),
  RERANKER_MAX_RETRIES: z.coerce.number().int().positive().default(2),

  VECTOR_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
  CHAT_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  CHAT_RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(20),
  CHAT_MAX_STEPS: z.coerce.number().int().positive().default(6),
  CHAT_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),

  LANGFUSE_SECRET: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().url().default('https://cloud.langfuse.com'),

  DB_DRIVER: z.enum(['sqlite', 'neon']).default('sqlite'),

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
  const data = result.data
  // 生产环境强制要求显式设置 JWT_SECRET，禁止使用默认开发密钥
  if (data.NODE_ENV === 'production' && data.JWT_SECRET === DEV_JWT_SECRET) {
    throw new Error('[env] 生产环境必须显式设置 JWT_SECRET，禁止使用默认开发密钥')
  }
  return data
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

export function isMockMode(overrideKey?: string, isDemo?: boolean): boolean {
  if (isDemo) return true
  const apiKey = overrideKey ?? env.AI_API_KEY
  return !apiKey || apiKey === 'mock' || apiKey === 'test'
}

export function getEnv() {
  return env
}

export type Env = z.infer<typeof envSchema>
