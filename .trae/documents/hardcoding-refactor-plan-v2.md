# 硬编码问题治理方案 V2

> 接续 V1 计划（已完成约 75%），清理剩余硬编码并建立前端配置中心。
> 用户决策：① 建立前端 config 模块；② 保留 fallback + 加同步注释。

## 一、现状分析

### 已完成（V1）
- 后端 `env.ts` 已成为有效单一配置源（zod schema + 生产校验）
- 后端模型注册表 `modelRegistry.ts` 已建立，前端通过 API 动态拉取
- 14+ 文件的 `process.env.X || 'default'` 绕过已修复
- JWT_SECRET 生产环境强制校验已实现

### 待解决（V2 范围）
| 类别 | 数量 | 说明 |
|---|---|---|
| 后端 process.env 绕过 | 11 处 / 8 文件 | errors.ts、draftAdapter.ts、chatAdapter.ts 等仍直接读 process.env |
| env.ts 缺字段 | 2 个 | `AI_PROVIDER`、`AI_PROMPT_CACHE_ENABLED` 被代码读取但未纳入 schema |
| promptCache TTL 全硬编码 | 4 处 | 容量已配置化，但 TTL（6h/12h/24h/30min）仍硬编码 |
| rateLimiter windowMs 硬编码 | 5 处 | limit 已配置化，但时间窗口（60s/15min）仍硬编码 |
| 重复默认值 | 2 处 | retrievalService 的 0.65、chatAdapter 的 4096 与 env.ts 重复 |
| 前端无配置中心 | 7 处 | apiClient/streamClient 各自维护超时/重试常量且数值不同 |
| 前端 fallback 双源 | 3 处 | 与后端 modelRegistry.ts 内容重复，缺同步标注 |
| 算法魔法数字 | 4 处 | RRF 融合参数、chat topK/maxSteps |

## 二、改造方案

### 阶段 1：后端 env.ts 补全字段

**文件**：`youju-server/src/infrastructure/env.ts`

在 `envSchema` 中新增以下字段（插入到对应分组）：

```ts
// AI 配置分组新增
AI_PROVIDER: z.enum(['openai','anthropic','deepseek','zhipu','moonshot','qwen','volcengine','qianfan','yi','spark','openrouter','custom']).default('openai'),
AI_PROMPT_CACHE_ENABLED: z.enum(['true','false']).default('true'),

// Prompt 缓存分组新增（紧邻现有 PROMPT_CACHE_*_MAX）
PROMPT_CACHE_ANALYSIS_TTL_MS: z.coerce.number().int().positive().default(21_600_000),  // 6h
PROMPT_CACHE_DRAFT_TTL_MS: z.coerce.number().int().positive().default(43_200_000),     // 12h
PROMPT_CACHE_EMBEDDING_TTL_MS: z.coerce.number().int().positive().default(86_400_000), // 24h
PROMPT_CACHE_STATS_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000),  // 30min

// 速率限制分组新增（紧邻现有 RATE_LIMIT_*_PER_MIN）
RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),       // 通用 1min 窗口
RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(900_000), // auth 15min 窗口

// RAG 检索分组新增（紧邻现有 CHAT_MAX_TOKENS）
CHAT_RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(20),
CHAT_MAX_STEPS: z.coerce.number().int().positive().default(6),
```

**不纳入 env.ts 的算法常量**（保留为模块内命名常量，因为调整它们需要理解算法含义，非运维参数）：
- `retrievalService.ts` 的 RRF 融合参数 `k=60`、`topK=20` → 抽取为模块顶部 `const RRF_K = 60` / `const RRF_TOP_K = 20`
- `promptCache.ts` 构造函数默认 TTL `1000*60*60*24` → 抽取为 `const DEFAULT_TTL_MS = 86_400_000`（仅用于构造函数兜底，实际实例均显式传 TTL）

### 阶段 2：清理后端 process.env 绕过（11 处 / 8 文件）

