# 硬编码问题系统性改造计划

## 概述

针对项目中发现的核心架构层硬编码问题（约 40+ 处，涉及 20+ 文件），通过**扩展现有 env.ts 统一配置中心** + **后端模型注册表 API 下发**两大手段，建立"单一数据源"原则，消除 `process.env` 绕过、默认值不一致、安全隐患和模型列表多处维护等问题。

**不在本次范围**：i18n 文案迁移、业务规则阈值集中化、prompt 版本号常量化（用户明确排除，留待后续批次）。

---

## 现状分析

### 问题 1：`process.env` 绕过 env.ts（7 处）

项目已有 `youju-server/src/infrastructure/env.ts` 通过 zod 统一验证环境变量，但多处代码绕过它直接读 `process.env`：

| 文件 | 行号 | 绕过内容 |
|---|---|---|
| `ai/llm.ts` | 23-25 | `process.env.AI_API_KEY \|\| ''`、`AI_BASE_URL \|\| 'https://api.openai.com/v1'`、`AI_MODEL \|\| 'gpt-5.5'` |
| `infrastructure/ai/llmProvider.ts` | 114-115 | 同上（与 llm.ts 重复） |
| `ai/concurrencyLimiter.ts` | 43 | `Number(process.env.AI_MAX_CONCURRENCY) \|\| 3` |
| `domain/services/analysisCache.ts` | 22-23 | `Number(process.env.ANALYSIS_CACHE_TTL_MS) \|\| DEFAULT_TTL_MS` 等 |
| `presentation/middleware/rateLimiter.ts` | 13,81,137 | `process.env.REDIS_URL`、`process.env.NODE_ENV` |
| `infrastructure/urlFetcher.ts` | 34-35 | `process.env.URL_FETCH_ALLOWLIST` 重复解析逻辑 |
| `infrastructure/ai/embeddingProvider.ts` | 全文 | `DEFAULT_BASE_URL`、`DEFAULT_MODEL` 本地常量 |
| `infrastructure/ai/rerankerProvider.ts` | 全文 | 同上 |

### 问题 2：默认值不一致（严重）

- `env.ts:9` 默认 `AI_MODEL = 'gpt-3.5-turbo'`
- `ai/llm.ts:25` 默认 `'gpt-5.5'`
- `infrastructure/ai/llmProvider.ts:115` 默认 `'gpt-5.5'`
- `youju-app/src/stores/useUIPreferenceStore.ts:176` 默认 `'gpt-5.5'`

未设置环境变量时行为不可预测。

### 问题 3：JWT_SECRET 安全隐患

`env.ts:11`：`JWT_SECRET: z.string().min(16).default('youju-dev-secret-key-change-in-production-please')`

生产环境若未设置，静默使用默认值，JWT 可被伪造。

### 问题 4：AI 超时 / 限流 / 缓存参数硬编码

| 文件 | 硬编码值 |
|---|---|
| `ai/llm.ts:99` | `AbortSignal.timeout(120000)` |
| `ai/llm.ts:180` | `AbortSignal.timeout(15000)` |
| `ai/llm.ts:255` | `AbortSignal.timeout(30000)` |
| `rateLimiter.ts:106-134` | `limit: 120/10/10/20/30`、`windowMs: 60*1000/15*60*1000` |
| `ai/promptCache.ts:106,117,126` | `maxSize: 50/100/200` |
| `infrastructure/auth.ts:6-8` | `JWT_EXPIRES_IN='7d'`、`JWT_ALG='HS256'`、`JWT_ISSUER='youju'` |

### 问题 5：模型列表三处各自维护

- 后端 `ai/llm.ts:165-170` 硬编码 4 个 Anthropic 模型
- 前端 `AnalysisTab.tsx:21-38` 硬编码 18 个模型选项
- 前端 `ModelSettingsContent.tsx:27-43` 硬编码 11 个厂商 PROVIDER_PRESETS

新增模型需改三处，易遗漏。

### 问题 6：重复定义的常量

