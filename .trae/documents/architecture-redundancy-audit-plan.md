# 架构冗余审计与精简计划

## 概要

对项目进行全面冗余审计，识别可删除、合并或简化的架构层级，降低代码复杂度和维护成本。

---

## 现状分析

### 后端 (youju-server)

#### 1. DI 容器系统 — 过度工程但已深度绑定
**文件**: `src/infrastructure/di/` (7 个文件: container.ts, serviceLocator.ts, tokens.ts, configureContainer.ts, configureAdapters.ts, configureRepositories.ts, configureServices.ts)

**现状**: 
- 自研 DI 容器，支持 register/registerSingleton/resolve
- 所有路由通过 `getService(Token)` 解析服务
- **问题**: 103 行 tokens 定义了 45+ Symbol，但 `configureRepositories.ts` 中 Read/Write 分离是纯形式主义 — 每个 `ReadRepository = Repository as XReadRepository`，完全相同实例做类型断言，没有真正的读写分离实现
- `configureServices.ts` 手动 new 所有服务再注册进容器，DI 容器并未发挥自动注入价值，只是手动绑定的全局服务定位器

**结论**: DI 系统虽然已深度绑定，但 Token 层级（特别是 Read/Write 仓储分离）和容器本身的间接层带来的收益远低于维护成本。**建议保留核心 DI 但大幅简化 Token 定义**。

#### 2. Repository 读写分离接口 — 纯形式主义
**文件**: `src/domain/ports/repositories.ts` (409 行)

**现状**:
- 15 个 Repository 全部拆分为 Read + Write + Full 三套接口
- 但实现层是同一个实例，`as XReadRepository` 做类型断言
- 没有任何真正的读写分离实现（如只读副本、写主库路由）
- 造成 tokens.ts 中 45 个 Token（15 完整 + 15 Read + 15 Write）

**结论**: **冗余**。删除 Read/Write 分离接口，只保留完整 Repository 接口，Token 从 45 个减少到 15 个。

#### 3. AnalysisCacheService vs AnalysisCache — 多余包装层
**文件**: `src/domain/services/analysisCache.ts` + `src/domain/services/analysisCacheService.ts`

**现状**:
- `AnalysisCache` 是实际实现类（~70 行）
- `AnalysisCacheService` 完全委托给 `AnalysisCache`，仅增加 `preheatScenarios` 方法
- configureServices 中通过 `new AnalysisCacheService(modeChecker).getCache()` 获取底层实例

**结论**: **冗余包装**。合并为单个 `AnalysisCache` 类。

#### 4. backgroundJobs.ts + scheduledTasks.ts — 功能重复
**文件**: `src/infrastructure/backgroundJobs.ts` + `src/infrastructure/scheduledTasks.ts`

**现状**:
- `backgroundJobs.ts`: 传统 setInterval 方式的定时任务（衰减/清理/备份/轮转）
- `scheduledTasks.ts`: Serverless cron handler 版本（handleTimeDecay/handleCleanup/handleDailyBackup/handleWeeklyBackup/handleRotateBackups）
- 两者逻辑完全重复，仅触发方式不同
- 项目已明确 Serverless 部署方向，backgroundJobs 的 setInterval 模式不可靠

**结论**: **冗余**。删除 `backgroundJobs.ts`，保留 `scheduledTasks.ts`（Serverless cron 版本）。

#### 5. dbBackup.ts — SQLite 专用，与 Serverless 方向矛盾
**文件**: `src/infrastructure/dbBackup.ts` (271 行)

**现状**:
- 使用 better-sqlite3 的 backup API
- Neon 数据库时直接跳过（返回占位对象）
- 项目已确定迁移到 Serverless 兼容数据库（Neon/Turso）
- better-sqlite3 在 Serverless 环境不兼容

**结论**: **阶段性冗余**。当完成 Neon 迁移后，dbBackup.ts 将完全无用。建议标记为待移除。

#### 6. openapiSpec.ts — 手动维护的冗余文档
**文件**: `src/presentation/docs/openapiSpec.ts` (906 行)

**现状**:
- 900+ 行手工编写的 OpenAPI 3.0 规范
- 与实际 Zod 验证 schema 存在同步风险
- 需要手动维护，容易过时

**结论**: **可移除或替换**。考虑用 zod-openapi 自动生成，或删除手动规范。若当前无外部 API 消费者，可直接删除。

#### 7. Provider Registry 系统 — 复杂但用例有限
**文件**: `src/infrastructure/ai/llmProviderRegistry.ts` + `embeddingProviderRegistry.ts` + `rerankerProviderRegistry.ts` + `src/domain/services/providerRegistry.ts`

