# 7步独立AI管道重构 — 执行计划

## Summary

将"伪流水线"（step-1 一次大调用 + step-2~5 切片均摊 + step-6 硬编码prompt）重构为真正的 **6次独立AI调用 + 1次组装**。每步使用独立 system prompt（已创建）+ 独立 user prompt（已创建）+ 独立 AI 调用（带缓存）。移除 SharedMainCallResult 模块级单例，消除并发安全隐患。

## 回答：Token消耗与缓存有效性

### 每步提示词是否不同？
**是的，每步不同**，但分两层：
- **System prompt**：`shared-header.md`（身份/安全/置信度/证据规则，所有步骤共享）+ 步骤专属指令（每步不同）+ 步骤专属 output_schema
- **User prompt**：`<sources>` 材料内容（**所有步骤完全相同**）+ `<previous_outputs>` 前序步骤输出（每步不同）+ `<task>` 当前任务指令（每步不同）

### 两层缓存如何生效？

**第一层：AI提供商前缀缓存（DeepSeek/OpenAI 自动）**
- `stepUserPrompts.ts` 已将 `<sources>` 材料内容放在 user prompt **最前面**
- DeepSeek/OpenAI 对 >1024 tokens 的重复前缀自动缓存，仅计 10% token
- 步骤1：材料全价（~10000t）+ 指令（~500t）= ~10500t
- 步骤2-6：材料缓存价（~1000t，仅10%）+ 前序输出 + 指令 = ~2000-4500t
- **6步总计 prompt: ~25500t**（vs 伪流水线 ~16000t，增量 ~60%，可接受）

**第二层：应用层 PromptCache（已就绪）**
- `callAI` 第5参数透传 `{ enabled: true, cacheInstance: analysisCache }`
- hash = SHA-256(system + user + model)，LRU 淘汰，maxSize=50, ttl=6h
- **重复分析相同材料时，6步全部命中，仅计 10% prompt token**

**第三层：领域层 AnalysisCache（已就绪）**
- 流式路径 `analyzeWithStreaming` 已检查缓存，命中时用 `PIPELINE_STEPS` 快速回放，**跳过整个 pipeline**
- 完全不调 AI，0 token 消耗

### 为什么7步比2步更严谨？
- 每步独立可重试、可缓存、可追踪、可中断恢复
- 每步输出有独立 schema 验证，失败不会污染全局
- 增量分析可真正生效：修改一个材料后仅重跑受影响步骤
- token 统计真实（不再均摊1/5），便于成本分析

## Current State Analysis

### 已就绪（无需修改）
| 文件 | 状态 |
|------|------|
| `ai/prompts/stepUserPrompts.ts` | ✅ 6个构建函数，前缀缓存友好 |
| `ai/prompts/index.ts` | ✅ `getStepSystemPrompt()` 已添加 |
| `ai/prompts/versions/v1/steps/shared-header.md` | ✅ |
| `ai/prompts/versions/v1/steps/step-1~6.system.md` | ✅ 7个文件 |
| `ai/promptCache.ts` | ✅ `analysisCache` (50/6h) 已就绪 |
| `ai/llm.ts` `callAI` | ✅ 第5参数 cache 透传已就绪 |
| `ai/mock.ts` `generateMockStepData` | ✅ 每步独立 mock 数据已就绪 |
| `domain/services/analysisService.ts` | ✅ 流式路径缓存回放已就绪 |
| `pipeline/executor.ts` | ✅ 通用执行器，无需修改 |

### 待重写（7个step执行器 + 3个支撑文件）

| 文件 | 当前问题 | 重构动作 |
|------|---------|---------|
| `step-scenario-discovery.ts` | 模块级单例 `sharedMainCallResult` + 一次大调用 | 改用 `getStepSystemPrompt('step-1-scenario')` + `buildStep1UserPrompt` 独立调用 |
| `step-input-parsing.ts` | 从切片提取，token均摊1/5 | 独立AI调用 `getStepSystemPrompt('step-2-input-parsing')` |
| `step-dimension-discovery.ts` | 从切片提取，token均摊1/5 | 独立AI调用 `getStepSystemPrompt('step-3-dimension-discovery')` |
| `step-cross-source-extraction.ts` | 从切片提取，token均摊1/5 | 独立AI调用 `getStepSystemPrompt('step-4-cross-source-extraction')` |
| `step-discrepancy-detection.ts` | 从切片提取，token均摊1/5 | 独立AI调用 `getStepSystemPrompt('step-5-discrepancy-detection')` |
| `step-self-check.ts` | 已有独立调用但用硬编码system prompt | 改用 `getStepSystemPrompt('step-6-self-check')` |
| `step-final-output.ts` | 从 `mainCallResult.parsed` 收集 | 从所有前序步骤 `data` 收集 |
| `pipeline/types.ts` | `StepInput.mainCallResult` + `PipelineCheckpoint.mainCallResult` | 删除这两个字段 |
| `ai/adapters/analysisAdapter.ts` | import reset/setSharedMainCallResult | 删除import和调用 |
| `domain/types.ts` | `SharedMainCallResult` 类型 | 保留类型定义（向后兼容），但不再使用 |

