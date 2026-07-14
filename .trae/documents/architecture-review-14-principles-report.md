# 代码架构评审报告：14条核心原则分析

## 项目概览

这是一个 AI 驱动的跨源信息验证与风险分析平台，采用前后端分离架构：
- **前端**：React + Vite + Zustand + React Query
- **后端**：Node.js + Express + TypeScript，采用 Ports & Adapters 架构
- **AI 管道**：7步独立执行的分析流水线

---

## 1. 单一职责原则 (SRP)

### ✅ 符合之处
- **后端领域服务分层清晰**：`analysisService.ts`、`analysisStreamOrchestrator.ts`、`analysisCheckpointService.ts` 职责明确分离
- **Repository 接口分离**：`repositories.ts` 中每个 Repository 接口只定义单一聚合根的读写操作
- **Pipeline 步骤独立**：每个步骤（如 `step-scenario-discovery`、`step-input-parsing`）只负责一个分析环节

### ❌ 违背之处

**问题1：`useAnalysisStore.ts` 状态膨胀**
- 文件564行，包含分析状态、维度管理、风险管理、草稿状态、调试状态等多个职责
- 风险状态、维度状态、草稿状态、分析步骤状态混合在一起
- 重构方向：按职责拆分为 `useAnalysisCoreStore`、`useRiskStore`、`useDimensionStore`、`useDraftStore`

**问题2：`configureContainer.ts` 职责过重**
- 文件438行，包含所有依赖的注册和配置
- 重构方向：按模块拆分配置函数（`configureRepositories`、`configureServices`、`configureAdapters`）

**问题3：`analysis.ts` 路由处理逻辑过多**
- `/analyze/stream` 路由处理了 SSE 事件发送、日志创建、偏好排序等多个职责
- 重构方向：提取 SSE 事件处理器、结果后处理器为独立模块

---

## 2. 开闭原则 (OCP)

### ✅ 符合之处
- **AI 管道步骤可扩展**：`PipelineExecutor` 通过 `stepDefinitions` 参数支持动态添加步骤
- **模型提供者可扩展**：`llmProviderRegistry`、`embeddingProviderRegistry` 支持注册新提供者
- **端口接口定义明确**：`AIAnalysisPort`、`AIDraftPort` 等接口支持不同实现

### ❌ 违背之处

**问题1：硬编码的步骤列表**
```typescript
// analysisService.ts L78-L86
private static readonly PIPELINE_STEPS = [
  { id: 'step-scenario-discovery', name: '场景发现' },
  // ...
]
```
- 步骤定义硬编码在 `AnalysisService` 中，新增步骤需要修改核心服务代码
- 重构方向：通过配置或注册机制动态加载步骤

**问题2：`AnalysisAdapter` 依赖具体实现**
- `AnalysisAdapter` 直接依赖 `defaultStepRegistry.getAll()`，无法灵活替换步骤集
- 重构方向：通过构造函数注入步骤注册表

**问题3：前端 `useAnalysisCore.ts` 中的 Demo 模式分支**
```typescript
const finalResult = useDemoMode
  ? await runDemoAnalysis(...)
  : await streamAnalyze(...)
```
- 业务逻辑中包含模式判断分支，新增模式需要修改 hook
- 重构方向：策略模式，通过配置选择分析策略

---

## 3. 里氏替换原则 (LSP)

### ✅ 符合之处
- **Repository 接口继承结构合理**：`AnalysisLogRepository extends AnalysisLogReadRepository, AnalysisLogWriteRepository`
- **Port 接口实现一致性**：`AnalysisAdapter`、`ChatAdapter` 等适配器都正确实现了对应的 Port 接口

### ❌ 违背之处

**问题1：Repository 接口实现类型不匹配**
```typescript
// configureContainer.ts L156
const userRepository = createUserRepository(driver) as unknown as UserRepository
```
- 多处使用 `as unknown as` 强制类型转换，掩盖了接口实现的不一致
- 重构方向：统一接口定义与实现，消除强制类型转换

**问题2：`AIStepOutput` 类型定义模糊**
- `step.output.data` 被断言为多种类型，缺乏类型安全
- 重构方向：为每个步骤定义具体的输出类型

---

## 4. 接口隔离原则 (ISP)

### ✅ 符合之处
- **Repository 接口读写分离**：`AnalysisLogReadRepository` 和 `AnalysisLogWriteRepository` 分离为独立接口
- **Service Ports 定义精细**：`AnalysisCheckpointPort`、`IncrementalAnalysisPort` 等端口职责单一

### ❌ 违背之处

