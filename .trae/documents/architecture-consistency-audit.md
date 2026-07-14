# 架构与实现一致性审计计划

## Summary

对有据（YouJu）项目进行全面架构审计后，发现 11 项设计与实现不一致。核心改动是将"伪流水线"重构为真正的 7 步独立 AI 调用管道，每步独立调用 AI、独立可重试、独立可缓存。配合 API 层前缀缓存控制 token 开销。

## Token 消耗与缓存策略

### 重构后：6 次独立 AI 调用（步骤 1-6）+ 1 次组装（步骤 7）

| 步骤 | AI 调用 | User Prompt 结构 | 输出 |
|------|---------|-----------------|------|
| 1. 场景发现 | ✅ | 材料 + 场景知识提示 | scenario + reasoning_trace |
| 2. 输入解析 | ✅ | 材料 + 步骤1输出 | sources + reasoning_trace |
| 3. 维度发现 | ✅ | 材料 + 步骤1-2输出 | dimensions + reasoning_trace |
| 4. 跨源提取 | ✅ | 材料 + 步骤1-3输出 | extracted_entities + reasoning_trace |
| 5. 差异检测 | ✅ | 材料 + 步骤1-4输出 | risks + reasoning_trace |
| 6. 自检修正 | ✅ | 材料 + 步骤5输出 | revised risks + checklist + reasoning_trace |
| 7. 最终输出 | ❌ 组装 | 全部前序输出 | AnalyzeResult |

### 前缀缓存策略

**关键设计**：每个步骤的 user prompt 中，材料内容放在最前面，前序步骤输出放在后面。

```
User Prompt 结构:
<sources>                    ← 这部分在步骤1-6中完全相同
{全部材料内容}                 ← DeepSeek/OpenAI 自动缓存此前缀，仅计 10% token
</sources>

<previous_outputs>           ← 这部分每步不同
{前序步骤的JSON输出}
</previous_outputs>

<task>
{当前步骤的具体任务指令}
</task>
```

**Token 经济学**：
- 步骤 1：材料全价（~10000t）+ 步骤1指令（~500t）= ~10500t prompt
- 步骤 2-6：材料缓存价（~1000t）+ 前序输出（~500-3000t）+ 步骤指令（~500t）= ~2000-4500t prompt
- 6 步总计 prompt: ~10500 + 5×3000(平均) = ~25500t（vs 伪流水线 ~16000t）
- 前缀缓存使增量仅 ~60%，可接受

### 应用层 Prompt Cache
- 每步独立缓存（hash = system + user + model）
- 重复分析相同材料时，6 步全部命中，仅计 10% token
- 领域层 AnalysisCache 仍然有效（命中跳过整个 pipeline）

## Current State Analysis

### 已正确实现（无需修改）
- 5 层分层架构与 DI 容器注入
- 状态机（RUNNING/STEP_ACTIVE/FAILED/RETRYING/COMPLETED）
- Checkpoint 持久化与恢复机制（需适配新架构）
- 增量分析框架（重构后才能真正生效）
- analysis_logs append-only 作为 source of truth
- scenario_knowledge 版本化+加权评分+时间衰减
- Zustand 集中状态管理（14 个 store + 门面模式）
- React Query 统一查询层
- SSRF 保护全链路 / Rate limiting / JWT / Zod 验证 / 安全头 / API 版本控制 / 优雅关闭
- 领域层 AnalysisCache（含流式路径缓存回放）
- 文件解析（unpdf + officeparser）
- EdgeOne cron 触发器配置

### 发现的 11 项不一致

