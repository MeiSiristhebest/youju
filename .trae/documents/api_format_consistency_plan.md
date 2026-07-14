# 前后端 API 数据格式一致性检查计划

## 1. 问题背景

系统监控功能中发现了 `undefinedms` 和 `0 tokens` 的显示问题，根因是前后端 API 返回的数据格式不一致。需要系统性地检查所有 API 端点，确保前后端数据格式完全匹配。

## 2. 已发现的问题

### 2.1 已修复的问题（系统监控）

| 问题 | 位置 | 原因 | 状态 |
|---|---|---|---|
| 步骤性能显示 `undefinedms` | [health.ts](file:///D:/developWorkPlaces/youju/youju-server/src/presentation/routes/health.ts) | 后端返回 `stepName`/`avgLatencyMs`，前端期望 `step`/`avgDurationMs` | ✅ 已修复 |
| 成本估算数据不显示 | [health.ts](file:///D:/developWorkPlaces/youju/youju-server/src/presentation/routes/health.ts) | 后端返回 `tokens`，前端期望 `cost` | ✅ 已修复 |
| 知识库统计不显示 | [health.ts](file:///D:/developWorkPlaces/youju/youju-server/src/presentation/routes/health.ts) | 后端返回 `knowledge`，前端期望 `knowledgeBase` | ✅ 已修复 |

### 2.2 待检查的潜在问题

| API 端点 | 前端类型 | 后端返回 | 风险等级 |
|---|---|---|---|
| `/api/sources/text` | `Source` | `{ sourceId, ...source }` | 低 |
| `/api/sources/upload` | `Source` | `{ sourceId, ...source }` | 低 |
| `/api/sources/url` | `Source` | `{ sourceId, ...source }` | 低 |
| `/api/scenarios/:id/init` | `InitScenarioResult` | `{ scenario, sources }` | 低 |
| `/api/tasks` POST | - | `{ taskId, ...task, result }` | 中 |
| `/api/draft` | `DraftResult` | `{ draft }` | 低 |
| `/api/analyze/async` | `SubmitAsyncAnalysisResponse` | `{ taskId, status }` | 低 |
| `/api/analyze/status/:taskId` | `AsyncTaskStatusResponse` | `{ ...taskStatus, result }` | 中 |

## 3. 详细分析

### 3.1 Source 类型差异

**后端 Source（[types.ts](file:///D:/developWorkPlaces/youju/youju-server/src/domain/types.ts#L46-L52)）：**
```typescript
interface Source {
  id: string
  type: SourceType
  name: string
  content: string
  meta?: string
}
```

**前端 Source（[source.ts](file:///D:/developWorkPlaces/youju/youju-app/src/types/source.ts#L30-L42)）：**
```typescript
interface Source {
  id: string
  type: SourceType
  name: string
  content: string
  meta?: string | Record<string, any>
  status?: SourceStatus
  progress?: number
  parsedSummary?: ParsedSummary
  createdAt?: string | number
  updatedAt?: string | number
  processingStatus?: ProcessingStatus
  charCount?: number
}
```

**风险评估：** 前端类型比后端更宽松，后端返回的数据能被前端正确解析。但后端缺少 `createdAt`、`charCount` 等字段。

### 3.2 任务创建响应差异

**前端期望：** 无明确类型，通过 `taskStore` 处理

**后端返回（[tasks.ts](file:///D:/developWorkPlaces/youju/youju-server/src/presentation/routes/tasks.ts#L61)）：**
```typescript
{ taskId: task.id, ...task, result }
```

**风险评估：** 需要检查前端是否正确处理 `result` 字段。

### 3.3 异步任务状态响应

**前端类型（[analysis.ts](file:///D:/developWorkPlaces/youju/youju-app/src/types/analysis.ts#L277-L288)）：**
```typescript
interface AsyncTaskStatusResponse {
  taskId: string
  status: AsyncTaskStatus
  currentStep: AsyncTaskCurrentStep | null
  completedSteps: AsyncTaskStepInfo[]
  partialResult?: unknown
  result?: AnalyzeResult
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}
```

**后端返回（[analysis.ts](file:///D:/developWorkPlaces/youju/youju-server/src/presentation/routes/analysis.ts#L365-L371)）：**
```typescript
{
  ...taskStatus,
  result: resultWithPreferences,
}
```

**风险评估：** 需要确认 `taskStatus` 的结构是否与前端类型匹配。

## 4. 修复计划

### 4.1 阶段一：修复已知问题（已完成）

- 修复 `/admin/stats` 端点的字段映射

### 4.2 阶段二：检查并修复 Source 创建响应

**目标：** 确保后端返回的 Source 对象包含前端期望的所有字段

**修改文件：**
- [sources.ts](file:///D:/developWorkPlaces/youju/youju-server/src/presentation/routes/sources.ts)

**修改内容：**
- 在创建 Source 时添加 `createdAt`、`charCount` 字段

### 4.3 阶段三：检查异步任务状态响应

**目标：** 确保 `/api/analyze/status/:taskId` 返回的结构与前端类型完全匹配

**修改文件：**
- [analysis.ts](file:///D:/developWorkPlaces/youju/youju-server/src/presentation/routes/analysis.ts)
- [analysisTaskScheduler.ts](file:///D:/developWorkPlaces/youju/youju-server/src/domain/services/analysisTaskScheduler.ts)

**修改内容：**
- 确保 `getTaskStatus` 返回的结构包含 `currentStep`、`completedSteps`、`partialResult`、`startedAt`、`completedAt` 字段

### 4.4 阶段四：验证所有修改

**验证方法：**
- 运行现有测试套件（`pnpm test`）
- 手动测试关键 API 端点
- 检查前端显示是否正常

## 5. 潜在风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 修改后端 API 可能破坏现有前端功能 | 高 | 严格按照前端类型定义进行修改，确保向后兼容 |
| 数据库字段缺失 | 中 | 对于缺失字段，使用默认值或计算值 |
| 测试覆盖不足 | 中 | 添加针对性的 API 测试用例 |

## 6. 文件修改清单

| 文件 | 修改类型 | 说明 |
|---|---|---|
| `youju-server/src/presentation/routes/sources.ts` | 修改 | 添加 `createdAt`、`charCount` 字段 |
| `youju-server/src/domain/services/analysisTaskScheduler.ts` | 修改 | 确保任务状态包含所有必需字段 |
| `youju-server/src/presentation/routes/analysis.ts` | 修改 | 确保异步任务状态响应格式正确 |
| `youju-server/tests/api/` | 添加 | 添加 API 响应格式验证测试 |

## 7. 验证标准

- ✅ 所有现有测试通过
- ✅ Source 创建响应包含 `createdAt`、`charCount` 字段
- ✅ 异步任务状态响应包含所有前端期望字段
- ✅ 系统监控页面数据显示正常
- ✅ 前端功能不受影响