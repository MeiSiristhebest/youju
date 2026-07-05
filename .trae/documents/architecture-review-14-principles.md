# 架构审查报告：依据14项设计原则

## 项目概述

本项目是一个 AI 驱动的材料分析系统，包含前端 (`youju-app`) 和后端 (`youju-server`)。后端采用分层架构，前端使用 React + Zustand。项目正处于重构过渡期，混合了类模式与模块级函数模式。

---

## 1. 单一职责原则 (SRP)

### 严重违规

| 文件 | 问题描述 | 影响 |
|------|----------|------|
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | 892行，同时承担：分析执行、日志记录、缓存管理、Checkpoint管理、增量分析、草稿生成。类与模块级函数双重实现，存在大量委托代码 | 难以维护、测试困难、变更风险高 |
| [step-scenario-discovery.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/steps/step-scenario-discovery.ts) | 同时处理：AI调用、结果缓存、步骤执行、JSON解析、Mock降级 | 职责混乱，难以独立测试 |

### 轻微违规

| 文件 | 问题描述 |
|------|----------|
| [useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts) | 526行，包含50+个action，涵盖分析状态、维度管理、风险状态、缓存管理、编辑历史等 |

### 重构方向

- **拆分 analysisService**：将缓存逻辑、日志逻辑、增量分析分别拆分为独立模块
- **拆分 step-scenario-discovery**：将AI调用与步骤执行分离，AI调用结果通过参数传递而非全局状态
- **拆分 Zustand Store**：按功能域拆分多个Store（analysis、dimensions、risks）

---

## 2. 开闭原则 (OCP)

### 违规

| 文件 | 问题描述 |
|------|----------|
| [analysisAdapter.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/adapters/analysisAdapter.ts) | `STEP_DEFINITIONS` 硬编码在类内部，新增步骤需修改适配器代码 |
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | AI端口实现和服务注册硬编码，新增模型或服务需修改装配代码 |
| [analysisRules.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/rules/analysisRules.ts) | 业务规则硬编码，难以扩展新规则 |

### 重构方向

- **步骤注册机制**：支持通过配置或插件方式注册步骤，类似 `registerStep(definition)`
- **策略模式扩展**：AI适配器支持多策略配置，通过工厂模式动态选择
- **规则引擎**：将业务规则抽象为可配置的规则链

---

## 3. 里氏替换原则 (LSP)

### 违规

| 文件 | 问题描述 |
|------|----------|
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | `AnalysisService` 类包装器与模块级函数并存，参数签名不一致：<br>- 模块级 `analyzeSources(sources, scenarioType?, scenarioKnowledge?, options?)`<br>- 类方法 `analyzeSources(sources, scenarioType, scenarioKnowledge?, options?)` |
| [taskService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/taskService.ts) | 类模式与兼容层函数并存，调用方行为依赖于使用方式 |

### 重构方向

- **统一接口**：删除模块级函数，仅保留类接口
- **类型约束**：确保类方法与接口完全匹配

---

## 4. 接口隔离原则 (ISP)

### 违规

| 文件 | 问题描述 |
|------|----------|
| [aiPorts.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts) | `AIAnalysisPort` 接口包含 `analyze`、`resumeFromCheckpoint` 等方法，某些实现可能不需要全部方法 |
| [repositories.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/repositories.ts) | 仓库接口包含大量CRUD方法，部分场景只需要读操作 |

### 重构方向

- **细粒度接口**：将 `AIAnalysisPort` 拆分为 `AIAnalyzer`、`AICheckpointHandler` 等小接口
- **读写分离**：仓库接口拆分为只读和只写接口

---

## 5. 依赖倒置原则 (DIP)

### 严重违规

| 文件 | 问题描述 |
|------|----------|
| [step-scenario-discovery.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/steps/step-scenario-discovery.ts) | 使用全局可变状态 `sharedMainCallResult` 和 `sharedMainCallPromise`，违反依赖注入原则 |
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | 模块级setter模式（`setAnalysisPort`, `setDraftPort`等），违反构造注入原则 |