| # | 不一致项 | 严重度 |
|---|---------|--------|
| 1 | 伪流水线：7 步仅 2 步真实调 AI（本次重构为 6 步独立调用） | 高 |
| 2 | better-sqlite3 仍存在，与 Serverless 目标冲突 | 高 |
| 3 | ErrorCode 仅 10 种（非 12 种） | 中 |
| 4 | System prompt 中 DISCREPANCY_DETECTION 步骤重复定义 | 中 |
| 5 | Prompt 声明 8 步，代码实现 7 步 | 中 |
| 6 | 自检步骤 system prompt 硬编码在步骤文件中 | 中 |
| 7 | Domain 层反向依赖 Infrastructure（import isMockMode） | 中 |
| 8 | 核心前端 store 测试被排除 | 中 |
| 9 | 双重定时任务：setInterval + cron 并行 | 低 |
| 10 | Schema 缺少正式 migration 版本管理 | 低 |
| 11 | Few-Shot 示例已有但需迁移到分步提示词 | 低 |

## Proposed Changes

### 阶段一：7 步独立 AI 调用重构（核心改动）

#### 1.1 创建分步提示词文件

**新建文件**:
- `youju-server/src/ai/prompts/versions/v1/steps/shared-header.md` — 共享身份和安全规则
- `youju-server/src/ai/prompts/versions/v1/steps/step-1-scenario.system.md`
- `youju-server/src/ai/prompts/versions/v1/steps/step-2-input-parsing.system.md`
- `youju-server/src/ai/prompts/versions/v1/steps/step-3-dimension-discovery.system.md`
- `youju-server/src/ai/prompts/versions/v1/steps/step-4-cross-source-extraction.system.md`
- `youju-server/src/ai/prompts/versions/v1/steps/step-5-discrepancy-detection.system.md`
- `youju-server/src/ai/prompts/versions/v1/steps/step-6-self-check.system.md`

**修改文件**:
- `youju-server/src/ai/prompts/index.ts` — 添加 `getStepSystemPrompt(stepName, version)` 函数

**设计**: 每个 step 系统提示词包含：
1. 共享头部：identity + safety + behavioral_rules（从 shared-header.md 加载）
2. 步骤指令：从当前 `analysis.system.md` 对应的 `<step>` 标签提取
3. 相关规则：步骤 4 含 evidence_rules + confidence_scoring；步骤 5 含 risk_rules + risk_level_matrix；步骤 6 含 self-critique checklist + quality_bar
4. 步骤输出 schema：仅当前步骤需要输出的字段
5. Few-Shot 示例：从现有 `analysis.system.md` 的 `<examples>` 中提取对应步骤的片段

#### 1.2 创建分步 User Prompt 构建器

**新建文件**: `youju-server/src/ai/prompts/stepUserPrompts.ts`

**设计**: 6 个函数，每个返回标准化的 user prompt：

```typescript
// 所有步骤共享的材料格式化（前缀缓存友好）
function formatMaterials(sources: Source[]): string {
  // <sources> 标签包裹，放在 user prompt 最前面
}

export function buildStep1UserPrompt(sources, scenarioKnowledge?): string
export function buildStep2UserPrompt(sources, step1Output): string
export function buildStep3UserPrompt(sources, step1Output, step2Output): string
export function buildStep4UserPrompt(sources, step1Output, step3Output): string
export function buildStep5UserPrompt(sources, step1Output, step4Output): string
export function buildStep6UserPrompt(sources, step5Output): string
```

每个函数的结构：`材料 → 前序输出 → 当前任务指令`

#### 1.3 重写 7 个 Step 执行器

**修改文件**:
- `step-scenario-discovery.ts` — 保留 AI 调用，改用分步提示词
- `step-input-parsing.ts` — **从切片改为独立 AI 调用**
- `step-dimension-discovery.ts` — **从切片改为独立 AI 调用**
- `step-cross-source-extraction.ts` — **从切片改为独立 AI 调用**
- `step-discrepancy-detection.ts` — **从切片改为独立 AI 调用**
- `step-self-check.ts` — 保留 AI 调用，改用分步提示词
- `step-final-output.ts` — 保持组装逻辑，但从所有前序步骤收集数据

**每个步骤的改动模式**（以 step-input-parsing 为例）：