- `DEFAULT_BATCH_SIZE = 64` 在 `embeddingAdapter.ts` 和 `embeddingProvider.ts` 重复
- `DEFAULT_BASE_URL` / `DEFAULT_MODEL` 在 `ai/adapters/` 和 `infrastructure/ai/` 两套适配器重复
- `MAX_RETRIES = 2` 在 `retrievalAdapter.ts` 和 `rerankerProvider.ts` 重复
- `DEFAULT_TTL_MS` / `DEFAULT_MAX_ENTRIES` 在 `analysisCache.ts` 和 `env.ts` 重复

---

## 改造方案

### 阶段 1：扩展 env.ts 配置中心（后端）

**文件**：`youju-server/src/infrastructure/env.ts`

**改动**：
1. 修正 `AI_MODEL` 默认值为 `'gpt-5.5'`（与前端一致，消除不一致）
2. 新增字段：
   ```ts
   // AI 调用超时
   AI_CALL_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
   AI_LIST_MODELS_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
   AI_TEST_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

   // 速率限制
   RATE_LIMIT_GENERAL_PER_MIN: z.coerce.number().int().positive().default(120),
   RATE_LIMIT_AUTH_PER_15MIN: z.coerce.number().int().positive().default(10),
   RATE_LIMIT_ANALYZE_PER_MIN: z.coerce.number().int().positive().default(10),
   RATE_LIMIT_URLFETCH_PER_MIN: z.coerce.number().int().positive().default(20),
   RATE_LIMIT_CHAT_PER_MIN: z.coerce.number().int().positive().default(30),

   // Prompt 缓存
   PROMPT_CACHE_ANALYSIS_MAX: z.coerce.number().int().positive().default(50),
   PROMPT_CACHE_CHAT_MAX: z.coerce.number().int().positive().default(100),
   PROMPT_CACHE_DRAFT_MAX: z.coerce.number().int().positive().default(200),

   // JWT 配置
   JWT_EXPIRES_IN: z.string().default('7d'),
   JWT_ALG: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
   JWT_ISSUER: z.string().default('youju'),

   // Embedding/Reranker 批量与重试
   EMBEDDING_BATCH_SIZE: z.coerce.number().int().positive().default(64),
   RERANKER_MAX_RETRIES: z.coerce.number().int().positive().default(2),
   ```
3. JWT_SECRET 安全强化：在 `parseEnv()` 中增加生产环境校验：
   ```ts
   if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'youju-dev-secret-key-change-in-production-please') {
     throw new Error('[env] 生产环境必须显式设置 JWT_SECRET，禁止使用默认开发密钥')
   }
   ```

**Why**：建立单一配置源，所有可调参数集中管理。

---

### 阶段 2：消除所有 process.env 绕过（后端）

逐文件改造，强制使用 `getEnv()`：

#### 2.1 `ai/llm.ts`（getDefaultConfig 函数）
- **Before**：
  ```ts
  function getDefaultConfig(): AIConfig {
    return {
      provider: 'openai',
      apiKey: process.env.AI_API_KEY || '',
      baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.AI_MODEL || 'gpt-5.5',
    }
  }
  ```
- **After**：
  ```ts
  import { getEnv } from '../infrastructure/env.js'
  function getDefaultConfig(): AIConfig {
    const env = getEnv()
    return {
      provider: 'openai',
      apiKey: env.AI_API_KEY ?? '',
      baseURL: env.AI_BASE_URL,
      model: env.AI_MODEL,
    }
  }
  ```
- 同时把 `llm.ts:99` 的 `120000` 改为 `getEnv().AI_CALL_TIMEOUT_MS`
- 把 `llm.ts:180` 的 `15000` 改为 `getEnv().AI_LIST_MODELS_TIMEOUT_MS`
- 把 `llm.ts:255` 的 `30000` 改为 `getEnv().AI_TEST_CONNECTION_TIMEOUT_MS`

#### 2.2 `infrastructure/ai/llmProvider.ts`
- 删除 `process.env.AI_BASE_URL || '...'` 和 `process.env.AI_MODEL || 'gpt-5.5'`，改用 `getEnv()`
- 把 `llmProvider.ts:86` 的 `30000` 改为 `getEnv().AI_TEST_CONNECTION_TIMEOUT_MS`