### 轻微违规

| 文件 | 问题描述 |
|------|----------|
| [incrementalAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/incrementalAnalysis.ts) | 保留了兼容层的setter模式 |
| [chatService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/chatService.ts) | 保留了兼容层的setter模式 |

### 重构方向

- **消除全局状态**：将 `sharedMainCallResult` 改为通过Pipeline上下文传递
- **废弃setter模式**：全部服务通过DI容器构造注入，删除兼容层

---

## 6. 关注点分离 (Separation of Concerns)

### 违规

| 文件 | 问题描述 |
|------|----------|
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | 业务逻辑、数据访问、缓存管理耦合 |
| [step-scenario-discovery.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/steps/step-scenario-discovery.ts) | AI调用、结果缓存、步骤执行耦合 |
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | 服务注册、依赖装配、应用启动耦合 |

### 重构方向

- **清晰分层**：确保Domain层不依赖具体实现
- **横向切片**：将缓存、日志、监控等横切关注点提取为中间件或装饰器

---

## 7. 端口与适配器架构 (Ports & Adapters)

### 已实现部分

- ✅ Domain层定义了端口接口（`aiPorts.ts`, `repositories.ts`）
- ✅ AI适配器实现了端口接口
- ✅ DI容器用于装配依赖

### 违规

| 文件 | 问题描述 |
|------|----------|
| [step-scenario-discovery.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/steps/step-scenario-discovery.ts) | 步骤直接调用 `callAI`、`mockAnalyze` 等具体实现，未通过端口 |
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | 通过模块级变量获取端口，而非构造注入 |

### 重构方向

- **步骤依赖端口**：步骤通过 `StepInput` 接收端口引用，而非直接调用具体实现
- **端口注入**：所有依赖通过构造函数或上下文传递

---

## 8. 纯函数与副作用隔离

### 违规

| 文件 | 问题描述 |
|------|----------|
| [step-scenario-discovery.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/steps/step-scenario-discovery.ts) | `ensureMainCallExecuted` 修改全局状态 `sharedMainCallResult` |
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | 回调中的数据库操作用fire-and-forget模式，无法追踪和测试 |
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | 服务注册过程产生副作用 |

### 重构方向

- **上下文模式**：将共享状态改为通过上下文对象传递
- **显式副作用**：将fire-and-forget操作改为返回Promise，由调用方决定是否等待
- **依赖注入**：消除模块级副作用，通过DI管理状态

---

## 9. 原子设计 (Atomic Design)

### 已实现部分

- ✅ UI组件按原子（ui）、分子（common）、有机体（workspace）分层
- ✅ 组件职责清晰

### 违规