**问题1：`AnalysisService` 构造函数参数过多**
```typescript
constructor(
  readonly analysisPort: AIAnalysisPort,
  private readonly draftPort: AIDraftPort,
  readonly analysisLogRepo: AnalysisLogRepository,
  readonly analysisStepRepo: AnalysisStepRepository,
  readonly taskResultRepo: TaskResultRepository,
  readonly scenarioKnowledgeRepo: ScenarioKnowledgeRepository,
  private readonly incrementalPort: IncrementalAnalysisPort,
  private readonly checkpointPort: AnalysisCheckpointPort,
  private readonly analysisCache: AnalysisCache,
  private readonly modeChecker: ModeCheckerPort,
)
```
- 10个依赖参数，客户端被迫依赖不需要的接口
- 重构方向：提取子服务（`AnalysisCoreService`、`AnalysisPersistenceService`、`AnalysisCacheService`）

**问题2：`StreamAnalysisCallbacks` 接口过于宽泛**
- 所有回调方法可选，但调用方需要了解完整接口定义
- 重构方向：按使用场景拆分为 `StepEventCallbacks`、`CompletionCallbacks`

---

## 5. 依赖倒置原则 (DIP)

### ✅ 符合之处
- **领域层依赖端口而非实现**：`AnalysisService` 依赖 `AIAnalysisPort`、`AnalysisLogRepository` 等抽象接口
- **DI 容器解耦**：`configureContainer.ts` 集中配置依赖关系，领域层不依赖具体实现

### ❌ 违背之处

**问题1：`AnalysisAdapter` 在构造函数中调用 `registerDefaultSteps()`**
```typescript
constructor() {
  registerDefaultSteps()
}
```
- 适配器初始化时产生副作用，违反依赖倒置
- 重构方向：通过依赖注入提供已注册的步骤

**问题2：`configureContainer.ts` 中直接实例化服务**
```typescript
const analysisService = new AnalysisService(
  analysisAdapter,
  draftAdapter,
  // ...
)
```
- 服务实例化与依赖配置耦合，难以测试和替换
- 重构方向：使用工厂模式或依赖注入容器的延迟初始化

**问题3：前端 `analysisApi.ts` 直接访问 Store**
```typescript
const aiConfig = useModelConfigStore.getState().getAIConfig()
```
- API 层依赖状态管理层，违反依赖倒置
- 重构方向：通过参数注入配置，使 API 层无状态

---

## 6. 关注点分离 (Separation of Concerns)

### ✅ 符合之处
- **后端分层清晰**：Presentation（路由）→ Domain（服务/规则）→ Infrastructure（适配器/存储）
- **前端层分离**：UI（组件）→ Hooks（业务逻辑）→ Stores（状态管理）→ Services（API）

### ❌ 违背之处

**问题1：`useAnalysisCore.ts` 混合了业务逻辑和状态管理**
- 同时调用 `useAnalysisStore` 的 setter 和处理业务逻辑
- 重构方向：分离 ViewModel（纯业务逻辑）和 State Management

**问题2：`AnalysisStreamOrchestrator` 混合了业务编排和持久化**
- 同时负责步骤回调和数据库持久化
- 重构方向：持久化逻辑委托给 `AnalysisResultPersister`，Orchestrator 只负责流程编排

**问题3：路由层包含业务逻辑**
```typescript
// analysis.ts L114-L115
const riskWeights = await getPreferenceService().getUserRiskWeights(userId, sessionId)
const sortedRisks = getPreferenceService().sortRisksByPreference(result.risks, riskWeights)
```
- 风险排序属于业务逻辑，不应在路由层处理
- 重构方向：在 `AnalysisService` 中封装结果后处理逻辑

---

## 7. 端口与适配器架构 (Ports & Adapters)

### ✅ 符合之处
- **端口定义清晰**：`domain/ports/` 目录包含 `repositories.ts`、`servicePorts.ts`、`aiPorts.ts`、`infrastructurePorts.ts`
- **适配器实现完整**：`ai/adapters/` 目录包含 `analysisAdapter.ts`、`chatAdapter.ts`、`draftAdapter.ts`

### ❌ 违背之处

**问题1：`AnalysisService` 直接依赖 `AnalysisResultPersister` 和 `AnalysisStreamOrchestrator`**
```typescript
this.persister = new AnalysisResultPersister(...)
this.orchestrator = new AnalysisStreamOrchestrator(analysisPort, this.persister)
```
- 直接实例化而非通过端口依赖，违反 Ports & Adapters 原则
- 重构方向：定义 `AnalysisPersisterPort` 和 `AnalysisOrchestratorPort`，通过构造函数注入

**问题2：`AnalysisCheckpointService` 依赖具体的 `AIAnalysisPort`**
- 应该依赖抽象端口而非具体适配器
- 重构方向：通过 DI 容器注入端口实现