**现状**:
- 完整的 ProviderRegistry 模式：注册/注销/健康检查/优先级/自动选择最佳
- 实际注册的 Provider：每个 Registry 仅 1 个 default provider
- healthCheck 功能从未被实际调用（无监控面板集成）

**结论**: **过度设计**。当前只有一个 Provider，Registry 模式增加大量无用代码。**简化**：保留接口定义但移除未使用的 healthCheck/selectBest 逻辑，或直接用简单 Map 替代。

#### 8. Port 接口碎片化
**文件**: `src/domain/ports/` (7 个文件)

**现状**:
- `aiCallPort.ts`: 仅 `PromptCacheLike<T>` 接口（3 行）
- `jwtPort.ts`: 仅 `JwtPort` 接口（3 行）
- `infrastructurePorts.ts`: `ModeCheckerPort` + `DocumentChunkerPort` + `ChunkResult`
- `servicePorts.ts`: `IncrementalAnalysisPort` + `RiskPreferencePort` + `AnalysisCheckpointPort`
- `providerRegistry.ts`: `ProviderRegistry<T>` + `ProviderEntry<T>` + `ProviderHealth`
- `aiPorts.ts`: 最大的文件，含 AI 分析/草稿/嵌入/检索/聊天相关接口
- `repositories.ts`: 所有 Repository 接口

**结论**: `aiCallPort.ts`（3 行）和 `jwtPort.ts`（3 行）应合并到 `aiPorts.ts` 和 `infrastructurePorts.ts` 中。**可合并**。

### 前端 (youju-app)

#### 9. SSE Parser 重复实现
**文件**: `src/lib/sseParser.ts` + `src/utils/sseParser.ts`

**现状**:
- `lib/sseParser.ts`: 解析 SSE + 读取流（被 chatApi.ts 使用）
- `utils/sseParser.ts`: 解析 SSE + safeParseJson（被 analysisStreamService.ts、streamClient.ts 使用）
- 核心解析逻辑完全相同，仅接口命名和额外功能不同

**结论**: **重复**。合并为 `src/lib/sseParser.ts`，导出统一接口。

#### 10. algorithms/ 目录 — 前端重复后端逻辑
**文件**: `src/algorithms/` (4 个文件)

**现状**:
- `analysisSimulator.ts`: 模拟分析过程（被 MSW mock handlers 和 demoAnalysisStream 使用）
- `crossValidation.ts`: 风险交叉验证（纯本地算法，仅被 analysisSimulator 使用）
- `fileParser.ts`: 前端文件类型检测和基础解析（被 AddSourceModal、useSources、sourceApi 使用）
- `incrementalEngine.ts`: 前端增量分析引擎（被多个 hooks/stores 使用）

**分析**:
- `analysisSimulator.ts` + `crossValidation.ts`: 仅用于 MSW mock 和 demo 流，是 mock 专用代码
- `fileParser.ts`: 前端文件类型检测有实际价值（上传前的文件类型预判），但解析逻辑与后端重复
- `incrementalEngine.ts`: 前端增量预测与后端 IncrementalAnalysisService 重复，但用于 UI 层面的快速预测

**结论**: `crossValidation.ts` 可合并到 `analysisSimulator.ts`；`fileParser.ts` 保留前端轻量版本；`incrementalEngine.ts` 保留用于 UI 预测。

#### 11. Store 分裂 — useAnalysisCoreStore vs useAnalysisStore
**文件**: `src/stores/useAnalysisCoreStore.ts` + `src/stores/useAnalysisStore.ts`

**现状**:
- `useAnalysisCoreStore`: 核心分析状态（result, checklist, cache, incrementalPrediction）
- `useAnalysisStore`: 聚合层，组合 coreStore + riskStore + dimensionStore + draftStore
- useAnalysisStore 导入并重新暴露 coreStore 的所有状态

**结论**: **过度拆分**。合并为一个 `useAnalysisStore`，删除 `useAnalysisCoreStore`。

#### 12. i18n 系统 — 投入高但使用率极低
**文件**: `src/i18n/` (3 个文件: index.tsx, zh-CN.ts, en-US.ts)

**现状**:
- 完整的 i18n 框架（Context + Provider + useTranslation hook）
- 8 个组件引入了 `useTranslation()`，共 37 次 `t()` 调用
- 但覆盖面极低（仅 workspace 侧的 8 个组件，landing page、modals、print 等完全未接入）

**结论**: **半成品**。要么全面接入（工作量大），要么删除简化。建议：**保留但标记为低优先级**，当前不影响精简目标。

#### 13. MSW Mock 系统
**文件**: `src/mocks/` (4 个文件)

**现状**:
- 完整的 MSW (Mock Service Worker) 配置
- 但 `main.tsx` 中未引入 `mockServiceWorker.js` 的启动逻辑
- grep 搜索 `from '.*mocks/browser'` 无结果，MSW 未被实际启用

