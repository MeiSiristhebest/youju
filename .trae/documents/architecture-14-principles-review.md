# 代码架构评审报告：14项设计原则全面审视

## 一、总体架构画像

Youju 项目采用前后端分离架构：
- **前端** (`youju-app/`): React + Vite + Zustand + TanStack Query，面向消费者的 AI 分析工作台
- **后端** (`youju-server/`): Express + TypeScript，采用领域驱动设计 (DDD) + 端口适配器 (Ports & Adapters) 风格，自研轻量 DI 容器

后端在分层架构上已有良好基础（domain/infrastructure/presentation/ai 分层清晰），但前端架构混乱，且后端在细节实现上仍存在多处原则违背。以下按原则逐一剖析。

---

## 二、单一职责原则 (SRP) — 多处严重违背

### 2.1 违背实例

#### A. 前端 `useAnalysisStore` — "上帝 Store"
**文件**: [useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts)

该文件定义了 `AnalysisCoreState`（核心业务状态）和 `AnalysisState`（合并后的庞大状态），并通过 `buildMergedState` 将 4 个独立 store（core/risk/dimension/draft）强行合并为一个"超级接口"。

**问题**: 
- `AnalysisState` 接口包含 50+ 个字段和 40+ 个方法，涵盖：分析结果、流状态、步骤控制、风险编辑、维度管理、草稿生成、调试面板...
- 任何只关心"风险列表"的组件都被迫依赖这个庞大接口
- `setState` 的实现使用 30+ 个 `if ('xxx' in update)` 分支，维护成本极高

**重构方向**:
```typescript
// 拆分为独立关注点的小 store，通过组合使用
const useAnalysisResultStore = create<...>() // 仅分析结果
const useAnalysisFlowStore = create<...>()   // 仅流式/步骤状态
const useRiskInteractionStore = create<...>() // 仅风险交互（选中、高亮、反馈）
// 在组件层按需组合，而非在 store 层强行合并
```

#### B. `AnalysisStreamOrchestrator` — 协调器与持久化耦合
**文件**: [analysisStreamOrchestrator.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisStreamOrchestrator.ts)

**问题**:
- 类名声明为"流式编排器"，但内部直接调用 `persister.persistStepStart/Complete/Error`
- 步骤回调中混杂了：流式事件转发 + 数据库持久化 + checkpoint 保存 + 错误日志
- `analyzeWithStreaming` 和 `analyzeSourcesStream` 两个方法 80% 代码重复

**重构方向**:
- 引入事件总线或观察者模式：Orchestrator 只负责编排步骤执行和触发事件
- 持久化逻辑移至独立的 `AnalysisEventSubscriber` 或 `AnalysisProjectionHandler`
- 将两个重复方法提取为统一的 `executeStream` 私有方法，差异通过配置参数化

#### C. `AnalysisAdapter.analyze()` 与 `resumeFromCheckpoint()` — 重复代码炸弹
**文件**: [analysisAdapter.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/adapters/analysisAdapter.ts)

两个方法各约 180 行，其中约 120 行完全重复（result 归一化、meta 注入、debugInfo 构建、reasoningTrace 富化）。

**重构方向**:
- 提取 `buildAnalysisResponse(finalState, options)` 纯函数，两个方法共用
- 遵循 DRY：所有数据转换逻辑集中在一处

#### D. `useAnalysisCore.ts` — 业务逻辑大杂烩
**文件**: [useAnalysisCore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysisCore.ts)

**问题**:
- 一个 hook 中混合了：缓存策略、增量分析判断、Demo 模式分支、流式分析调用、错误处理、分析日志、状态重置
- 直接依赖 `useModelConfigStore`, `useSourceStore`, `useAnalysisStore` 等全局状态
- `analyzeMutation` 的 `mutationFn` 长达 150+ 行，包含 10+ 个职责

**重构方向**:
- 拆分出独立的 `useAnalysisCache`, `useAnalysisFlow`, `useAnalysisExecution`
- 将 Demo/真实分析的分支判断提取为策略模式：`AnalysisStrategy` 接口 + `DemoAnalysisStrategy` / `RealAnalysisStrategy`
- 状态转换逻辑提取为纯函数：`createAnalysisFlowMachine()` 或 `reduceAnalysisState()`

---

## 三、开闭原则 (OCP) — 扩展需要修改源码

### 3.1 违背实例

#### A. `AnalysisAdapter` 的步骤处理硬编码
**文件**: [analysisAdapter.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/adapters/analysisAdapter.ts)