**问题3：领域层直接引用基础设施**
```typescript
// analysisService.ts L195
const { SCENARIO_PRESETS } = await import('../scenarioPresets.js')
```
- 动态导入基础设施文件，违反分层隔离
- 重构方向：通过 `ScenarioPresetPort` 抽象场景预设加载

---

## 8. 纯函数与副作用隔离

### ✅ 符合之处
- **规则层纯函数**：`analysisRules.ts` 中的 `computeSourceDiff`、`mergeAnalyzeResults` 等函数无副作用
- **Pipeline 步骤隔离**：每个步骤通过 `StepInput`/`StepOutput` 明确边界

### ❌ 违背之处

**问题1：`AnalysisService.analyzeWithStreaming` 中的 `console.log`**
- 领域服务中直接包含日志副作用
- 重构方向：通过 `ObservabilityService` 或回调处理日志

**问题2：`AnalysisStreamOrchestrator` 中的异步持久化**
```typescript
this.persister.persistStepStart(...).catch(...)
```
- 异步操作未等待完成，产生隐藏副作用
- 重构方向：使用 Promise.all 或确保持久化完成后再继续

**问题3：前端 `useAnalysisCore.ts` 中的状态修改混杂**
- `mutate` 函数中多次调用 `setXxx`，副作用分散
- 重构方向：提取状态更新逻辑为纯函数，统一调用

---

## 9. 原子设计 (Atomic Design)

### ✅ 符合之处
- **Print 组件层次清晰**：`atoms/`（`PrintRiskBadge`）→ `molecules/`（`PrintRiskCard`）→ `organisms/`（`StandardReport`）

### ❌ 违背之处

**问题1：`workspace/` 组件层级混乱**
- `WorkspacePage`（页面级）直接引用大量子组件，缺乏分子/有机体层次
- 重构方向：按原子设计原则重组为 `molecules/`（`AnalysisControlBar`）和 `organisms/`（`AnalysisWorkspace`）

**问题2：`ui/` 组件混合原子和分子**
- `button.tsx`、`badge.tsx`（原子）与 `ConflictCompareView.tsx`（分子）混在一起
- 重构方向：按原子设计层次组织 `ui/` 目录

**问题3：`results/` 组件缺乏层次**
- 直接在 `results/` 下放置多个组件，无层次结构
- 重构方向：按功能分组为分子组件

---

## 10. 组合优于继承 (Composition over Inheritance)

### ✅ 符合之处
- **服务组合**：`AnalysisService` 通过组合 `AnalysisStreamOrchestrator`、`AnalysisResultPersister` 实现功能
- **管道步骤组合**：`PipelineExecutor` 通过组合步骤定义实现流程

### ❌ 违背之处

**问题1：Repository 接口多重继承**
```typescript
export interface AnalysisLogRepository
  extends AnalysisLogReadRepository,
    AnalysisLogWriteRepository {}
```
- 接口继承虽然灵活，但使用时可能引入不需要的方法
- 重构方向：使用组合模式，按需注入 Read/Write 接口

**问题2：`useAnalysis.ts` 简单合并多个 hook**
```typescript
export const useAnalysis = (sources: Source[]) => {
  const core = useAnalysisCore(sources)
  const dimensions = useAnalysisDimensions()
  const risk = useAnalysisRisk()
  const ui = useAnalysisUI()
  return { ...core, ...dimensions, ...risk, ...ui }
}
```
- 简单展开合并，缺乏组合语义
- 重构方向：定义明确的组合接口，提供结构化访问

---

## 11. 被动视图与展示模型 (Passive View / Presentation Model)

### ✅ 符合之处
- **`WorkspacePage` 无业务逻辑**：所有逻辑委托给 `useWorkspaceHandlers` 和状态管理
- **UI 组件纯展示**：`ui/` 目录下的组件只负责渲染，无业务逻辑

### ❌ 违背之处

**问题1：`useWorkspaceHandlers.ts` 混合事件处理和业务逻辑**
- 需要查看具体内容，但从 `WorkspacePage` 的使用方式看，handlers 包含业务决策逻辑

**问题2：`WorkspaceModals` 包含业务回调**
- 模态框组件直接接收 `onAddSource`、`onFeedback` 等业务回调
- 重构方向：使用 Presenter 模式，组件只负责事件委托

**问题3：`WorkspacePage` 包含大量状态定义**
- 25+ 个 useState 定义，视图层承担过多状态管理职责
- 重构方向：将状态提升到 Store 或 ViewModel

---

## 12. 语义化命名

### ✅ 符合之处
- **Repository 命名清晰**：`AnalysisLogRepository`、`SourceRepository` 等准确表达业务语义
- **Pipeline 步骤命名语义化**：`step-scenario-discovery`、`step-discrepancy-detection`