| 文件 | 问题描述 |
|------|----------|
| [WorkspacePage.tsx](file:///d:/developWorkPlaces/youju/youju-app/src/pages/WorkspacePage.tsx) | 页面级组件过大，承担过多逻辑 |
| [useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts) | Store过于庞大，违反原子设计原则 |

### 重构方向

- **组件拆分**：将WorkspacePage拆分为多个独立组件
- **Store拆分**：按功能域拆分为多个小型Store

---

## 10. 组合优于继承 (Composition over Inheritance)

### 已实现部分

- ✅ 服务通过构造注入组合依赖
- ✅ 步骤通过组合注册到Pipeline
- ✅ 组件通过props传递行为

### 违规

| 文件 | 问题描述 |
|------|----------|
| 无明显继承违规 | 项目整体遵循组合原则 |

### 重构方向

- **保持现状**：继续使用组合模式，避免引入继承

---

## 11. 被动视图与展示模型 (Passive View / Presentation Model)

### 违规

| 文件 | 问题描述 |
|------|----------|
| [useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts) | Store包含复杂业务逻辑（如 `updateRiskDescription`、`mergeRisksSmart`） |
| [hooks/useAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts) | Hook包含API调用和状态管理混合逻辑 |
| 部分组件 | 部分组件包含业务逻辑而非纯展示 |

### 重构方向

- **视图模型分离**：Store只管理状态，业务逻辑提取到专门的Service层
- **被动组件**：组件只负责渲染和事件委托，逻辑在ViewModel中

---

## 12. 语义化命名

### 良好实践

- ✅ 服务命名清晰：`AnalysisService`, `TaskService`, `ChatService`
- ✅ 类型命名准确：`AnalyzeResult`, `Risk`, `Source`
- ✅ 步骤命名语义化：`step-scenario-discovery`, `step-discrepancy-detection`

### 违规

| 文件 | 问题描述 |
|------|----------|
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | `analyzeSourcesStreamWithLog` 命名冗长，可简化为 `analyzeWithStreaming` |
| [aiPorts.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiPorts.ts) | `AIAnalysisPort` 使用"Port"后缀，属于框架术语而非业务语义 |
| [di/tokens.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/tokens.ts) | Token命名使用"Repository"后缀，可接受但不够语义化 |

### 重构方向

- **业务语义优先**：使用领域术语而非框架术语
- **简化命名**：消除冗余后缀，如 `AIAnalysisPort` → `Analyzer`

---

## 13. 设计模式合理性

### 良好实践

- ✅ **策略模式**：Pipeline步骤使用策略模式，每个步骤是独立策略
- ✅ **工厂模式**：DI容器通过工厂函数创建服务
- ✅ **适配器模式**：AI适配器将外部API适配为统一端口接口
- ✅ **观察者模式**：Pipeline使用回调通知状态变化

### 违规

| 文件 | 问题描述 |
|------|----------|
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | 类包装器模式过度设计，简单委托无实际价值 |
| [step-scenario-discovery.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/steps/step-scenario-discovery.ts) | 全局缓存模式（`sharedMainCallResult`）是反模式，应使用依赖注入 |

### 重构方向

- **删除委托类**：直接使用模块级函数或简化类实现
- **消除全局状态**：使用上下文传递共享数据

---

## 14. 可测试性

### 违规

| 文件 | 问题描述 |
|------|----------|
| [step-scenario-discovery.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/steps/step-scenario-discovery.ts) | 全局状态 `sharedMainCallResult` 导致测试隔离困难 |
| [analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts) | setter模式导致依赖注入困难，难以Mock |
| [app.ts](file:///d:/developWorkPlaces/youju/youju-server/src/app.ts) | 复杂的装配逻辑难以单独测试 |

### 重构方向

- **依赖注入**：所有依赖通过构造函数注入，便于Mock
- **纯函数优先**：将业务逻辑提取为纯函数，易于单元测试
- **测试隔离**：每个测试用例独立初始化，消除全局状态影响

---

## 综合评估

### 架构健康度：65/100

| 维度 | 评分 | 说明 |
|------|------|------|
| SOLID原则 | 55 | DIP和SRP存在严重违规 |
| 分层架构 | 70 | 基本遵循分层，但存在跨层依赖 |
| 可测试性 | 50 | 全局状态和副作用影响测试 |
| 可扩展性 | 60 | 部分硬编码影响扩展 |
| 代码质量 | 75 | 命名规范，类型安全 |

### 优先级排序（P0-P2）

**P0 - 必须修复**
1. 消除全局状态 `sharedMainCallResult`
2. 废弃setter模式，统一使用DI容器
3. 拆分 analysisService 上帝模块

**P1 - 建议修复**
4. 拆分 useAnalysisStore
5. 实现步骤注册机制
6. 细粒度端口接口

**P2 - 持续改进**
7. 视图模型分离
8. 语义化命名优化
9. 消除委托类模式

---

## 总结

项目已具备良好的架构基础：分层设计、端口适配器模式、类型安全。主要问题集中在**过渡期遗留的全局状态和setter模式**，以及**上帝模块**。建议按优先级逐步修复，重点关注DI容器迁移和模块拆分。