**结论**: **死代码**。MSW 未启动，整个 mocks/ 目录未被使用。**删除**。

---

## 建议的精简操作

### 优先级 P0 — 直接删除（高收益、低风险）

| # | 操作 | 涉及文件 | 预估减少行数 | 理由 |
|---|------|---------|------------|------|
| 1 | 删除 MSW mock 系统 | `src/mocks/` 全部, `public/mockServiceWorker.js` | ~300 行 | 未启用，死代码 |
| 2 | 删除 backgroundJobs.ts | `youju-server/src/infrastructure/backgroundJobs.ts` | ~157 行 | 与 scheduledTasks.ts 重复，Serverless 模式下不可靠 |
| 3 | 删除 AnalysisCacheService 包装层 | `youju-server/src/domain/services/analysisCacheService.ts` | ~50 行 | 纯委托包装，无额外逻辑 |
| 4 | 合并 Port 碎片文件 | `aiCallPort.ts` → `aiPorts.ts`; `jwtPort.ts` → `infrastructurePorts.ts` | ~6 行文件消除 | 3 行的文件无独立存在价值 |

### 优先级 P1 — 简化合并（中收益、中风险）

| # | 操作 | 涉及文件 | 预估减少行数 | 理由 |
|---|------|---------|------------|------|
| 5 | 删除 Repository 读写分离接口 | `repositories.ts`, `tokens.ts`, `configureRepositories.ts` | ~200 行 | Read/Write 完全等价于完整接口，纯形式主义 |
| 6 | 合并 SSE Parser | 删除 `utils/sseParser.ts`，统一到 `lib/sseParser.ts` | ~50 行 | 完全重复的逻辑 |
| 7 | 合并 useAnalysisCoreStore 到 useAnalysisStore | `useAnalysisCoreStore.ts` → `useAnalysisStore.ts` | ~30 行 | 过度拆分 |
| 8 | 合并 crossValidation 到 analysisSimulator | `algorithms/crossValidation.ts` → `algorithms/analysisSimulator.ts` | ~20 行 | 仅被 simulator 使用 |

### 优先级 P2 — 评估后决定（需讨论）

| # | 操作 | 涉及文件 | 理由 |
|---|------|---------|------|
| 9 | 删除/简化 openapiSpec.ts | `presentation/docs/openapiSpec.ts` (906 行) | 手动维护成本高，与 Zod schema 存在同步风险 |
| 10 | 简化 Provider Registry | `domain/services/providerRegistry.ts` + 3 个 Registry 文件 | 仅 1 个 Provider 时过度设计 |
| 11 | 标记 dbBackup.ts 为待移除 | `infrastructure/dbBackup.ts` (271 行) | Neon 迁移完成后无用 |
| 12 | 简化 DI Token 系统 | `infrastructure/di/tokens.ts` | 依赖 P1#5 的 Read/Write Token 删除 |

---

## 实施步骤

### Phase 1: P0 操作（直接删除，无依赖）
1. 删除 `youju-app/src/mocks/` 目录和 `public/mockServiceWorker.js`
2. 删除 `youju-server/src/infrastructure/backgroundJobs.ts`，更新 `index.ts` 中的引用
3. 删除 `AnalysisCacheService`，修改 `configureServices.ts` 直接使用 `AnalysisCache`
4. 合并 `aiCallPort.ts` → `aiPorts.ts`，`jwtPort.ts` → `infrastructurePorts.ts`，更新所有导入

### Phase 2: P1 操作（简化合并，需调整引用）
5. 删除 Repository Read/Write 分离接口，简化 `repositories.ts`，更新 `tokens.ts`（45 → 15 Token），更新 `configureRepositories.ts`
6. 合并 SSE Parser：统一到 `lib/sseParser.ts`，更新 `analysisStreamService.ts` 和 `streamClient.ts` 导入
7. 合并 `useAnalysisCoreStore` → `useAnalysisStore`，更新所有导入
8. 合并 `crossValidation.ts` → `analysisSimulator.ts`

### Phase 3: P2 — 暂缓
用户决定暂不执行 P2 操作，后续根据需要再评估。

---

## 决策记录

- **P2 操作**: 仅执行 P0 + P1，P2 暂缓观察
- **MSW mock 系统**: 仅删除 MSW 框架（`mocks/` 目录中未被启用的部分），保留 `analysisSimulator.ts` 和 `demoAnalysisStream.ts` 等 demo 相关代码

---

## 验证步骤

每个 Phase 完成后：
1. `pnpm -r run typecheck` — 类型检查通过
2. `pnpm -r run test` — 测试通过
3. `pnpm -r run lint` — Lint 通过
4. 手动验证：创建自定义分析 → 上传文件 → 执行分析 → 查看结果 → 导出报告