#### 2.3 `ai/concurrencyLimiter.ts`
- **Before**：`const maxConcurrency = Number(process.env.AI_MAX_CONCURRENCY) || 3`
- **After**：`const maxConcurrency = getEnv().AI_MAX_CONCURRENCY`

#### 2.4 `domain/services/analysisCache.ts`
- 删除本地 `DEFAULT_TTL_MS`、`DEFAULT_MAX_ENTRIES` 常量
- 构造函数改为：`this.ttlMs = getEnv().ANALYSIS_CACHE_TTL_MS`、`this.maxEntries = getEnv().ANALYSIS_CACHE_MAX_ENTRIES`

#### 2.5 `presentation/middleware/rateLimiter.ts`
- 删除 `process.env.REDIS_URL`、`process.env.NODE_ENV` 直接读取
- 5 个 limiter 的 `windowMs` 和 `limit` 改用 `getEnv()` 对应字段
- `initRateLimiters()` 中 `process.env.REDIS_URL` 改为 `getEnv().REDIS_URL`

#### 2.6 `infrastructure/urlFetcher.ts`
- 删除第 34-35 行重复的 `URL_FETCH_ALLOWLIST` / `URL_FETCH_DENYLIST` 解析逻辑
- 改用 `getEnv().URL_FETCH_ALLOWLIST`（env.ts 已做 CSV→数组转换）

#### 2.7 `infrastructure/ai/embeddingProvider.ts` & `rerankerProvider.ts`
- 删除本地 `DEFAULT_BASE_URL`、`DEFAULT_MODEL`、`DEFAULT_BATCH_SIZE`、`MAX_RETRIES` 常量
- 改用 `getEnv().EMBEDDING_BASE_URL`、`EMBEDDING_MODEL`、`EMBEDDING_BATCH_SIZE` 等

#### 2.8 `ai/adapters/embeddingAdapter.ts` & `retrievalAdapter.ts`
- 同样删除本地常量，从 `getEnv()` 读取（或直接引用 infrastructure 层 provider，消除重复）

#### 2.9 `infrastructure/auth.ts`
- 删除 `JWT_EXPIRES_IN = '7d'`、`JWT_ALG = 'HS256'`、`JWT_ISSUER = 'youju'` 本地常量
- 改用 `getEnv().JWT_EXPIRES_IN` 等

#### 2.10 `ai/promptCache.ts`
- `maxSize: 50/100/200` 改用 `getEnv().PROMPT_CACHE_ANALYSIS_MAX` 等

**Why**：确保所有配置经 zod 验证，消除默认值不一致，类型安全。

---

### 阶段 3：后端模型注册表 + API 下发

#### 3.1 新建模型注册表

**新文件**：`youju-server/src/domain/registry/modelRegistry.ts`

```ts
export interface ProviderPreset {
  provider: ModelProvider
  label: string        // 显示名 'OpenAI'
  name: string         // 产品名 'OpenAI GPT-5.5'
  baseURL: string
  defaultModel: string
}

export interface ModelOption {
  value: string        // 模型 id
  label: string        // 显示标签
  provider?: ModelProvider
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { provider: 'openai', label: 'OpenAI', name: 'OpenAI GPT-5.5', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-5.5' },
  { provider: 'anthropic', label: 'Anthropic', name: 'Anthropic Claude', baseURL: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-5' },
  // ... 其余 9 个厂商（从 ModelSettingsContent.tsx 迁移）
]

export const ANALYSIS_MODEL_OPTIONS: ModelOption[] = [
  { value: 'gpt-5.5', label: 'GPT-5.5 (推荐，旗舰)', provider: 'openai' },
  { value: 'gpt-5.4', label: 'GPT-5.4', provider: 'openai' },
  // ... 其余 16 个（从 AnalysisTab.tsx 迁移）
]

export const ANTHROPIC_FALLBACK_MODELS = [
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
  { id: 'claude-opus-4', name: 'Claude Opus 4' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'claude-haiku-3', name: 'Claude Haiku 3' },
]
```