### ❌ 违背之处

**问题1：`Service` 后缀过于模糊**
- `AnalysisService`、`ChatService`、`SourceService` 等命名缺乏具体语义
- 重构方向：使用更具体的名称，如 `AnalysisCoordinator`、`ChatManager` → `ConversationManager`

**问题2：`Adapter` 命名缺乏上下文**
- `analysisAdapter`、`chatAdapter` 未说明适配的目标接口
- 重构方向：`AIAnalysisAdapter`、`AIChatAdapter`

**问题3：`useAnalysisCore`、`useAnalysisUI` 命名模糊**
- "Core" 和 "UI" 缺乏具体含义
- 重构方向：`useAnalysisExecution`、`useAnalysisViewState`

**问题4：`utils.ts` 通用命名**
- 全局工具文件命名过于通用，难以定位功能
- 重构方向：按功能拆分，如 `riskUtils.ts`、`dateUtils.ts`

---

## 13. 设计模式合理性

### ✅ 符合之处
- **策略模式**：`llmProviderRegistry` 支持不同模型提供者策略
- **观察者模式**：`PipelineExecutor` 的 callbacks 机制
- **工厂模式**：`configureContainer.ts` 中的服务创建
- **适配器模式**：`AnalysisAdapter`、`ChatAdapter` 等

### ❌ 违背之处

**问题1：Service Locator 模式滥用**
```typescript
// analysis.ts L19-L21
function getAnalysisService(): AnalysisService {
  return getService<AnalysisService>(Tokens.AnalysisService)
}
```
- 路由层大量使用 Service Locator，隐藏依赖关系
- 重构方向：使用依赖注入，通过构造函数注入服务

**问题2：缺少策略模式的接口抽象**
- `PipelineExecutor` 的步骤执行逻辑固定，无法动态切换策略
- 重构方向：定义 `StepExecutionStrategy` 接口，支持不同执行策略

**问题3：过度设计的回调机制**
- `StreamAnalysisCallbacks` 包含5种回调类型，实际使用中很多未被充分利用
- 重构方向：简化回调接口，使用事件总线或发布/订阅模式

---

## 14. 可测试性

### ✅ 符合之处
- **规则层可测试**：`analysisRules.ts` 中的纯函数易于单元测试
- **Pipeline 可测试**：`pipeline.test.ts` 测试了管道执行逻辑
- **Repository 接口可 Mock**：通过端口接口可以轻松替换实现

### ❌ 违背之处

**问题1：`AnalysisService` 难以单元测试**
- 构造函数依赖10个参数，测试设置复杂
- 重构方向：使用依赖注入容器或 Mock 工厂

**问题2：`configureContainer.ts` 无法独立测试**
- 依赖数据库驱动，难以在无数据库环境测试
- 重构方向：提取纯配置逻辑，与基础设施解耦

**问题3：前端 `useAnalysisCore.ts` 难以测试**
- 依赖多个 Store 和 Hook，测试环境复杂
- 重构方向：提取纯业务逻辑函数，独立测试

**问题4：`AnalysisStreamOrchestrator` 异步逻辑难以测试**
- 异步持久化操作未等待完成，难以验证
- 重构方向：使用 Promise.all 确保异步操作可追踪

---

## 重构优先级建议

| 优先级 | 问题 | 影响范围 | 复杂度 |
|--------|------|----------|--------|
| **P0** | `useAnalysisStore` 状态膨胀 | 前端核心状态管理 | 高 |
| **P0** | `AnalysisService` 构造函数参数过多 | 后端核心服务 | 高 |
| **P1** | `configureContainer` 职责过重 | 后端 DI 配置 | 中 |
| **P1** | 路由层业务逻辑 | 后端 API 层 | 中 |
| **P2** | 原子设计层次混乱 | 前端组件结构 | 中 |
| **P2** | Service Locator 滥用 | 后端路由层 | 低 |
| **P3** | 语义化命名改进 | 全项目 | 低 |
| **P3** | 副作用隔离 | 领域层 | 中 |

---

## 总结

该代码库在 **Ports & Adapters 架构**、**单一职责原则**（部分）、**设计模式应用**（部分）方面表现良好，但在以下方面存在明显改进空间：

1. **状态管理拆分**：前端 Store 过度膨胀，需要按职责拆分
2. **依赖注入改进**：减少 Service Locator 使用，改进构造函数参数过多问题
3. **分层边界强化**：路由层不应包含业务逻辑，领域层不应直接引用基础设施
4. **可测试性提升**：核心服务的测试复杂度需要降低
5. **原子设计完善**：组件层次需要按原子设计原则重组

建议优先处理 P0 和 P1 级别的问题，这些问题直接影响代码的可维护性和可扩展性。