| # | 文件 | 行号 | 当前代码 | 改为 |
|---|---|---|---|---|
| 1 | `src/domain/errors.ts` | 132 | `process.env.NODE_ENV === 'production'` | `isProd()` |
| 2 | `src/ai/adapters/draftAdapter.ts` | 26 | `process.env.AI_API_KEY` | `getEnv().AI_API_KEY` |
| 3 | `src/ai/adapters/chatAdapter.ts` | 43 | `options.aiConfig?.apiKey \|\| process.env.AI_API_KEY` | `options.aiConfig?.apiKey \|\| getEnv().AI_API_KEY` |
| 4 | `src/ai/adapters/chatAdapter.ts` | 113 | `process.env.LANGFUSE_SECRET` | `getEnv().LANGFUSE_SECRET` |
| 5 | `src/ai/adapters/chatAdapter.ts` | 135 | `Number(process.env.CHAT_MAX_TOKENS) \|\| 4096` | `getEnv().CHAT_MAX_TOKENS`（env.ts 已有默认 4096） |
| 6 | `src/infrastructure/ai/llmProvider.ts` | 114 | `(process.env.AI_PROVIDER as ModelProvider) \|\| 'openai'` | `getEnv().AI_PROVIDER`（阶段 1 已新增字段） |
| 7 | `src/presentation/routes/cron.ts` | 17 | `process.env.CRON_SECRET` | `getEnv().CRON_SECRET` |
| 8 | `src/presentation/middleware/rateLimitStore.ts` | 144,145,156 | `process.env.REDIS_URL`、`process.env.NODE_ENV !== 'test'` | `getEnv().REDIS_URL`、`!isTest()` |
| 9 | `src/presentation/middleware/securityHeaders.ts` | 3 | `process.env.NODE_ENV !== 'production'` | `!isProd()` |
| 10 | `src/ai/promptCache.ts` | 16 | `process.env.AI_PROMPT_CACHE_ENABLED !== 'false'` | `getEnv().AI_PROMPT_CACHE_ENABLED === 'true'`（阶段 1 已新增字段） |
| 11 | `src/domain/services/retrievalService.ts` | 208 | `Number(process.env.VECTOR_SIMILARITY_THRESHOLD)` | `getEnv().VECTOR_SIMILARITY_THRESHOLD`（同时删除行 209 的 `\|\| 0.65` 重复默认值） |

### 阶段 3：promptCache + rateLimiter 配置化补全

**文件**：`youju-server/src/ai/promptCache.ts`

1. 删除 `export const CACHE_ENABLED = process.env.AI_PROMPT_CACHE_ENABLED !== 'false'`（行 16）
2. 新增 `const CACHE_ENABLED = getEnv().AI_PROMPT_CACHE_ENABLED === 'true'`（用阶段 1 新增字段）
3. 保留 `export { CACHE_ENABLED }`（如有外部引用）
4. 构造函数默认 TTL 改为命名常量：`const DEFAULT_TTL_MS = 86_400_000`
5. 三个缓存实例的 `ttlMs` 改用 env 值：
   - `analysisCache`: `ttlMs: _env.PROMPT_CACHE_ANALYSIS_TTL_MS`
   - `draftCache`: `ttlMs: _env.PROMPT_CACHE_DRAFT_TTL_MS`
   - `embeddingCache`: `ttlMs: _env.PROMPT_CACHE_EMBEDDING_TTL_MS`
6. `startCacheStatsLogger` 默认参数改用 env：`intervalMs: number = _env.PROMPT_CACHE_STATS_INTERVAL_MS`

**文件**：`youju-server/src/presentation/middleware/rateLimiter.ts`

5 个 limiter 的 `windowMs` 改用 env 值：
- `generalRateLimiter`: `windowMs: env.RATE_LIMIT_WINDOW_MS`
- `authRateLimiter`: `windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS`
- `analyzeRateLimiter`: `windowMs: env.RATE_LIMIT_WINDOW_MS`
- `urlFetchRateLimiter`: `windowMs: env.RATE_LIMIT_WINDOW_MS`
- `chatRateLimiter`: `windowMs: env.RATE_LIMIT_WINDOW_MS`

### 阶段 4：算法魔法数字抽取为命名常量

**文件**：`youju-server/src/domain/services/retrievalService.ts`

在模块顶部新增：
```ts
const RRF_K = 60       // RRF 融合参数，控制排名对得分的影响
const RRF_TOP_K = 20   // RRF 融合后返回的 topK 数量
```
将行 223-224 的 `k = 60`、`topK = 20` 改为引用常量。

**文件**：`youju-server/src/ai/adapters/chatAdapter.ts`

- 行 80 `topK: 20` → `topK: getEnv().CHAT_RETRIEVAL_TOP_K`（阶段 1 已新增字段）
- 行 133 `isStepCount(6)` → `isStepCount(getEnv().CHAT_MAX_STEPS)`（阶段 1 已新增字段）

### 阶段 5：新建前端配置中心

**新建文件**：`youju-app/src/config/runtime.ts`