**Why**：单一数据源，新增模型只改此文件。

#### 3.2 新增 API 路由

**修改文件**：`youju-server/src/presentation/routes/modelConfig.ts`

新增两个端点：
```ts
// GET /api/v1/models/presets —— 返回厂商预设列表
router.get('/models/presets', (req, res) => {
  res.json({ code: 200, data: PROVIDER_PRESETS })
})

// GET /api/v1/models/options —— 返回分析模型下拉选项
router.get('/models/options', (req, res) => {
  res.json({ code: 200, data: ANALYSIS_MODEL_OPTIONS })
})
```

#### 3.3 后端 `ai/llm.ts` listModels 引用注册表

`llm.ts:165-170` 的 Anthropic 硬编码模型列表改为引用 `ANTHROPIC_FALLBACK_MODELS`。

---

### 阶段 4：前端动态拉取模型列表

#### 4.1 扩展前端 modelConfigApi.ts

**文件**：`youju-app/src/services/modelConfigApi.ts`

新增：
```ts
export interface ProviderPreset {
  provider: ModelProvider
  label: string
  name: string
  baseURL: string
  defaultModel: string
}

export async function fetchProviderPresets(): Promise<ProviderPreset[]> {
  const resp = await apiClient.get('/models/presets')
  return resp.data
}

export async function fetchAnalysisModelOptions(): Promise<{ value: string; label: string }[]> {
  const resp = await apiClient.get('/models/options')
  return resp.data
}
```

#### 4.2 改造 ModelSettingsContent.tsx

**文件**：`youju-app/src/components/workspace/ModelSettingsContent.tsx`

- 删除本地 `PROVIDER_PRESETS` 常量（第 27-43 行）
- 改为通过 React Query 拉取：
  ```ts
  const { data: presets } = useQuery({
    queryKey: ['model-presets'],
    queryFn: fetchProviderPresets,
    staleTime: Infinity,  // 静态数据，永久缓存
  })
  ```
- `PROVIDER_LABELS` 可保留（纯展示标签，数据量小）或一并从 API 返回

#### 4.3 改造 AnalysisTab.tsx

**文件**：`youju-app/src/components/workspace/preferenceTabs/AnalysisTab.tsx`

- 删除第 20-39 行硬编码的 18 个 options
- 改为：
  ```ts
  const { data: options } = useQuery({
    queryKey: ['analysis-model-options'],
    queryFn: fetchAnalysisModelOptions,
    staleTime: Infinity,
  })
  // SelectRow options={options ?? []}
  ```

#### 4.4 前端 useUIPreferenceStore 默认值对齐

`youju-app/src/stores/useUIPreferenceStore.ts:176` 的 `defaultModel: 'gpt-5.5'` 保持不变（与后端 env.ts 修正后一致），作为兜底默认值。

---

### 阶段 5：更新 .env.example 文档

**文件**：`youju-server/.env.example`

新增所有新增环境变量的说明：
```bash
# AI 调用超时（毫秒）
AI_CALL_TIMEOUT_MS=120000
AI_LIST_MODELS_TIMEOUT_MS=15000
AI_TEST_CONNECTION_TIMEOUT_MS=30000

# 速率限制
RATE_LIMIT_GENERAL_PER_MIN=120
RATE_LIMIT_AUTH_PER_15MIN=10
RATE_LIMIT_ANALYZE_PER_MIN=10
RATE_LIMIT_URLFETCH_PER_MIN=20
RATE_LIMIT_CHAT_PER_MIN=30

# Prompt 缓存容量
PROMPT_CACHE_ANALYSIS_MAX=50
PROMPT_CACHE_CHAT_MAX=100
PROMPT_CACHE_DRAFT_MAX=200

# JWT 配置
JWT_EXPIRES_IN=7d
JWT_ALG=HS256
JWT_ISSUER=youju
# JWT_SECRET 生产环境必须设置！无默认值可用。

# Embedding/Reranker
EMBEDDING_BATCH_SIZE=64
RERANKER_MAX_RETRIES=2
```

