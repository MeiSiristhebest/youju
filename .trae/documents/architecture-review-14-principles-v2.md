# 架构评审报告 v2（14 项设计原则 · 行号级证据）

> 评审视角：资深软件架构师
> 评审对象：`d:\developWorkPlaces\youju`（pnpm workspace，含 `youju-app` 前端 + `youju-server` 后端）
> 评审方法：基于实际代码逐文件读取，所有结论附具体文件路径与行号
> 与 v1 的差异：v1 中部分行号/结论与代码不符（如称 `analysisService.ts` 为 892 行，实际 625 行），v2 已重新核对并补充证据

---

## 0. 整体骨架评价

**架构骨架健康**：已落地 5 层隔离 + 端口与适配器 + DI 容器 + 状态机流水线 + 版本化 prompts。组合优于继承、Repository 模式、策略模式等基础实践到位。

**系统性技术债**：项目处于 P0→P1→P2 重构过渡期，存在三类系统性问题：
1. **DIP 破窗**（P0）：基础设施层反向依赖领域层；路由层绕过 DI 直接 import service 模块；service 间直接 import 函数而非通过端口。
2. **上帝模块**（P1）：5 个文件超 800 行，1 个文件超 2400 行（`PrintReport.tsx`）。
3. **双轨制兼容层**（P2）：每个 service 同时存在"类 + `setXxxInstance` 兼容层 + 模块级函数"三套接口，与 DI 容器并存。

---

## 1. 单一职责原则 (SRP)

### 严重违规