```typescript
export const stepInputParsing: StepExecutor = async (input: StepInput): Promise<StepOutput> => {
  const startTime = Date.now()

  // Mock 模式仍走规则引擎
  if (isMockMode(input.aiConfig?.apiKey, input.isDemo)) {
    return mockStepInputParsing(input)
  }

  // 构建独立提示词
  const systemPrompt = getStepSystemPrompt('step-2-input-parsing', CURRENT_PROMPT_VERSION)
  const step1Output = input.previousOutputs['step-scenario-discovery']
  const userPrompt = buildStep2UserPrompt(input.sources, step1Output)

  // 独立调用 AI（带 prompt cache）
  const aiResponse = await callAI(userPrompt, systemPrompt, 2, input.aiConfig, {
    enabled: true,
    cacheInstance: analysisCache,
  })

  // 解析步骤专属输出
  const parsed = extractAndValidateJSON(aiResponse.content)

  return {
    data: { sources: parsed.sources, ... },
    modelVersion: aiResponse.model,
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt: aiResponse.tokenPrompt,      // 真实 token，不再均摊
    tokenCompletion: aiResponse.tokenCompletion,
    latencyMs: Date.now() - startTime,
  }
}
```

#### 1.4 移除 SharedMainCallResult 机制

**修改文件**:
- `step-scenario-discovery.ts` — 删除 `sharedMainCallResult`、`sharedMainCallPromise`、`ensureMainCallExecuted`、`getSharedMainCallResult`、`setSharedMainCallResult`、`resetSharedMainCallResult`
- `analysisAdapter.ts` — 删除 `resetSharedMainCallResult()` 调用，删除 `resumeFromCheckpoint` 中的 `setSharedMainCallResult` 逻辑
- `pipeline/types.ts` — 删除 `PipelineCheckpoint.mainCallResult` 字段
- `domain/types.ts` — 保留 `SharedMainCallResult` 类型定义（可能用于其他地方），但不再使用

#### 1.5 更新 Executor 和 Checkpoint

**修改文件**:
- `executor.ts` — 每步执行后保存该步的 AI 原始输出到 checkpoint
- `analysisCheckpointService.ts` — checkpoint 格式调整为 per-step AI 输出
- `analysisAdapter.ts` — `resumeFromCheckpoint` 从 checkpoint 恢复每步输出

**Checkpoint 新格式**:
```typescript
interface PipelineCheckpoint {
  stepOutputs: Record<string, {     // 每步的完整输出
    data: unknown
    modelVersion: string
    tokenPrompt: number
    tokenCompletion: number
    rawAIResponse?: string          // AI 原始响应（用于调试和重放）
  }>
  completedSteps: string[]
  // 删除 mainCallResult 字段
}
```

#### 1.6 更新 Mock 模式

**修改文件**: 每个 step 文件中的 mock 逻辑

**设计**: Mock 模式下每步仍走规则引擎（不调 AI），但每步独立产出自己的输出，不再共享主调用结果。Mock 逻辑保持现有的规则匹配行为。

#### 1.7 更新最终输出组装

**修改文件**: `step-final-output.ts`

**设计**: 从所有前序步骤的 `data` 中收集：
- step-1: scenario
- step-4: extracted_entities
- step-6: risks, checklist, aligned_version, uncertainties
- 合并所有步骤的 reasoning_trace

token 统计为所有步骤的总和（不再均摊）。

### 阶段二：其他高/中严重度修复

#### 2. Serverless 兼容性 — 默认驱动切换

**文件**: `package.json`, `DatabaseDriver.ts`, `env.ts`
1. `env.ts` 添加 `DB_DRIVER` 环境变量（默认 `sqlite`，可设为 `neon`）
2. `DatabaseDriver.ts` 工厂函数根据 `DB_DRIVER` 选择驱动
3. `package.json` 将 `better-sqlite3` 移至 `optionalDependencies`
4. `dbBackup.ts` 非 SQLite 时跳过文件备份