```typescript
const finalStep = finalState.steps.find((s) => s.id === 'step-final-output')
```

**问题**: 若新增一种输出步骤类型，必须修改 `AnalysisAdapter` 源码。

**重构方向**:
- 在 PipelineStep 注册时声明 `isTerminal: boolean`，适配器遍历查找终端步骤
- 或引入 `ResultExtractor` 端口，不同 pipeline 类型可注册不同的结果提取器

#### B. 前端 Demo 模式判断硬编码
**文件**: [useAnalysisCore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysisCore.ts)

```typescript
const finalResult = useDemoMode
  ? await runDemoAnalysis(...)
  : await streamAnalyze(...)
```

**问题**: 新增 Mock 模式需要修改该 hook。

**重构方向**:
```typescript
interface AnalysisExecutor {
  execute(params: ExecutionParams): Promise<AnalyzeResult>
}
// 通过 DI 或上下文注入
const executor = useDemoMode ? demoExecutor : realExecutor
const finalResult = await executor.execute(params)
```

#### C. `configureServices.ts` — 服务组装硬编码
**文件**: [configureServices.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/configureServices.ts)

所有服务的依赖注入通过 `new Service(...)` 硬编码完成。新增服务需要修改此文件。

**重构方向**:
- 引入装饰器或元数据驱动的自动注册（如 `@Injectable()`）
- 或按模块拆分配置：`configureAnalysisModule()`, `configureChatModule()`

---

## 四、里氏替换原则 (LSP) — 接口契约被削弱

### 4.1 违背实例

#### A. Repository 接口中的可选方法
**文件**: [repositories.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/repositories.ts)

```typescript
export interface AnalysisLogRepository {
  updateAnalysisLog?(id: string, data: Partial<AnalysisLog>): Promise<void>
}
```

**问题**: 可选方法破坏了接口契约。调用方无法确定实现是否支持该方法，运行时可能 `undefined`。

**重构方向**:
- 拆分为 `AnalysisLogRepository`（只读/核心）和 `MutableAnalysisLogRepository extends AnalysisLogRepository`
- 或移除可选标记，所有实现必须提供（即使抛出 `NotImplementedError`）

#### B. `useAnalysisStore` 的合并状态类型安全漏洞
**文件**: [useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts)

```typescript
export const useAnalysisStore: AnalysisStoreHook & {
  getState: () => AnalysisState
  // ...
} = Object.assign(...)
```

**问题**: `buildMergedState` 在运行时动态合并 4 个 store 的状态，TypeScript 类型无法保证运行时一致性。若某个子 store 增加字段，合并后的类型可能不同步。

**重构方向**:
- 放弃"超级 store"模式，组件显式订阅需要的子 store
- 或使用 Zustand 的 `combine` / `subscribeWithSelector` 确保类型安全

---

## 五、接口隔离原则 (ISP) — 胖接口问题

### 5.1 违背实例

#### A. `AnalysisState` — 强迫所有消费者依赖全部状态
**文件**: [useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts)

**问题**:
- `AnalysisDashboard` 只需要 `result`，但必须通过 `useAnalysisStore` 获取
- `RiskListView` 只需要风险相关状态，却可访问 draft、debug、streaming 等无关状态

**重构方向**:
```typescript
// 按关注点拆分接口
interface AnalysisResultState { result, setResult, ... }
interface AnalysisFlowState { analyzing, streaming, step, ... }
interface RiskInteractionState { selectedRisk, highlightedRisk, ... }

// 组件按需选择
const result = useAnalysisResultStore(s => s.result)
const { selectedRisk } = useRiskInteractionStore()
```

#### B. `StreamAnalysisCallbacks` 的重复定义
**文件**: 
- [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) 第 23-29 行
- [analysisCoreService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisCoreService.ts) 第 18-24 行
- [analysisStreamOrchestrator.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisStreamOrchestrator.ts) 第 12-18 行

**问题**: 三个文件定义了几乎相同的 `StreamAnalysisCallbacks` 接口，只是字段名略有差异（`index` vs `stepIndex`）。

**重构方向**:
- 在 `domain/types.ts` 或 `domain/ports/callbacks.ts` 中统一定义一次
- 使用 `Pick` / `Omit` 在需要时裁剪，而非重新定义

---

## 六、依赖倒置原则 (DIP) — 高层依赖具体实现

### 6.1 违背实例