```ts
/**
 * 前端运行时配置中心
 *
 * 集中管理所有 HTTP/流式请求的运行时常量。
 * 可通过 Vite 环境变量覆盖默认值。
 * 与后端 env.ts 对称，作为前端的单一配置源。
 */

const num = (key: string, fallback: number): number => {
  const val = import.meta.env[key]
  if (typeof val !== 'string' || val === '') return fallback
  const parsed = Number(val)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** 普通请求超时（毫秒） */
export const API_TIMEOUT = num('VITE_API_TIMEOUT', 30000)

/** 流式请求超时（毫秒）— SSE 长连接需要更长超时 */
export const STREAM_TIMEOUT = num('VITE_STREAM_TIMEOUT', 120000)

/** 请求失败重试次数 */
export const API_RETRIES = num('VITE_API_RETRIES', 2)

/** 重试延迟基数（毫秒），实际延迟 = RETRY_DELAY * 2^(attempt-1) */
export const API_RETRY_DELAY = num('VITE_API_RETRY_DELAY', 1000)

/** Token 提前刷新阈值（毫秒），距过期不足此值时触发刷新 */
export const TOKEN_REFRESH_THRESHOLD = num('VITE_TOKEN_REFRESH_THRESHOLD', 300000)

/** API 基础路径 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
```

### 阶段 6：前端 apiClient + streamClient 接入配置中心

**文件**：`youju-app/src/services/apiClient.ts`

1. 删除行 7-10 的本地常量定义（`DEFAULT_TIMEOUT`、`DEFAULT_RETRIES`、`RETRY_DELAY`、`REFRESH_THRESHOLD`）
2. 删除行 14 的 `API_BASE_URL` 本地定义
3. 从 `config/runtime` 导入：`API_TIMEOUT, API_RETRIES, API_RETRY_DELAY, TOKEN_REFRESH_THRESHOLD, API_BASE_URL`
4. 将引用处替换：
   - `retries = DEFAULT_RETRIES` → `retries = API_RETRIES`
   - `timeout = DEFAULT_TIMEOUT` → `timeout = API_TIMEOUT`
   - `RETRY_DELAY * 2 ** (attempt - 1)` → `API_RETRY_DELAY * 2 ** (attempt - 1)`
   - `expiration - Date.now() < REFRESH_THRESHOLD` → `expiration - Date.now() < TOKEN_REFRESH_THRESHOLD`

**文件**：`youju-app/src/services/streamClient.ts`

1. 删除行 5-7 的本地常量定义
2. 删除行 11 的 `API_BASE_URL` 本地定义
3. 从 `config/runtime` 导入：`STREAM_TIMEOUT, API_RETRIES, API_RETRY_DELAY, API_BASE_URL`
4. 将引用处替换：
   - `timeout = DEFAULT_TIMEOUT` → `timeout = STREAM_TIMEOUT`
   - `retries = DEFAULT_RETRIES` → `retries = API_RETRIES`
   - `RETRY_DELAY * 2 ** (attempt - 1)` → `API_RETRY_DELAY * 2 ** (attempt - 1)`

### 阶段 7：前端类型定义 + .env.example 更新

**文件**：`youju-app/src/vite-env.d.ts`

新增类型声明：
```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_CHAT?: boolean
  readonly VITE_LANGFUSE_HOST?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_STREAM_TIMEOUT?: string
  readonly VITE_API_RETRIES?: string
  readonly VITE_API_RETRY_DELAY?: string
  readonly VITE_TOKEN_REFRESH_THRESHOLD?: string
}
```

**文件**：`youju-app/.env.example`

在末尾新增：
```env
# ===== HTTP 运行时配置（可选，有默认值）=====
# 普通请求超时（毫秒，默认 30000）
# VITE_API_TIMEOUT=30000

# 流式请求超时（毫秒，默认 120000）
# VITE_STREAM_TIMEOUT=120000

# 请求重试次数（默认 2）
# VITE_API_RETRIES=2

# 重试延迟基数（毫秒，默认 1000，实际延迟 = 基数 * 2^(attempt-1)）
# VITE_API_RETRY_DELAY=1000

# Token 提前刷新阈值（毫秒，默认 300000 = 5分钟）
# VITE_TOKEN_REFRESH_THRESHOLD=300000
```

### 阶段 8：前端 fallback 常量加同步注释

**文件**：`youju-app/src/components/workspace/ModelSettingsContent.tsx`

在 `PROVIDER_PRESETS_FALLBACK` 定义前（行 29 前）新增注释：
```ts
/**
 * 厂商预设兜底数据
 *
 * ⚠️ 同步约定：此列表须与后端 `youju-server/src/domain/registry/modelRegistry.ts`
 *    的 PROVIDER_PRESETS 保持一致。新增厂商时需同步修改两处。
 *    正常运行时通过 /api/v1/models/presets 动态拉取，此常量仅在 API 不可用时降级使用。
 */
```