#### 3. 补全 ErrorCode 至 12 种

**文件**: `errors.ts`, `errorHandler.ts`
1. 添加 `FILE_TOO_LARGE`（413）和 `SERVICE_UNAVAILABLE`（503）
2. 添加工厂函数 `fileTooLarge()` 和 `serviceUnavailable()`

#### 4-5. 修复 System Prompt 重复定义和步骤数

**文件**: `analysis.system.md`（保留作为参考文档）
- 重构后该文件不再直接用于 AI 调用，但保留为设计参考
- 修复重复的 DISCREPANCY_DETECTION 定义
- 步骤数改为 7-step

#### 6. 自检步骤提示词版本化

**已包含在 1.1 中**: `step-6-self-check.system.md` 将作为分步提示词的一部分创建。

#### 7. 修复 Domain 层反向依赖 Infrastructure

**文件**: 新建 `domain/ports/infrastructurePorts.ts`, 修改 `incrementalAnalysis.ts`, `analysisCache.ts`, `configureContainer.ts`
1. 定义 `ModeCheckerPort` 接口
2. Domain 层通过构造函数注入，不再直接 import `env.js`

### 阶段三：低严重度修复

#### 8. 修复被排除的前端 store 测试

**文件**: `vitest.config.ts`, `useAnalysisStore.test.ts`
1. 诊断测试失败原因
2. 修复后从 exclude 移除

#### 9. 消除双重定时任务风险

**文件**: `backgroundJobs.ts`, `env.ts`
1. 添加警告日志：`ENABLE_BACKGROUND_JOBS=true` 且 `CRON_SECRET` 已配置时警告
2. 文档注明 Serverless 部署应设 `ENABLE_BACKGROUND_JOBS=false`

#### 10. Schema migration 版本管理

**文件**: 新建 `migrationVersion.ts`, 修改 `sqliteSchema.ts`
1. 每个 `SQLITE_ADD_COLUMNS` 条目关联版本号
2. 启动时记录 schema 版本到 `_meta` 表

## Assumptions & Decisions

1. **步骤 7 保持组装模式**：不调 AI，从步骤 1-6 收集数据组装最终结果。6 次 AI 调用已足够严谨。
2. **前缀缓存依赖 AI 提供商**：DeepSeek 和 OpenAI 均自动缓存重复前缀（>1024 tokens），无需应用层显式标记。
3. **Mock 模式每步独立产出**：不再共享 mock 主调用结果，每步走各自的规则引擎逻辑。
4. **Few-Shot 示例迁移**：从现有 `analysis.system.md` 提取到分步提示词中，每步包含相关示例片段。
5. **不移除 better-sqlite3**：开发环境仍需 SQLite，仅移至 optionalDependencies。
6. **旧 `analysis.system.md` 保留为参考**：不再用于 AI 调用，但保留为设计文档。

## Verification Steps

1. **后端编译**: `cd youju-server && pnpm build` — 零 TypeScript 错误
2. **前端编译**: `cd youju-app && pnpm build` — 零 TypeScript 错误
3. **后端测试**: `cd youju-server && pnpm test` — 所有测试通过
4. **前端测试**: `cd youju-app && pnpm test` — 包括之前被排除的 store 测试
5. **真实分析测试**: 上传材料进行真实 AI 分析，验证 7 步独立执行
6. **Mock 分析测试**: 使用预设场景模板，验证 mock 模式 7 步独立产出
7. **缓存验证**: 重复分析相同材料，检查日志输出 "缓存命中"
8. **并发安全验证**: 确认无模块级共享状态
9. **增量分析验证**: 修改一个材料后重新分析，验证仅重跑受影响步骤
10. **Checkpoint 恢复验证**: 中断后恢复分析，验证从断点继续
11. **Token 统计验证**: 检查每步报告真实 token 消耗，无均摊