| 文件 | 行数 | 违规描述 | 证据 |
|---|---|---|---|
| [PrintReport.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/print/PrintReport.tsx) | **2434** | 单文件承担：报告布局、打印样式、风险卡片、证据渲染、检查清单、分页、导出预览 | 极端大文件 |
| [ResultPanel.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/workspace/ResultPanel.tsx) | **1036** | 工作区结果区同时承担：风险列表、步骤动画、检查清单、维度切换、空状态、骨架屏 | 单文件多视图 |
| [useAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts) | **881** | ViewModel 上帝模块：SSE 解析、增量决策、缓存读写、风险排序、撤销快照、demo 分发全部混入 | [useAnalysis.ts#L118-L287](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts#L118-L287) `analyzeMutation` 170 行单函数 |
| [SourcePanel.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/workspace/SourcePanel.tsx) | **837** | 同时处理：源列表、上传表单、URL 抓取、文件拖拽、预览、OCR | - |
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | **625** | 上帝 Service：分析执行 + 流式回调编排 + 日志写入 + 缓存 + 增量 + 草稿 + checkpoint 委托 | [analysisService.ts#L32-L46](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts#L32-L46) 直接 import 5 个模块 |
| [useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts) | **526** | 上帝 Store：50+ 字段涵盖 result/step/checklist/draft/streaming/cache/dimensions/riskStatuses/riskNotes/failedSteps/analysisLogs/taskStatus | [useAnalysis.ts#L28-L105](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts#L28-L105) 解构出 70+ 项 |

### 轻微违规

- [CommandPalette.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/common/CommandPalette.tsx)（780 行）：命令面板 + 快捷键 + 搜索 + 路由跳转混合。
- [analysisLogService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisLogService.ts)（427 行）：日志写入 + 步骤记录 + scenario knowledge 更新 + 任务结果落库。
- [step-scenario-discovery.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/steps/step-scenario-discovery.ts)：AI 调用 + 结果缓存 + JSON 解析 + Mock 降级混合。

### 重构方向

1. **`PrintReport.tsx` 按 Atomic Design 拆分**：拆为 `print/atoms/{RiskCard,EvidenceBlock,ChecklistItem}.tsx` + `print/molecules/{RiskSection,ChecklistSection}.tsx` + `print/organisms/{ReportHeader,ReportBody,ReportFooter}.tsx` + `print/PrintReport.tsx` 仅做组合。
2. **`useAnalysis.ts` 按职责拆分**：
   - `lib/sseStreamParser.ts`（纯函数，SSE 事件解析）
   - `hooks/useIncrementalAnalysis.ts`（增量决策）
   - `hooks/useAnalysisCancellation.ts`（撤销快照）
   - `selectors/riskSelectors.ts`（`sortedRisks` / `riskStatusCounts` 派生数据）
   - `useAnalysis.ts` 仅保留 hook 编排
3. **`analysisService.ts` 进一步拆分**：抽出 `AnalysisStreamOrchestrator`（流式回调编排）、`AnalysisResultPersister`（结果落库）。
4. **完成 `useAnalysisStore` 5 个子 store 实际职责迁移**：当前 5 个子 store 已建但未承担职责，主 store 仍是事实上的上帝 Store。

---

## 2. 开闭原则 (OCP)

### 违规

| 文件 | 行号 | 违规描述 |
|---|---|---|
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | [L143-L345](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts#L143-L345) | 装配代码硬编码：新增模型/服务/Repository 必须修改 `createApp`，14 个 `setXxxInstance` + 22 个 `container.registerSingleton` 全部硬编码 |
| [analysisAdapter.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/adapters/analysisAdapter.ts) | - | `STEP_DEFINITIONS` 硬编码在类内部，新增步骤需修改适配器（实际已有 `defaultStepRegistry`，但适配器未使用注册表） |
| [analysisRules.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/rules/analysisRules.ts) | 419 行 | 业务规则硬编码为函数集合，难以扩展新规则类型 |
| [llm.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/llm.ts) | [L35-L69](file:///d:/developWorkPlaces/youju/youju-server/src/ai/llm.ts#L35-L69) | `createModel` 按 provider switch，新增 provider 必须改源码（应改为 provider 注册表） |

### 重构方向

1. **DI 容器自动扫描注册**：约定 `services/**/*.ts` 自动注册，`app.ts` 仅做驱动选择。
2. **步骤注册表真正落地**：`analysisAdapter` 改用 `defaultStepRegistry.getAll()` 装配流水线，支持运行时 `registerStep` 插入。
3. **Provider 注册表**：`createModel` 改为 `providerRegistry.register('anthropic', factory)`，新增 provider 仅注册不修改源码。
4. **规则链模式**：`analysisRules` 每条规则实现 `Rule<TInput, TOutput>` 接口，通过 `RuleChain` 组合。

---

## 3. 里氏替换原则 (LSP)

### 违规

| 文件 | 行号 | 违规描述 |
|---|---|---|
| [taskService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/taskService.ts) | [L211-L328](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/taskService.ts#L211-L328) | 兼容层模块级函数 `createTask` / `getTask` 与 `TaskService` 类方法签名不一致，调用方行为依赖使用方式 |
| [sourceService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/sourceService.ts) | [L103-L176](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/sourceService.ts#L103-L176) | 同上：`createSource` / `listSources` 模块级函数与 `SourceService` 类方法并存 |
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | L165 | `setEmbeddingPort(null)`：给必填 Port 注入 null，违反接口契约，下游调用 `embeddingPort.embed()` 将 NPE |
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | L144-L177 | 8 处 `as unknown as Parameters<typeof setXxx>[0]` 强转，类型契约被绕过 |

### 重构方向

1. **删除所有兼容层模块级函数**：仅保留类接口，调用方统一通过 `getService<T>(Tokens.Xxx)`。
2. **`EmbeddingPort` 改为可选注入**：构造函数 `embeddingPort?: EmbeddingPort`，或拆分 `OptionalEmbeddingPort`。
3. **消除 `as unknown as` 强转**：统一 Repository 实例类型，让 `setXxx` 接受具体接口而非推断类型。

---

## 4. 接口隔离原则 (ISP)

### 违规

| 文件 | 行号 | 违规描述 |
|---|---|---|
| [aiPorts.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts) | L81 | `CheckpointCapableAnalyzer extends Analyzer`：不需要 checkpoint 的实现被迫实现 `resumeFromCheckpoint` / `retryStep` / `skipStep` |
| [repositories.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/repositories.ts) | 258 行 | 13 个 Repository 接口，每个都包含完整 CRUD；只读场景（如 `ObservabilityRepository` 查询）被迫实现 `update` / `delete` |
| [aiPorts.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts) | L182 | `RetrievalPort extends RerankerPort`：deprecated 但仍存在，强制实现方实现 rerank |

### 重构方向

1. **`AIAnalysisPort` 拆分**：
   - `AIAnalyzer`（`analyze`）
   - `AICheckpointHandler`（`resumeFromCheckpoint` / `retryStep` / `skipStep`）
   - `AnalysisAdapter` 实现 `AIAnalyzer & AICheckpointHandler`
2. **Repository 读写分离**：`ReadOnlyRepository<T>` / `WriteOnlyRepository<T>` / `Repository<T> extends ReadOnly, WriteOnly`。
3. **删除 deprecated `RetrievalPort`**：迁移到 `RerankerPort` + `RetrievalOrchestratorPort`。

---

## 5. 依赖倒置原则 (DIP)

### 严重违规（P0 紧急）

| 文件 | 行号 | 违规描述 | 影响 |
|---|---|---|---|
| [auth.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/auth.ts) | L2 | `import { findOrCreateUser } from '../domain/services/userService.js'` —— 基础设施层**反向依赖**领域层 | 违反端口与适配器架构核心约束 |
| [routes/analysis.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/routes/analysis.ts) | L2-L9 | 同时使用 `getService<>()` + `import * as analysisTaskManager` + `import * as preferenceService` —— 路由层绕过 DI 直接 import service 模块 | 双轨制，调用来源不一致 |
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | L32-L38 | 直接 import `performDiffBasedIncrementalAnalysis` / `resumeAnalysisFromCheckpoint` 等函数 —— service 间硬耦合 | 无法替换实现 |
| [sourceService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/sourceService.ts) | L3 | `import { chunkAndEmbed } from './chunkService.js'` —— service 间直接 import 函数 | 同上 |
| [chatService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/chatService.ts) | L16 | `import { retrieveMemoryContext } from './memoryService.js'` | 同上 |
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | L3-L7 | 直接 `import { analysisAdapter, ChatAdapter, draftAdapter, embeddingAdapter, retrievalAdapter }` —— 绕过抽象端口直接实例化 adapter | 端口形同虚设 |
| [orchestrator.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/orchestrator.ts) | - | 标记 `@deprecated` 但仍存在，import adapters | 死代码 |

### 重构方向

1. **`auth.ts` 反向依赖修复**：在 `domain/ports/` 新增 `UserCreationPort`，`auth.ts` 改为接收 port 参数（由 `app.ts` 注入）；或将 `wechatLoginMock` 移到 `domain/services/authService.ts`，`infrastructure/auth.ts` 仅保留 JWT 纯函数。
2. **路由层统一走 DI**：删除 `import * as analysisTaskManager` / `import * as preferenceService`，全部改为 `getService(Tokens.AnalysisTaskManager)` / `getService(Tokens.PreferenceService)`。
3. **Service 间通过端口交互**：`AnalysisService` 构造函数注入 `IncrementalAnalysisPort` / `CheckpointPort`，而非直接 import 函数。
4. **Adapter 通过 DI 容器创建**：`app.ts` 不再直接 import adapter 实例，改为 `container.registerSingleton(Tokens.AIAnalysisPort, (loc) => new AnalysisAdapter(loc.resolve(Tokens.PipelineRegistry)))`。
5. **删除 `orchestrator.ts`**：已被 `PipelineExecutor` 取代。

---

## 6. 关注点分离 (Separation of Concerns)

### 5 层架构落地情况

| 层 | 路径 | 落地 | 问题 |
|---|---|---|---|
| UI Layer | `youju-app/src/{pages,components}/` | ✅ | 但组件内混入业务逻辑（见下） |
| API Layer | `youju-server/src/presentation/{routes,middleware,validation}/` | ✅ | 路由层绕过 DI（见 DIP） |
| Domain Layer | `youju-server/src/domain/{services,ports,rules,context}/` | ✅ | service 间硬耦合（见 DIP） |
| AI Orchestration Layer | `youju-server/src/ai/{adapters,pipeline,prompts}/` | ✅ | adapter 绕过端口（见 DIP） |
| Data Layer | `youju-server/src/data/{drivers,repositories,schema}/` | ✅ | `db.ts` 模块顶层副作用（见 §8） |

### 视图 / 业务逻辑 / 数据访问解耦问题

| 位置 | 行号 | 问题 |
|---|---|---|
| [WorkspacePage.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/pages/WorkspacePage.tsx) | L23-L50 | 顶层 28 个 `useState`，含 `droppedFiles` / `sourceDetailModalSource` / `sourceDetailModalHighlight` 等业务状态，应进 store |
| [useAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts) | L118-L287 | ViewModel 层混入：缓存读写（`incrementalEngine.cacheResults`）、增量决策（`isIncremental` 判断 L162-L172）、风险排序（`sortedRisks` L672-L693） |
| [AddSourceModal.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/modals/AddSourceModal.tsx) | L51-L62 | 12 个表单 useState，与 `useSourceStore` 已有同名字段重复 |
| 前端 SSE 调用 | 5 处 | `useAnalysis.ts:416` / `analysisApi.ts:60` / `chatApi.ts:132,201` / `analysisStreamService.ts:49` 直接 `fetch` 绕过 `apiClient` 统一层 |

### 重构方向

1. **`WorkspacePage` 状态收敛**：抽出 `useWorkspaceModals` hook 集中管理弹窗状态；`droppedFiles` / `sourceDetailModal*` 迁入 `useSourceStore`。
2. **`useAnalysis` 业务逻辑下沉**：缓存/增量/排序迁入 `selectors/` + 独立 hook，ViewModel 仅做编排。
3. **抽取 `streamClient`**：统一 SSE 流式请求，复用 `apiClient` 的 token/sessionId/重试/日志逻辑。

---

## 7. 端口与适配器架构 (Ports & Adapters)

### 端口定义情况

| 端口文件 | 行数 | 内容 |
|---|---|---|
| [aiCallPort.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiCallPort.ts) | 36 | `AICaller` / `ValidatingAICaller` / `AIResponse` / `ValidatedAIResult` |
| [aiPorts.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts) | 270 | `AIAnalysisPort` / `AIDraftPort` / `EmbeddingPort` / `RerankerPort` / `RetrievalOrchestratorPort` / `RetrievalPort`(deprecated) / `AIChatPort` |
| [repositories.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/repositories.ts) | 258 | 13 个 Repository 接口 + `PreferenceRepository` |

### 违规证据

| 类型 | 证据 |
|---|---|
| 领域层依赖具体框架 | [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) 直接 import `incrementalAnalysis.js` / `analysisCheckpointService.js` 等具体实现，未通过端口 |
| 基础设施层反向依赖领域 | [auth.ts:2](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/auth.ts#L2) |
| 适配器绕过端口 | [app.ts:3-7](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts#L3-L7) 直接实例化 adapter，未通过 `Ports` 抽象 |
| 领域规则注入到 prompt | [prompts/index.ts:71-74](file:///d:/developWorkPlaces/youju/youju-server/src/ai/prompts/index.ts#L71-L74) `{{RISK_RULES_SUMMARY}}` 占位符 —— **此为合理设计**（prompts 只负责表达，规则在 `domain/rules/riskRules.ts`），符合"AI 与业务解耦"约束 |

### 重构方向

1. **补全 `IncrementalAnalysisPort` / `CheckpointPort`**：在 `domain/ports/` 新增，`AnalysisService` 通过构造函数注入。
2. **`auth.ts` 仅保留 JWT 纯函数**：`wechatLoginMock` 移到 `domain/services/authService.ts`。
3. **Adapter 全部走 DI 容器**：`app.ts` 删除直接 import。

---

## 8. 纯函数与副作用隔离

### 副作用未隔离证据

| 位置 | 行号 | 问题 |
|---|---|---|
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | L143-L345 | 模块导入即执行 14 个 setter + 22 个 registerSingleton，双重副作用 |
| [db.ts](file:///d:/developWorkPlaces/youju/youju-server/src/data/db.ts) | L113-L117 | 模块顶层 `initSqliteSchema().catch(...)` 副作用 |
| [db.ts](file:///d:/developWorkPlaces/youju/youju-server/src/data/db.ts) | L121-L127 | 模块顶层 `process.on('beforeExit', ...)` 注册 |
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | L138, L174, L184, L205, L379, L386, L432, L448, L458, L474 | 10 处 `.then().catch()` fire-and-forget，未 await，错误仅 `console.error` |
| [sourceService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/sourceService.ts) | L34-L39 | `void chunkAndEmbed(source, ...).catch(...)` 异步副作用未追踪 |
| [analysisService.ts:analyzeWithStreaming](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | L110-L207 | 回调内嵌套 4 层 `.then().catch()`，副作用链难以追踪 |
| [useAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts) | L283-L284 | `finally { abortController.abort() }` 可能取消正在进行的 state 更新 |
| [apiClient.ts](file:///d:/developWorkPlaces/youju/youju-app/src/services/apiClient.ts) | L46-L61 | JWT 解析使用 `window.atob` 手写，副作用混入请求层（应使用 `jose` 库） |

### 重构方向

1. **`app.ts` 副作用收敛**：所有 register/setter 改为 `registerDependencies(container, driver)` 纯函数，`createApp` 末尾调用一次。
2. **`db.ts` 模块顶层副作用移除**：`initSqliteSchema` 改为 `await driver.init()` 由 `createApp` 调用；`process.on('beforeExit')` 移到 `index.ts`。
3. **fire-and-forget 改为可追踪**：`analysisService.ts` 中 10 处 `.then().catch()` 改为 `await` 或 `Result<T, E>` 返回；后台任务通过 `BackgroundTaskRunner` 统一管理。
4. **`apiClient.ts` 使用 `jose`**：与后端保持一致，避免手写 JWT 解析。

---

## 9. 原子设计 (Atomic Design)

### 层次划分

| 层次 | 路径 | 划分情况 |
|---|---|---|
| atoms | [components/ui/](file:///d:/developWorkPlaces/youju/youju-app/src/components/ui/) | ✅ button、dialog、popover、tabs、tooltip、accordion、command、dropdown-menu、skeleton、badge |
| molecules | [components/ui/](file:///d:/developWorkPlaces/youju/youju-app/src/components/ui/) | ⚠️ 混入：`RiskBadge`、`ConfidenceBar`、`EvidenceHighlight`、`ConflictCompareView`、`AnimatedCounter`、`MagneticButton`、`Marquee`、`SplitText` 应属 molecules |
| organisms | [components/workspace/](file:///d:/developWorkPlaces/youju/youju-app/src/components/workspace/) | ⚠️ 部分越级：`ResultPanel.tsx`（1036 行）混入 atoms 级 `RiskBadge` 渲染 |
| templates | 缺失 | ❌ 无 `templates/` 目录 |
| pages | [pages/](file:///d:/developWorkPlaces/youju/youju-app/src/pages/) | ✅ 但 `WorkspacePage.tsx` 顶层 28 个 useState |

### 越级依赖证据

- [PrintReport.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/print/PrintReport.tsx)（2434 行）：单文件包含 atoms（标签、徽章）+ molecules（风险卡片）+ organisms（报告区块）+ template（报告布局），无层次划分。
- [ResultPanel.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/workspace/ResultPanel.tsx)（1036 行）：直接渲染 `RiskBadge` / `ConfidenceBar` 等 atoms，未通过 molecules 组合。
- [SharePage.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/SharePage.tsx)（624 行）：放在 `components/` 顶层而非 `pages/`，且混入 atoms+molecules+organisms。

### 重构方向

1. **目录重组**：`components/ui/` 拆为 `components/atoms/`（基础元素）+ `components/molecules/`（业务组合）。
2. **新增 `components/templates/`**：`WorkspaceLayout` / `ReportLayout` / `LandingLayout` 提升为 templates。
3. **`PrintReport.tsx` 拆分**（见 §1）。
4. **`SharePage.tsx` 迁入 `pages/`**。

---

## 10. 组合优于继承 (Composition over Inheritance)

### 评估

- **继承极少**：仅 [aiPorts.ts:81](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts#L81) `CheckpointCapableAnalyzer extends Analyzer`、[aiPorts.ts:182](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts#L182) `RetrievalPort extends RerankerPort`（deprecated）。
- **组合为主**：所有 service 类通过构造函数注入依赖（`AnalysisService`、`TaskService`、`SourceService`、`ChatService` 等）。

### 违规

| 文件 | 行号 | 问题 |
|---|---|---|
| [aiPorts.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts) | L81 | `CheckpointCapableAnalyzer extends Analyzer`：强制不需要 checkpoint 的实现也提供 checkpoint 方法 |
| [aiPorts.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts) | L182 | `RetrievalPort extends RerankerPort`：deprecated 但仍存在 |

### 重构方向

1. **改为组合**：`AnalysisAdapter` 实现 `AIAnalyzer & AICheckpointHandler`（接口多继承允许），而非类继承。
2. **删除 deprecated `RetrievalPort`**。

---

## 11. 被动视图与展示模型 (Passive View / Presentation Model)

### 评估

- **存在 ViewModel 层**：[hooks/](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/) 目录，`useAnalysis` / `useAuth` / `useChat` / `useSources` / `useTasks` / `useWorkspaceHandlers`。
- **但 ViewModel 严重越权**：[useAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts) 881 行，承担业务逻辑而非仅做视图编排。

### 视图层越权证据

| 位置 | 问题 |
|---|---|
| [useAnalysis.ts:118-287](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts#L118-L287) | `analyzeMutation` 包含：缓存命中判断、增量分析决策、demo/真实流分发、结果合并、撤销状态快照 —— 应下沉到 service |
| [useAnalysis.ts:325-584](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts#L325-L584) | `streamAnalyze` 手写 SSE 解析器（`parseSSEEvents`）、超时计时器、3 次重试、AbortController —— SSE 解析应抽为纯函数 |
| [useAnalysis.ts:672-693](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts#L672-L693) | `sortedRisks` / `riskStatusCounts` / `pendingRisks` 派生选择器混入 hook —— 应迁入 `selectors/` |
| [useAnalysis.ts:733-746](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts#L733-L746) | `executeCancelAnalysis` + `canceledStateRef` 撤销机制 —— 应迁入 `useAnalysisCancellation` |

### 重构方向

1. **抽取纯函数模块**：`lib/sseStreamParser.ts`、`selectors/riskSelectors.ts`。
2. **拆分 hook**：`useIncrementalAnalysis` / `useAnalysisCancellation` / `useAnalysisStream`。
3. **业务逻辑下沉到 service**：前端新增 `services/analysisOrchestrator.ts`，承担缓存/增量决策，hook 仅做状态同步。

---

## 12. 语义化命名

### 模糊后缀违规

| 标识符 | 位置 | 问题 | 建议 |
|---|---|---|---|
| `analysisTaskManager` | [domain/services/analysisTaskManager.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisTaskManager.ts) | "Manager" 后缀模糊职责 | `AnalysisTaskQueue` 或 `AnalysisTaskScheduler` |
| `Tokens.AnalysisTaskManager` | [infrastructure/di/tokens.ts:44](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/tokens.ts#L44) | 同上 | 同上 |
| `errorHandler` | [presentation/middleware/errorHandler.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/middleware/errorHandler.ts) | 中间件命名，可接受 | - |
| `cronHandlers` | [infrastructure/cronHandlers.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/cronHandlers.ts) | "Handlers" 后缀模糊 | `CronJobs` 或 `ScheduledTasks` |
| `extractor` | [infrastructure/extractor.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/extractor.ts) | 命名不表达业务语义（抓取什么？） | `urlFetcher` 或 `UrlFetcher` |
| `backgroundJobs` | [infrastructure/backgroundJobs.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/backgroundJobs.ts) | 可接受 | - |
| `ApiLogPanel` / `ApiSettingsPanel` | [components/workspace/](file:///d:/developWorkPlaces/youju/youju-app/src/components/workspace/) | "Panel" 后缀泛滥 | 按职责命名：`ApiDebugConsole` / `ApiConfigForm` |
| `setXxxRepository` / `setXxxPort` / `setXxxServiceInstance` | 各 service 文件 | 兼容层 setter 命名重复 | 删除（见 §3 LSP 重构） |

### 重构方向

1. **`analysisTaskManager` → `AnalysisTaskScheduler`**：明确调度职责。
2. **`extractor` → `urlFetcher`**：明确 URL 抓取语义。
3. **`cronHandlers` → `ScheduledTasks`**。
4. **删除所有兼容层 setter**：消除 `setXxxRepository` / `setXxxPort` / `setXxxServiceInstance` 三件套。

---

## 13. 设计模式合理性

### 模式使用清单

| 模式 | 位置 | 评估 |
|---|---|---|
| 工厂 | [app.ts:createApp](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts)、`data/repositories/createXxxRepository`、[llm.ts:createModel](file:///d:/developWorkPlaces/youju/youju-server/src/ai/llm.ts#L35-L69) | ✅ 合理 |
| 策略 | [llm.ts:35-69](file:///d:/developWorkPlaces/youju/youju-server/src/ai/llm.ts#L35-L69) `createModel` 按 provider switch、[fileParser/index.ts:23-48](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/fileParser/index.ts#L23-L48) `parseFile` 按 fileType 路由、[prompts/index.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/prompts/index.ts) switch version | ⚠️ switch 实现违反 OCP，应改为注册表 |
| 观察者 | [pipeline/types.ts:75-86](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/types.ts#L75-L86) `PipelineCallbacks` 10 个回调 | ✅ 合理，但回调嵌套过深（见 §8） |
| 适配器 | [ai/adapters/](file:///d:/developWorkPlaces/youju/youju-server/src/ai/adapters/) 6 个 adapter | ✅ 合理 |
| 注册表 | [pipeline/registry.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/registry.ts) `StepRegistry`、[di/container.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/container.ts) `ServiceLocator` | ✅ 合理，但 `analysisAdapter` 未使用 `StepRegistry`（见 §2） |
| 服务定位器 | [di/serviceLocator.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/serviceLocator.ts) | ⚠️ 与 DI 容器并存，形成双轨制 |
| Repository | [data/repositories/](file:///d:/developWorkPlaces/youju/youju-server/src/data/repositories/) 15 个 + [domain/ports/repositories.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/repositories.ts) | ✅ 合理 |
| 状态机 | [pipeline/executor.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/executor.ts) `PipelineExecutor` 7 状态 | ✅ 合理 |
| Builder | [prompts/index.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/prompts/index.ts) `buildAnalysisUserPrompt` | ✅ 合理 |
| 命令 | [concurrencyLimiter.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/concurrencyLimiter.ts) `TaskQueue.run<T>(fn)` | ✅ 合理 |
| 模板方法 | [executor.ts:runSteps](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/executor.ts) 调用 `stepDef.execute` | ✅ 合理 |

### 过度设计 / 残缺设计

| 位置 | 问题 |
|---|---|
| [orchestrator.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/orchestrator.ts) | `@deprecated` 但仍存在，与 `PipelineExecutor` 重复 —— 死代码 |
| [aiPorts.ts:182](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts#L182) | `RetrievalPort extends RerankerPort` deprecated 但仍存在 —— 死代码 |
| [pipeline/types.ts:67-73](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/types.ts#L67-L73) | `PipelineStepDefinition.dependsOn` 字段暗示 DAG，但 `executor.ts` 当前为顺序执行 —— 字段残缺 |
| 双轨制兼容层 | 14 个 `setXxxInstance` + 22 个 `container.registerSingleton` 并存 —— 过度设计 |

### 重构方向

1. **删除死代码**：`orchestrator.ts`、deprecated `RetrievalPort`。
2. **`StepRegistry` 真正落地**：`analysisAdapter` 改用注册表。
3. **完成 DAG 或删除 `dependsOn`**：若实现 DAG，`executor` 改为拓扑排序；否则删除字段。
4. **淘汰服务定位器兼容层**：所有调用方走 DI 容器。

---

## 14. 可测试性

### 评估

- **测试覆盖**：后端 `tests/` 19 个测试文件，前端 `test/` 7 个测试文件。
- **领域规则可测试**：[domain/rules/](file:///d:/developWorkPlaces/youju/youju-server/src/domain/rules/) 为纯函数，可独立测试 ✅。
- **AI Pipeline 可测试**：[ai/pipeline/executor.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/executor.ts) 通过 `PipelineStepDefinition.execute` 注入步骤，可 mock ✅。

### 阻塞可测试性的问题

| 位置 | 问题 |
|---|---|
| [app.ts:143-345](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts#L143-L345) | 模块导入即执行 14 个 setter + 22 个 register，无法在测试中单独构造 service |
| [db.ts:113-127](file:///d:/developWorkPlaces/youju/youju-server/src/data/db.ts#L113-L127) | 模块顶层副作用（schema 初始化 + `process.on`），测试 import 即触发 |
| [auth.ts:2](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/auth.ts#L2) | 反向依赖 `userService`，无法脱离 DB 测试 JWT |
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) L32-L38 | 直接 import 函数，无法 mock `incrementalAnalysis` / `analysisCheckpointService` |
| [useAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts) | 881 行单 hook，业务逻辑混入，无法单元测试缓存/增量/排序逻辑 |
| [apiClient.ts:46-61](file:///d:/developWorkPlaces/youju/youju-app/src/services/apiClient.ts#L46-L61) | 手写 JWT 解析依赖 `window.atob`，无法在 Node 环境测试 |
| 14 个 service 的兼容层 setter | 双轨制导致测试需同时设置 DI 容器 + 调用 `setXxxInstance` |

### 重构方向

1. **`app.ts` 副作用收敛**（见 §8）：测试可单独构造 `AnalysisService` 而不触发全局装配。
2. **`db.ts` 副作用移除**（见 §8）：测试 import 不触发 schema 初始化。
3. **`auth.ts` 反向依赖修复**（见 §5）：JWT 纯函数可独立测试。
4. **service 间通过端口交互**（见 §5）：可 mock 端口进行单元测试。
5. **前端业务逻辑下沉**（见 §11）：纯函数模块可独立测试。

---

## 优先级排序与重构路线图

### P0：紧急（DIP 破窗，影响架构正确性）

1. **`infrastructure/auth.ts` 反向依赖修复**：新增 `UserCreationPort`，或将 `wechatLoginMock` 移到 `domain/services/authService.ts`。
2. **`presentation/routes/analysis.ts` 统一走 DI**：删除 `import * as analysisTaskManager` / `import * as preferenceService`。
3. **`AnalysisService` 通过端口注入 `IncrementalAnalysisPort` / `CheckpointPort`**。
4. **删除 `orchestrator.ts` 死代码**。

### P1：高优（上帝模块拆分）

1. **`PrintReport.tsx`（2434 行）按 Atomic Design 拆分**。
2. **`useAnalysis.ts`（881 行）拆分为 streamParser / incrementalStrategy / cancelController / selectors**。
3. **`useAnalysisStore.ts`（526 行）完成 5 个子 store 实际职责迁移**。
4. **`analysisService.ts`（625 行）拆出 `AnalysisStreamOrchestrator` / `AnalysisResultPersister`**。
5. **`ResultPanel.tsx`（1036 行）/ `SourcePanel.tsx`（837 行）按视图拆分**。
6. **抽取 `streamClient` 统一 SSE 流式请求**。
7. **`WorkspacePage` 28 个 useState 收敛**。

### P2：中优（双轨制收尾 + 命名清理）

1. **淘汰所有 service 的 `setXxxRepository` / `setXxxPort` / `setXxxServiceInstance` 兼容层**。
2. **`app.ts` 副作用收敛为 `registerDependencies(container, driver)` 纯函数**。
3. **`db.ts` 模块顶层副作用移除**。
4. **消除 8 处 `as unknown as` 强转 + `setEmbeddingPort(null)`**。
5. **删除 deprecated `RetrievalPort`**。
6. **命名规范化**：`analysisTaskManager` → `AnalysisTaskScheduler`、`extractor` → `urlFetcher`、`cronHandlers` → `ScheduledTasks`。
7. **`StepRegistry` 真正落地到 `analysisAdapter`**。
8. **`apiClient.ts` 使用 `jose` 库**。

### P3：低优（架构增强）

1. **`createModel` 改为 provider 注册表**。
2. **Repository 读写分离**。
3. **新增 `components/templates/` 层**。
4. **fire-and-forget 改为 `Result<T, E>` 返回**。

---

## 假设与决策

1. **假设**：项目仍处于过渡期重构中，双轨制兼容层是历史遗留，非新设计意图。
2. **假设**：`better-sqlite3` 与 Serverless 不兼容问题已知，待迁移 Turso/Neon（项目记忆标记）。
3. **决策**：本报告仅作评审，不修改任何代码。重构实施需用户确认优先级后另行执行。
4. **决策**：本报告写入新文件 `architecture-review-14-principles-v2.md`，不覆盖旧版 `architecture-review-14-principles.md`，便于对比。

---

## 验证步骤

实施任何重构后，应通过以下方式验证：

1. **类型检查**：`pnpm typecheck`（前后端均通过）
2. **测试**：`pnpm test`（19 + 7 个测试文件全部通过）
3. **Lint**：`pnpm lint`（Biome 无错误）
4. **构建**：`pnpm build`（前后端均成功）
5. **依赖方向验证**：用 `madge --circular` 检查循环依赖，用自定义脚本验证 `infrastructure/` 不依赖 `domain/`
6. **行数验证**：拆分后无文件超过 500 行（`find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20`）

---

## 关键文件路径索引

- **入口**：[youju-app/src/main.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/main.tsx)、[youju-server/src/index.ts](file:///d:/developWorkPlaces/youju/youju-server/src/index.ts)、[youju-server/src/app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts)
- **前端上帝模块**：[useAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts)、[useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts)、[PrintReport.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/print/PrintReport.tsx)、[ResultPanel.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/workspace/ResultPanel.tsx)、[SourcePanel.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/workspace/SourcePanel.tsx)
- **后端上帝模块**：[analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts)、[incrementalAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/incrementalAnalysis.ts)、[openapiSpec.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/docs/openapiSpec.ts)
- **DIP 违规核心**：[auth.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/auth.ts)、[routes/analysis.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/routes/analysis.ts)
- **端口定义**：[aiCallPort.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiCallPort.ts)、[aiPorts.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts)、[repositories.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/repositories.ts)
- **AI Pipeline**：[executor.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/executor.ts)、[registry.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/registry.ts)、[defaultSteps.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/defaultSteps.ts)、[types.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/types.ts)
- **DI 容器**：[container.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/container.ts)、[tokens.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/tokens.ts)、[serviceLocator.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/serviceLocator.ts)