**文件**：`youju-app/src/components/workspace/preferenceTabs/AnalysisTab.tsx`

在 `FALLBACK_MODEL_OPTIONS` 定义前（行 8 前）新增注释：
```ts
/**
 * 分析模型选项兜底数据
 *
 * ⚠️ 同步约定：须与后端 `youju-server/src/domain/registry/modelRegistry.ts`
 *    的 ANALYSIS_MODEL_OPTIONS 前 3 个推荐项保持一致。
 *    正常运行时通过 /api/v1/models/options 动态拉取。
 */
```

**文件**：`youju-app/src/stores/useUIPreferenceStore.ts`

在 `defaultModel: 'gpt-5.5'` 处（行 176 附近）新增行内注释：
```ts
defaultModel: 'gpt-5.5', // ⚠️ 须与后端 env.ts 的 AI_MODEL 默认值保持同步
```

### 阶段 9：后端 .env.example 更新

**文件**：`youju-server/.env.example`

在对应分组新增：

```env
# AI 厂商（用于 LLM Provider 工厂选择，默认 openai）
AI_PROVIDER=openai

# Prompt 缓存开关（true/false）
AI_PROMPT_CACHE_ENABLED=true

# Prompt 缓存 TTL（毫秒）
PROMPT_CACHE_ANALYSIS_TTL_MS=21600000
PROMPT_CACHE_DRAFT_TTL_MS=43200000
PROMPT_CACHE_EMBEDDING_TTL_MS=86400000

# Prompt 缓存统计日志间隔（毫秒，默认 30min）
PROMPT_CACHE_STATS_INTERVAL_MS=1800000

# 速率限制时间窗口（毫秒）
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_AUTH_WINDOW_MS=900000

# 聊天检索增强参数
CHAT_RETRIEVAL_TOP_K=20
CHAT_MAX_STEPS=6
```

## 三、不纳入本次改造的硬编码（已评估为可接受）

| 项目 | 原因 |
|---|---|
| `llm.ts:249` `max_tokens: 50` | 测试连接用途，最小化成本，非运维参数 |
| `llm.ts:99,134` `temperature: 0.2/0.7` | AI 业务参数，调整需理解语义含义 |
| `securityHeaders.ts:49` `max-age=31536000` | HSTS 安全规范标准值 |
| `vite.config.ts:14` `port: 5173` | Vite 默认值，非业务配置 |
| 前端占位符 URL（`api.example.com` 等） | UI 占位文本，非配置 |
| `demoData.ts` 中的 `model: 'gpt-5.5'` | Demo 静态数据，非配置 |
| `analysisSimulator.ts` 的 `'gpt-4o'` | 模拟器数据，非配置 |

## 四、假设与决策

1. **算法常量 vs env 配置**：RRF 融合参数（k=60, topK=20）抽取为模块内命名常量而非 env 字段，因为调整它们需要理解 RRF 算法含义，不属于运维可调参数。chat 的 topK/maxSteps 纳入 env 因为它们更接近运维参数。
2. **限流窗口简化**：general/analyze/urlfetch/chat 共享 `RATE_LIMIT_WINDOW_MS`（60s），auth 单独 `RATE_LIMIT_AUTH_WINDOW_MS`（15min）。不设 5 个独立窗口字段，避免过度配置。
3. **promptCache 构造函数默认 TTL**：保留为模块常量（非 env），因为三个实例均显式传 TTL，构造函数默认值不会被实际使用。
4. **前端 config 模块命名**：使用 `config/runtime.ts` 而非 `config/env.ts`，因为前端 `import.meta.env` 已是 Vite 的 env 机制，`runtime.ts` 更准确表达"运行时可配置常量"。
5. **前端新增 env 变量均可选**：所有 `VITE_*` 变量均有内置默认值，不设置也能正常运行，确保零配置开箱即用。

## 五、验证步骤

1. **后端类型检查**：`cd youju-server && npx tsc --noEmit`（exit 0）
2. **前端类型检查**：`cd youju-app && npx tsc --noEmit`（exit 0）
3. **Lint 检查**：`pnpm lint`（确认无新增 error，pre-existing warnings 可接受）
4. **后端启动验证**：`cd youju-server && pnpm dev`（确认 env.ts 解析无报错）
5. **前端启动验证**：`cd youju-app && pnpm dev`（确认 config/runtime.ts 导入无报错）
6. **API 验证**：启动后端后访问 `GET /api/v1/models/presets` 和 `GET /api/v1/models/options` 确认返回正常
7. **grep 验证**：在 `youju-server/src` 中搜索 `process.env.` 确认仅剩 env.ts 内部的 `parseEnv()` 调用（行 98）