#### A. 前端 API 层直接依赖全局 Store
**文件**: [analysisApi.ts](file:///d:/developWorkPlaces/youju/youju-app/src/services/analysisApi.ts)

```typescript
async analyze(params: AnalyzeParams): Promise<AnalyzeResult> {
  const aiConfig = useModelConfigStore.getState().getAIConfig()
  // ...
}
```

**问题**: `analysisApi` 作为"服务层"，直接依赖 `useModelConfigStore` 这个具体实现。单元测试时必须 mock 整个 Zustand store。

**重构方向**:
```typescript
// API 层只接收参数，不自行获取配置
async analyze(params: AnalyzeParams & { aiConfig: AIConfig }): Promise<AnalyzeResult> {
  // 仅负责网络请求
}
// 在 hook 层组装参数
const aiConfig = useModelConfigStore.getState().getAIConfig()
analysisApi.analyze({ ...params, aiConfig })
```

#### B. `ChatAdapter` 直接依赖基础设施
**文件**: [chatAdapter.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/adapters/chatAdapter.ts)

```typescript
const apiKey = options.aiConfig?.apiKey || getEnv().AI_API_KEY
const model = createLanguageModel(options.aiConfig as AIConfig)
```

**问题**: `ChatAdapter` 作为 AI 端口实现，直接调用 `getEnv()`（基础设施层）和 `createLanguageModel()`（具体工厂）。

**重构方向**:
- 将 `createLanguageModel` 作为构造参数注入：`constructor(private readonly modelFactory: ModelFactory)`
- 环境变量读取在 DI 配置阶段完成，适配器只接收配置对象

#### C. `configureServices.ts` 中的 `as unknown as` 类型转换
**文件**: [configureServices.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/configureServices.ts)

```typescript
const preferenceService = new PreferenceService(
  repos.preferenceRepository as unknown as PreferenceRepository,
)
```

**问题**: 类型系统被绕过，编译器无法发现接口不匹配问题。这是 DIP 的反面：本应通过接口契约确保正确性，却用类型断言破坏它。

**重构方向**:
- 确保 `RepositoryDependencies` 中的类型与端口接口完全一致
- 移除所有 `as unknown as`，让类型错误在编译期暴露

---

## 七、关注点分离 (Separation of Concerns) — 前端严重混层

### 7.1 违背实例

#### A. 前端 `useAnalysisCore.ts` — 视图/业务/数据访问三层耦合
**文件**: [useAnalysisCore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysisCore.ts)

职责混合表：

| 代码段 | 所属层次 | 问题 |
|--------|----------|------|
| `useMutation` + `setAnalyzing(true)` | 视图状态 | 不应在业务逻辑 hook 中 |
| `const cacheKey = generateCacheKey()` | 缓存策略 | 应与执行逻辑分离 |
| `useDemoMode ? runDemoAnalysis() : streamAnalyze()` | 执行策略 | 应通过策略模式注入 |
| `setResult(finalResult)` | 状态管理 | 应返回结果由调用方处理 |
| `addAnalysisLog({...})` | 日志/观测 | 应通过拦截器或副作用隔离 |

**重构方向**:
- 引入前端分层：
  - `services/` — 纯数据访问（API 调用）
  - `useCases/` — 业务逻辑（分析执行、缓存策略、增量判断）
  - `hooks/` — 视图适配（将 useCase 结果绑定到 React 状态）
- 参考后端的分层方式，前端建立对应层次

#### B. `analysis.ts` 路由 — 业务逻辑泄漏到表示层
**文件**: [analysis.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/routes/analysis.ts)

**问题**:
- 路由处理函数 200+ 行，包含：参数解析、source 查询、AI 配置回退逻辑、mock 判断、结果组装、错误处理
- `stream` 路由中直接操作 SSE 连接（`res.setHeader`, `res.write`, `heartbeatInterval`）
- 结果组装逻辑（`finalResult` 的构造）应在应用层完成

**重构方向**:
- 提取 `AnalysisRequestHandler` 应用服务，路由只负责：解析请求 → 调用服务 → 返回响应
- SSE 连接管理提取为 `SSEConnectionManager` 基础设施适配器
- 响应组装逻辑移至 `AnalysisResponseAssembler`

---

## 八、端口与适配器架构 (Ports & Adapters) — 后端基础良好，前端缺失

### 8.1 评估

**后端**: 
- ✅ `domain/ports/` 定义了清晰的 Repository / Service / AI 端口
- ✅ `ai/adapters/` 实现了 AI 端口的具体适配器
- ✅ `infrastructure/` 包含数据库、文件解析、认证等适配器
- ⚠️ 但 `getService()` 服务定位器模式在路由层使用，弱化了构造函数注入的优势

**前端**:
- ❌ 完全没有端口概念
- ❌ `services/` 目录直接包含 API 调用和 mock 数据
- ❌ 组件直接依赖 Zustand store（具体实现）

### 8.2 重构方向

**前端建立端口层**:
```typescript
// ports/analysisPort.ts
export interface AnalysisPort {
  analyze(params: AnalysisParams): Promise<AnalyzeResult>
  analyzeStream(params: AnalysisParams, callbacks: StreamCallbacks): Promise<void>
}

// adapters/httpAnalysisAdapter.ts
export class HttpAnalysisAdapter implements AnalysisPort { ... }

// adapters/demoAnalysisAdapter.ts  
export class DemoAnalysisAdapter implements AnalysisPort { ... }

// 在应用入口根据配置注入
const analysisPort = useDemoMode ? new DemoAnalysisAdapter() : new HttpAnalysisAdapter()
```

---

## 九、纯函数与副作用隔离 — 副作用散布各处

### 9.1 违背实例

#### A. `PipelineExecutor` — 状态突变 + I/O 混合
**文件**: [executor.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/executor.ts)

**问题**:
- `state` 被直接突变：`this.state.status = 'running'`
- `Date.now()` 散布在 10+ 处，难以测试时冻结时间
- `setTimeout` 硬编码在重试逻辑中
- 回调函数（`this.callbacks.onProgress`）的调用与状态更新交错

**重构方向**:
- 将状态更新提取为纯函数：`nextState = reducePipelineState(currentState, action)`
- 引入 `Clock` 端口：`interface Clock { now(): number }`，测试时使用 `FixedClock`
- 引入 `Delay` 端口：`interface Delay { wait(ms: number): Promise<void> }`
- 所有副作用通过端口隔离，核心逻辑变为纯函数

#### B. `AnalysisAdapter` 中的数据归一化与副作用混合
**文件**: [analysisAdapter.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/adapters/analysisAdapter.ts)

**问题**:
- `console.log('[AnalysisAdapter] onStepStart:', ...)` 与业务逻辑混合
- `Math.round()` 等纯计算与 I/O 回调交错

**重构方向**:
- 提取 `normalizeAnalysisResult(result, steps)` 纯函数
- 日志通过 `Logger` 端口注入，测试时使用 `NoopLogger`

---

## 十、原子设计 (Atomic Design) — 部分应用，不一致

### 10.1 评估

**文件结构**:
- ✅ `components/print/atoms/`, `molecules/`, `organisms/` — 唯一遵循原子设计的目录
- ❌ `components/ui/` — 混合了原子组件（`button.tsx`）和复杂组件（`ConflictCompareView.tsx`）
- ❌ `components/workspace/` — 50+ 个组件平铺，无层次划分
- ❌ `components/chat/` — 平铺结构

### 10.2 重构方向

统一应用原子设计到全部组件：
```
components/
  atoms/          # Button, Input, Badge, Tag（纯样式，无业务逻辑）
  molecules/      # SearchBar, FilterGroup, RiskCard（组合原子）
  organisms/      # SourcePanel, ResultPanel, ChatPanel（业务组件）
  templates/      # WorkspaceTemplate, LandingTemplate（布局骨架）
  pages/          # HomePage, WorkspacePage（页面级组合）
```

当前 `templates/` 目录已存在但内容不符（`AuthTemplate` 等实际上是页面级布局，但位置正确）。

---

## 十一、组合优于继承 — 整体良好，局部问题

### 11.1 评估

- ✅ 后端服务层普遍使用组合（构造函数注入）
- ✅ React 组件自然使用组合
- ⚠️ `useAnalysis.ts` 使用 spread 组合多个 hook，但存在命名冲突风险

### 11.2 重构建议

```typescript
// 当前：通过 spread 组合，可能产生命名冲突
export const useAnalysis = (sources: Source[]) => {
  const core = useAnalysisCore(sources)
  const dimensions = useAnalysisDimensions()
  return { ...core, ...dimensions } // 若两者有同名属性，后者覆盖前者
}

// 推荐：显式命名空间
export const useAnalysis = (sources: Source[]) => {
  const core = useAnalysisCore(sources)
  const dimensions = useAnalysisDimensions()
  return {
    core: { result: core.result, analyze: core.analyze },
    dimensions: { dimensions: dimensions.dimensions, setDimensions: dimensions.setDimensions },
  }
}
```

---

## 十二、被动视图与展示模型 — 前端组件承担过多逻辑

### 12.1 违背实例

#### A. `AnalysisDashboard` — 视图层包含复杂计算
**文件**: [AnalysisDashboard.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/components/workspace/AnalysisDashboard.tsx)

**问题**:
- `useMemo` 中 80+ 行的计算逻辑：风险统计、步骤耗时、类型分布、时间格式化
- 这些计算是"展示模型"的职责，应在独立的 `AnalysisDashboardViewModel` 中完成
- 组件应只接收已计算好的 `dashboardData` 并渲染

**重构方向**:
```typescript
// viewModels/useAnalysisDashboardViewModel.ts
export function useAnalysisDashboardViewModel(result: AnalyzeResult) {
  return useMemo(() => ({
    metrics: computeMetrics(result),
    riskTypes: computeRiskDistribution(result),
    stepTimings: computeStepTimings(result),
  }), [result])
}

// AnalysisDashboard.tsx
export function AnalysisDashboard({ result }: Props) {
  const data = useAnalysisDashboardViewModel(result)
  // 仅负责渲染
}
```

#### B. `useAnalysisCore.ts` — 业务逻辑与 UI 状态纠缠
**文件**: [useAnalysisCore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysisCore.ts)

**问题**:
- `setAnalysisStep()`, `setStreaming()`, `addAnalysisLog()` 等 UI 状态更新与业务逻辑（调用 API、处理结果）混合
- 业务逻辑应返回状态变化描述，由上层决定如何更新 UI

**重构方向**:
- 引入状态机：`AnalysisFlowMachine` 管理分析流程的转换
- 或使用 Redux-style：业务逻辑生成 `Action`，由 reducer 更新状态

---

## 十三、语义化命名 — 存在模糊命名

### 13.1 违背实例

#### A. `handler` 后缀泛滥
- `analyzeStreamHandler` — 实际上是 Express 路由处理函数，应命名为 `handleStreamAnalysisRequest`
- `errorHandler.ts` — 文件名合理，但内部导出 `handleApiError`，存在重复

#### B. `analysisAdapter.ts` 中的模糊变量
```typescript
const { result: rawResult, steps: stepSummaries, totalTokens, isMock } = aiResult
```
- `aiResult` — 不说明是什么结果
- `rawResult` — "原始"是相对于什么？语义不清

#### C. `useAnalysisCore.ts` 中的 `analyzeMutation`
- `analyzeMutation` — 这是 TanStack Query 的术语泄漏，业务上应叫 `executeAnalysis`

#### D. 存在 `Data` / `Info` 等模糊后缀
- `demoData.ts` — 合理（常量文件）
- `debugInfo` — 作为字段名可以接受
- 但 `AIRawOutput` 中的 `raw_output` 映射为 `rawOutput` 略显冗余

### 13.2 重构方向

- 使用业务动词命名：`executeAnalysis`, `resumePipeline`, `persistStepEvent`
- 避免 `handler/manager/data` 等后缀，改用具体职责：`RequestProcessor`, `EventPersister`, `ScenarioPresets`

---

## 十四、设计模式合理性 — 部分过度设计，部分缺失

### 14.1 评估

| 模式 | 应用位置 | 评价 |
|------|----------|------|
| 依赖注入 | 后端 DI 容器 | ✅ 轻量自研，基本够用 |
| 端口适配器 | 后端 ai/adapters/ | ✅ 合理使用 |
| 管道 (Pipeline) | PipelineExecutor | ✅ 适合 AI 步骤执行 |
| 观察者 | callbacks 模式 | ⚠️ 够用但无法取消订阅 |
| 策略模式 | 缺失 | ❌ Demo/真实分析应使用策略模式 |
| 工厂模式 | createModel | ⚠️ 简单工厂，可扩展为注册表 |
| 装饰器 | 缺失 | ❌ 日志、缓存、重试应使用装饰器 |
| 状态机 | 缺失 | ❌ 分析流程应使用状态机 |

### 14.2 重构方向

#### A. 引入装饰器模式封装横切关注点
```typescript
// 当前：缓存逻辑直接写在 AnalysisService 中
const useCache = this.cacheService.shouldUseCache(options)

// 推荐：通过装饰器附加缓存
@Cached('analysis', { ttl: 30 * 60 * 1000 })
async analyzeSources(...): Promise<AnalyzeResult> { ... }
```

#### B. 分析流程使用状态机
```typescript
type AnalysisState = 
  | { status: 'idle' }
  | { status: 'preparing'; sources: Source[] }
  | { status: 'analyzing'; step: number }
  | { status: 'completed'; result: AnalyzeResult }
  | { status: 'failed'; error: Error }
  | { status: 'cancelled' }

// 状态转换为纯函数
function transition(state: AnalysisState, event: AnalysisEvent): AnalysisState { ... }
```

---

## 十五、可测试性 — 领域层可测，前端困难

### 15.1 评估

**后端**:
- ✅ 领域服务通过端口注入依赖，可 mock
- ✅ `PipelineExecutor` 虽然副作用多，但状态可访问
- ⚠️ 但 `AnalysisAdapter` 直接 `new PipelineExecutor()`，无法注入 mock executor
- ⚠️ `getService()` 服务定位器使单元测试需要初始化整个 DI 容器

**前端**:
- ❌ `useAnalysisCore.ts` 直接依赖全局 store，无法脱离 React 测试
- ❌ `analysisApi.ts` 直接调用 `useModelConfigStore.getState()`
- ❌ `AnalysisDashboard.tsx` 的计算逻辑与渲染耦合，难以单独测试计算
- ⚠️ 现有测试文件少且简单（`test/` 目录下仅 10+ 个测试）

### 15.2 重构方向

#### A. 后端：允许注入测试替身
```typescript
export class AnalysisAdapter implements AIAnalysisPort {
  constructor(
    private readonly executorFactory: () => PipelineExecutor = () => 
      new PipelineExecutor(defaultStepRegistry.getAll())
  ) {}
}
```

#### B. 前端：提取纯逻辑到测试友好的模块
```typescript
// lib/analysis/analysisOrchestrator.ts — 纯 TS，不依赖 React
export async function executeAnalysis(
  params: ExecutionParams,
  deps: { api: AnalysisApi; cache: AnalysisCache }
): Promise<ExecutionResult> { ... }

// hooks/useAnalysisCore.ts — 薄层，仅绑定 React
export function useAnalysisCore(sources: Source[]) {
  const api = useAnalysisApi() // 通过 context 注入
  return useMutation({
    mutationFn: (params) => executeAnalysis(params, { api, cache })
  })
}
```

---

## 十六、优先级排序的重构路线图

### P0 — 立即修复（阻止性/高风险）

1. **拆分 `useAnalysisStore`** — 前端状态管理的根因问题
2. **消除 `AnalysisAdapter` 的代码重复** — 维护成本最高的技术债
3. **移除 `as unknown as` 类型断言** — 类型安全的定时炸弹
4. **前端 API 层解耦全局 Store** — 阻断可测试性

### P1 — 短期优化（1-2 周）

5. **引入前端分层架构** — 建立 ports / adapters / useCases 目录
6. **提取 `AnalysisDashboard` 的计算逻辑** — 被动视图改造
7. **`AnalysisStreamOrchestrator` 解耦持久化** — SRP 修复
8. **统一回调接口定义** — ISP 修复
9. **Demo/真实分析策略模式化** — OCP 修复

### P2 — 中期重构（1 个月）

10. **PipelineExecutor 纯函数化** — 副作用隔离
11. **路由层业务逻辑提取** — 关注点分离
12. **原子设计全面落地** — 组件目录重构
13. **状态机管理分析流程** — 设计模式引入

### P3 — 长期演进

14. **装饰器模式封装缓存/日志/重试**
15. **前端测试覆盖率提升到 70%+**
16. **引入事件溯源或 CQRS**（若业务复杂度继续增长）

---

## 十七、总结

Youju 后端在**端口适配器架构**和**领域分层**上已有良好基础，但在**细节实现**上存在 SRP 违背、代码重复、类型安全漏洞等问题。前端则是**系统性架构缺失**：没有清晰的分层、状态管理混乱、业务逻辑与 UI 深度耦合、完全不可单元测试。

最核心的建议是：**前端建立与后端对称的分层架构**。后端有 `domain/ports` → `ai/adapters` → `infrastructure`，前端应建立对应的 `domain/` → `services/adapters` → `stores/infrastructure`，将业务逻辑从 React hooks 中解放出来，使其成为可独立测试的纯 TypeScript 模块。