## Proposed Changes

### 步骤 1：重写 step-scenario-discovery.ts

**删除**：`sharedMainCallResult`、`sharedMainCallPromise`、`ensureMainCallExecuted`、`getSharedMainCallResult`、`setSharedMainCallResult`、`resetSharedMainCallResult`、`MAIN_CALL_STEP_COUNT`

**新逻辑**：
```typescript
import { getStepSystemPrompt } from '../../prompts/index.js'
import { buildStep1UserPrompt } from '../../prompts/stepUserPrompts.js'

export const stepScenarioDiscovery: StepExecutor = async (input) => {
  const startTime = Date.now()
  const isMock = isMockMode(input.aiConfig?.apiKey, input.isDemo)

  // Mock 模式：从 generateMockStepData 获取
  if (isMock) {
    const mockData = generateMockStepData(input.sources)
    return {
      data: { scenario: mockData.scenarioDiscovery.scenario, reasoning: mockData.scenarioDiscovery.reasoning },
      modelVersion: 'mock-rule-engine', promptVersion: CURRENT_PROMPT_VERSION,
      tokenPrompt: 0, tokenCompletion: 0, latencyMs: Date.now() - startTime,
    }
  }

  // 真实模式：独立AI调用
  const systemPrompt = getStepSystemPrompt('step-1-scenario', CURRENT_PROMPT_VERSION)
  const userPrompt = buildStep1UserPrompt(input.sources, input.scenarioType, input.scenarioKnowledge)
  const aiResponse = await callAI(userPrompt, systemPrompt, 2, input.aiConfig, {
    enabled: true, cacheInstance: analysisCache,
  })
  const parsed = extractAndValidateJSON(aiResponse.content)

  return {
    data: {
      scenario: { type: parsed.scenario.type, description: parsed.scenario.description, keyDimensions: parsed.scenario.key_dimensions || [] },
      reasoning: parsed.reasoning_trace?.[0]?.result || '场景识别完成',
    },
    modelVersion: aiResponse.model, promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt: aiResponse.tokenPrompt, tokenCompletion: aiResponse.tokenCompletion,
    latencyMs: Date.now() - startTime, rawOutput: aiResponse.content,
  }
}
```

### 步骤 2：重写 step-input-parsing.ts

**删除**：`MAIN_CALL_STEP_COUNT`、从 `mainCallResult` 切片逻辑

**新逻辑**：独立AI调用，`getStepSystemPrompt('step-2-input-parsing')` + `buildStep2UserPrompt(sources, step1Output)`
- step1Output 从 `input.previousOutputs['step-scenario-discovery']` 获取
- Mock 模式从 `generateMockStepData(input.sources).inputParsing` 获取

### 步骤 3：重写 step-dimension-discovery.ts

**新逻辑**：`getStepSystemPrompt('step-3-dimension-discovery')` + `buildStep3UserPrompt(sources, step1Output, step2Output)`
- Mock 从 `generateMockStepData(input.sources).dimensionDiscovery` 获取

### 步骤 4：重写 step-cross-source-extraction.ts

**新逻辑**：`getStepSystemPrompt('step-4-cross-source-extraction')` + `buildStep4UserPrompt(sources, step1Output, step3Output)`
- Mock 从 `generateMockStepData(input.sources).crossSourceExtraction` 获取

### 步骤 5：重写 step-discrepancy-detection.ts

**新逻辑**：`getStepSystemPrompt('step-5-discrepancy-detection')` + `buildStep5UserPrompt(sources, step1Output, step4Output)`
- **关键**：AI 输出的 risk 没有 `id`，需在代码中生成 `r${i+1}`；`sources` 字段从 evidence 的 sourceName 去重生成
- Mock 从 `generateMockStepData(input.sources).discrepancyDetection` 获取

### 步骤 6：重写 step-self-check.ts

**删除**：硬编码 system prompt（line 124-168）、从 `mainCallResult.parsed` 获取 uncertainties 的逻辑

**新逻辑**：`getStepSystemPrompt('step-6-self-check')` + `buildStep6UserPrompt(sources, step5Output)`
- **关键**：AI 输出的 risk 没有 `id`，需保留 step-5 传入的 id；如 AI 移除了某些 risk，则最终 risks 为 AI 输出
- uncertainties 从 AI 输出的 `uncertainties` 字段获取（不再从 mainCallResult）
- Mock 从 `generateMockStepData(input.sources).selfCheck` 获取

### 步骤 7：重写 step-final-output.ts