---

## 涉及文件清单

### 后端修改（14 文件）
1. `youju-server/src/infrastructure/env.ts` — 新增字段 + JWT 安全校验
2. `youju-server/src/ai/llm.ts` — getDefaultConfig 用 getEnv + 超时引用 env + Anthropic 列表引用注册表
3. `youju-server/src/infrastructure/ai/llmProvider.ts` — 用 getEnv
4. `youju-server/src/ai/concurrencyLimiter.ts` — 用 getEnv
5. `youju-server/src/domain/services/analysisCache.ts` — 用 getEnv
6. `youju-server/src/presentation/middleware/rateLimiter.ts` — 用 getEnv
7. `youju-server/src/infrastructure/urlFetcher.ts` — 用 getEnv
8. `youju-server/src/infrastructure/ai/embeddingProvider.ts` — 用 getEnv
9. `youju-server/src/infrastructure/ai/rerankerProvider.ts` — 用 getEnv
10. `youju-server/src/ai/adapters/embeddingAdapter.ts` — 用 getEnv
11. `youju-server/src/ai/adapters/retrievalAdapter.ts` — 用 getEnv
12. `youju-server/src/infrastructure/auth.ts` — 用 getEnv
13. `youju-server/src/ai/promptCache.ts` — 用 getEnv
14. `youju-server/src/presentation/routes/modelConfig.ts` — 新增 2 个端点
15. `youju-server/.env.example` — 文档更新

### 后端新增（1 文件）
16. `youju-server/src/domain/registry/modelRegistry.ts` — 模型注册表

### 前端修改（3 文件）
17. `youju-app/src/services/modelConfigApi.ts` — 新增 fetch 函数
18. `youju-app/src/components/workspace/ModelSettingsContent.tsx` — 动态拉取 presets
19. `youju-app/src/components/workspace/preferenceTabs/AnalysisTab.tsx` — 动态拉取 options

---

## 假设与决策

1. **AI_MODEL 默认值统一为 `'gpt-5.5'`**：与前端 useUIPreferenceStore 和当前实际使用一致，而非 env.ts 原有的 `'gpt-3.5-turbo'`。
2. **PROVIDER_LABELS 保留在前端**：纯展示标签，数据量小，不强制从 API 获取；但 PROVIDER_PRESETS（含 baseURL/model）必须从后端获取。
3. **React Query staleTime: Infinity**：模型列表是静态配置数据，无需轮询刷新，永久缓存即可。
4. **不处理 ai/adapters 与 infrastructure/ai 的重复架构问题**：两套适配器并存是既定架构，本次只消除其中的硬编码常量重复，不合并模块。
5. **JWT_SECRET 生产校验**：在 parseEnv() 中抛错而非警告，确保生产环境启动即失败，避免静默使用默认密钥。
6. **不改动 demoData.ts 的 `'gpt-5.5'`**：演示数据中的模型名是数据的一部分，不属于配置硬编码。
7. **不改动 SCENARIO_PRESETS、业务阈值、i18n**：用户明确排除，留待后续批次。

---

## 验证步骤

1. **类型检查**：`pnpm typecheck`（前后端均需通过）
2. **Lint**：`pnpm lint`（Biome 检查）
3. **单元测试**：`pnpm test`（确保 env 解析、rateLimiter、analysisCache 等测试通过）
4. **启动验证**：
   - 开发环境：`pnpm dev` 启动后端，确认无 env 解析错误
   - 生产环境模拟：`NODE_ENV=production` 但不设 JWT_SECRET，确认启动失败并报错
5. **API 验证**：
   - `GET /api/v1/models/presets` 返回 11 个厂商
   - `GET /api/v1/models/options` 返回 18 个模型
6. **前端验证**：
   - 打开工作台 → 偏好设置 → 分析设置，确认模型下拉列表正常显示
   - 打开模型设置面板，确认厂商预设正常填充 baseURL 和 model
7. **回归**：AI 分析功能正常（callAI 超时仍为 120s）、限流功能正常、登录功能正常（JWT 过期 7d）