**删除**：从 `mainCallResult.parsed` 收集 checklist/alignedVersion/reasoningTrace/uncertainties

**新逻辑**：从所有前序步骤的 `data` 收集：
- step-1 `data.scenario` → `result.scenario`
- step-4 `data.entities` → `categorizeEntities()` → `result.extractedEntities`
- step-5 `data.risks` 或 step-6 `data.risks` → `result.risks`
- step-6 `data.checklist` → `result.checklist`（AI 在 step-6 输出 checklist）
- step-6 `data.aligned_version` → `result.alignedVersion`
- step-6 `data.uncertainties` → `result.uncertainties`
- 合并所有步骤的 `reasoning_trace` → `result.reasoningTrace`
- token 统计为所有步骤 tokenPrompt/tokenCompletion 之和（不再 0）
- `debugInfo` 从各步收集 model/token/rawOutput

**注意**：step-6 system prompt 已要求 AI 输出 `checklist` 和 `aligned_version`，需在 step-6 代码中解析这两个字段并放入 `data`。

### 步骤 8：更新 pipeline/types.ts

```typescript
// StepInput: 删除 mainCallResult 字段
export interface StepInput {
  sources: Source[]
  scenarioType?: string
  scenarioKnowledge?: ScenarioKnowledge[]
  aiConfig?: AIConfig
  isDemo?: boolean
  previousOutputs: Record<string, unknown>
  aiCaller?: ValidatingAICaller
  // 删除: mainCallResult?: SharedMainCallResult | null
}

// PipelineCheckpoint: 删除 mainCallResult 字段
export interface PipelineCheckpoint {
  state: PipelineState
  initialInput: Omit<StepInput, 'previousOutputs'> | null
  initialPreviousOutputs: Record<string, unknown>
  createdAt: string
  // 删除: mainCallResult?: SharedMainCallResult
}
```

### 步骤 9：更新 analysisAdapter.ts

**删除**：
- `import { resetSharedMainCallResult, setSharedMainCallResult } from '../pipeline/steps/step-scenario-discovery.js'`
- `analyze()` 中的 `resetSharedMainCallResult()` 调用
- `resumeFromCheckpoint()` 中的 `setSharedMainCallResult` / `resetSharedMainCallResult` 逻辑
- `resumeFromCheckpoint` 参数中的 `mainCallResult?: SharedMainCallResult` 字段

### 步骤 10：修复 step system prompts 的 output_schema

**问题**：step-5 和 step-6 的 output_schema 中 risk 缺少 `id` 和 `sources` 字段

**决策**：不在 prompt 中要求 AI 输出 id/sources（AI 生成 id 不可靠），而是在代码中生成：
- step-5：`id = r${i+1}`，`sources = [...new Set(evidence.map(e => e.sourceName))]`
- step-6：保留 step-5 传入的 id（通过映射），`sources` 同上

**文件**：无需修改 system prompt 文件，在 step 执行器代码中处理。

## Assumptions & Decisions

1. **步骤7保持组装模式**：不调AI，从步骤1-6收集数据。6次AI调用已足够严谨。
2. **Mock模式每步独立**：使用已有的 `generateMockStepData(sources)` 按步切片，不再共享主调用结果。
3. **id/sources 在代码中生成**：AI 不输出这两个字段，避免不可靠的AI生成id。
4. **保留 SharedMainCallResult 类型定义**：在 `domain/types.ts` 中保留类型（避免破坏其他import），但所有运行时使用都移除。
5. **前缀缓存依赖AI提供商**：DeepSeek/OpenAI 自动缓存 >1024 tokens 重复前缀，无需应用层显式标记。
6. **checkpoint 格式不变**：`PipelineCheckpoint` 仅删除 `mainCallResult` 字段，其余结构（stepOutputs/state）保持不变，向后兼容。
7. **reasoning_trace 合并**：step-final-output 从所有6步的 `data.reasoning_trace` 数组合并，形成完整推理链。

## Verification Steps

1. **后端编译**: `cd youju-server && pnpm build` — 零 TypeScript 错误
2. **后端测试**: `cd youju-server && pnpm test` — 所有测试通过
3. **Mock分析测试**: 使用预设场景模板，验证7步独立产出，每步有独立 reasoning
4. **真实分析测试**: 配置 AI_API_KEY，上传材料，验证7步独立AI调用，检查日志每步有独立 token 统计
5. **缓存验证**: 重复分析相同材料，检查日志输出 "Cache hit"，第二次 token 应为首次的 ~10%
6. **并发安全验证**: 确认无模块级共享状态（grep `sharedMainCallResult` 应无结果）
7. **Token统计验证**: 检查 `debugInfo.tokenPrompt` 为所有步骤真实 token 之和，无均摊
8. **Checkpoint恢复验证**: 中断后恢复分析，验证从断点继续（无 mainCallResult 依赖）
