# 有据项目架构与实现一致性审计报告

> 审计日期：2026-07-09
> 审计范围：youju-app（前端）+ youju-server（后端）全量代码
> 审计依据：PRD、Technical-Architecture、项目记忆中的设计约束

---

## 一、总体架构评估

### 1.1 架构分层概览

项目宣称采用 **5层隔离架构**：

```
Presentation Layer (Express Routes + Middleware)
        ↓
Domain Layer (Services + Rules + Types + Ports)
        ↓
AI Orchestration Layer (Pipeline + Adapters + Prompts)
        ↓
Infrastructure Layer (DI + File Parser + Auth + URL Fetcher)
        ↓
Data Layer (Repositories + Drivers)
```

**实际现状评级：⚠️ 部分实现，存在分层违规**

### 1.2 各层实现状态

| 层级 | 设计要求 | 实现状态 | 一致性评级 |
|------|---------|---------|-----------|
| Presentation Layer | 路由+中间件，仅依赖Domain层 | ✅ 基本实现 | ⚠️ 轻微违规 |
| Domain Layer | 业务逻辑+端口接口，不依赖具体实现 | ⚠️ 部分实现 | ❌ 存在反向依赖 |
| AI Orchestration Layer | AI流水线+适配器，通过Port与Domain交互 | ✅ 较好实现 | ⚠️ 边界模糊 |
| Infrastructure Layer | 技术实现，实现Domain端口 | ✅ 基本实现 | ⚠️ 职责混杂 |
| Data Layer | 数据持久化，实现Repository端口 | ✅ 较好实现 | ✅ 基本一致 |

---

## 二、后端架构详细审计

### 2.1 分层违规检查

#### ❌ 严重违规：Domain层反向依赖AI层

**文件**：[aiCallPort.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/ports/aiCallPort.ts#L1-L2)

```typescript
import type { AIConfig } from '../../ai/llm.js'
import type { PromptCache } from '../../ai/promptCache.js'
```

**问题**：Domain 层的 Port 接口从 AI 层导入类型，违反了"依赖倒置原则"。应该是 AI 层实现 Domain 层定义的 Port，而不是 Domain 层引用 AI 层的类型。

**影响**：
- 破坏了分层隔离
- Domain 层与具体 AI 实现耦合
- 替换 AI 框架会影响 Domain 层

---

#### ❌ 违规：Domain层依赖Data层类型

**文件**：[modelConfigService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/modelConfigService.ts#L1-L1)

```typescript
import type { DbModelConfig } from '../../data/types.js'
```

**问题**：Domain Service 直接导入 Data 层的数据库类型 `DbModelConfig`，而不是使用 Domain 层自己的类型。

**影响**：
- 数据库结构变化会直接影响 Domain 层
- 无法轻松替换数据库实现

---

#### ⚠️ 轻微违规：Presentation层直接调用AI层

**文件**：[modelConfig.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/routes/modelConfig.ts#L2-L2)

```typescript
import { listModels, testModelConnection } from '../../ai/llm.js'
```

**问题**：Presentation 层路由直接导入 AI 层函数，绕过了 Domain Service 层。

**设计原则**：Presentation → Domain Service → AI Adapter

---

### 2.2 依赖注入系统审计

**实现文件**：[configureContainer.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/di/configureContainer.ts)

#### ✅ 优点

1. **完整的容器注册**：20+ Repository + 15+ Service 全部注册
2. **读写分离接口**：定义了 ReadRepository / WriteRepository 分离
3. **Port-Adapter 模式**：AI 能力通过 Port 接口注入

#### ❌ 问题

1. **类型断言泛滥**（第153-180行）：
   ```typescript
   const userRepository = createUserRepository(driver) as unknown as UserRepository
   ```
   所有 Repository 都使用了 `as unknown as` 双重断言，说明 Port 接口与实现类型不匹配。

2. **Service 手动实例化**：所有 Service 都是手动 `new` 的，没有真正使用 DI 容器的依赖注入能力，容器只是作为单例注册表使用。

3. **循环依赖风险**：`AnalysisService` 内部又 new 了 `AnalysisResultPersister` 和 `AnalysisStreamOrchestrator`，形成了服务嵌套。

---

### 2.3 AI 流水线架构审计

**核心实现**：[executor.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/pipeline/executor.ts)

#### ✅ 已实现的设计

| 特性 | 实现状态 | 说明 |
|------|---------|------|
| 7步流水线 | ✅ 完整 | 场景发现→输入解析→维度发现→跨源提取→差异检测→自检→最终输出 |
| 状态机 | ✅ 完整 | idle/running/step_active/paused/failed/completed/retrying |
| Checkpoint 机制 | ✅ 完整 | createCheckpoint/restoreFromCheckpoint |
| 步骤重试 | ✅ 完整 | executeStepWithRetry + 指数退避 |
| 步骤跳过 | ✅ 完整 | skipStep |
| 单步重跑 | ✅ 完整 | retryStep/resumeFromStep |
| 依赖失效 | ✅ 完整 | invalidateDownstreamSteps |
| 暂停/恢复 | ✅ 完整 | pause/resume |

#### ❌ 设计问题

1. **AI 提示词与业务规则耦合**

   **文件**：[prompts/index.ts](file:///d:/developWorkPlaces/youju/youju-server/src/ai/prompts/index.ts#L9-L9)

   ```typescript
   import {
     getRiskRulesSummary,
     QUALITY_BAR,
     RISK_RULES_VERSION,
     SELF_CHECK_RULES,
   } from '../../domain/rules/riskRules.js'
   ```

   **问题**：AI 提示词模块直接从 Domain 层导入业务规则常量，然后通过模板变量注入到 prompt 中。

   **设计原则冲突**：
   - 项目记忆要求"AI与业务逻辑必须解耦：prompts handle expression only (no business rules)"
   - 当前实现将风险等级判定规则、自检规则、质量标准等业务规则直接嵌入提示词

   **辩证分析**：
   - 正方：提示词需要知道业务规则才能正确输出，这是合理的
   - 反方：规则应该在 Domain 层验证，AI 只负责提取和分类，最终判定由业务规则完成

---

### 2.4 领域层审计

#### ✅ 优点

1. **业务规则独立**：[analysisRules.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/rules/analysisRules.ts)、[riskRules.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/rules/riskRules.ts) 纯函数规则
2. **Port 接口定义**：repositories.ts、servicePorts.ts、aiPorts.ts 等端口定义完整
3. **服务粒度合理**：analysisService、sourceService、taskService 等职责清晰

#### ❌ 问题

1. **AnalysisService 职责过重**

   **文件**：[analysisService.ts](file:///d:/developWorkPlaces/youju/youju-server/src/domain/services/analysisService.ts)

   - 包含：缓存检查、流式分析、全量分析、增量分析、话术生成、检查点恢复、步骤重试、场景预热
   - 共 360+ 行，15+ 个公共方法
   - 违反"单一职责原则"

2. **服务间循环创建**

   ```
   AnalysisService
     → new AnalysisResultPersister(...)
     → new AnalysisStreamOrchestrator(...)
   ```

   这些不是通过 DI 注入的，而是在构造函数中直接创建，不利于测试和替换。

---

### 2.5 数据层审计

#### ✅ 优点

1. **DatabaseDriver 抽象**：[DatabaseDriver.ts](file:///d:/developWorkPlaces/youju/youju-server/src/data/DatabaseDriver.ts) 定义了统一接口
2. **双驱动实现**：SqliteDriver + NeonDriver
3. **Repository 模式**：每种实体都有独立的 Repository
4. **读写分离接口**：ReadRepository / WriteRepository 分离定义

#### ❌ 已知问题（与项目记忆一致）

1. **better-sqlite3 不兼容 Serverless**
   - 项目记忆明确指出："better-sqlite3 is incompatible with Serverless"
   - 当前默认使用 SQLite，仅通过 `DB_DRIVER` 环境变量切换
   - 迁移到 Neon/Turso 的工作部分完成但未验证

2. **迁移系统缺失**
   - 没有正式的数据库迁移工具
   - 使用 `addColumnIfNotExists` 函数手动添加列
   - 没有版本化的迁移脚本
   - 没有 rollback 机制

3. **TypeScript 类型不匹配**
   - configureContainer 中大量 `as unknown as` 断言
   - 说明 Domain Port 类型与 Data 实现类型存在偏差

---

### 2.6 安全实现审计

| 安全特性 | 实现状态 | 位置 | 评级 |
|---------|---------|------|------|
| 安全响应头 | ✅ 完整 | [securityHeaders.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/middleware/securityHeaders.ts) | ✅ |
| CSP 策略 | ✅ 实现 | 同上 | ⚠️ 开发环境过宽 |
| HSTS | ✅ 实现 | 同上 | ✅ |
| SSRF 防护 | ✅ 完整 | [urlFetcher.ts](file:///d:/developWorkPlaces/youju/youju-server/src/infrastructure/urlFetcher.ts) | ✅ |
| 私有IP过滤 | ✅ 实现 | 同上 | ✅ |
| DNS重绑保护 | ⚠️ 部分 | 同上 | ⚠️ 待验证 |
| 速率限制 | ✅ 实现 | [rateLimiter.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/middleware/rateLimiter.ts) | ⚠️ 单实例内存 |
| JWT认证 | ✅ 实现 | jose 库 | ✅ |
| Zod请求验证 | ✅ 实现 | zodValidator.ts + schemas.ts | ✅ |
| 错误处理 | ✅ 实现 | [errorHandler.ts](file:///d:/developWorkPlaces/youju/youju-server/src/presentation/middleware/errorHandler.ts) | ✅ |
| 优雅关闭 | ✅ 实现 | [index.ts](file:///d:/developWorkPlaces/youju/youju-server/src/index.ts#L59-L105) | ✅ |
| API版本控制 | ✅ 实现 | API-Version header | ✅ |

**安全评级：✅ 总体良好，部分需加固**

---

## 三、前端架构详细审计

### 3.1 状态管理架构

**实现**：Zustand + React Query 双轨制

#### ✅ 优点

1. **Store 拆分合理**：
   - useAnalysisResultStore（结果数据）
   - useAnalysisStepStore（步骤状态）
   - useAnalysisRiskStore（风险交互）
   - useAnalysisDimensionStore（维度配置）
   - useAnalysisUIStore（UI偏好）
   - useAnalysisStore（聚合门面）

2. **门面模式**：[useAnalysisStore.ts](file:///d:/developWorkPlaces/youju/youju-app/src/stores/useAnalysisStore.ts) 通过 syncState() 同步5个子store的状态，对外提供统一接口

3. **React Query 服务端状态**：
   - useMutation 处理异步操作
   - QueryClientProvider 全局注册
   - 合理的默认配置（retry:1, refetchOnWindowFocus:false）

#### ❌ 问题

1. **状态管理碎片化严重**
   - 分析相关的状态分散在 6 个 store 中
   - 每次状态更新需要通过 subscribe + shallowEqual 同步
   - 增加了调试和理解成本
   - 存在状态同步延迟的潜在 bug 风险

2. **useAnalysis Hook 职责过重**
   - [useAnalysis.ts](file:///d:/developWorkPlaces/youju/youju-app/src/hooks/useAnalysis.ts) 共 438 行
   - 包含：分析触发、增量分析预测、话术生成、反馈提交、步骤控制、断点续跑
   - 15+ 个 state 变量，20+ 个方法
   - 违反"关注点分离"

3. **部分状态绕过 React Query**
   - 分析结果同时存在于 Zustand store 和 React Query cache 中
   - 缓存逻辑重复（resultStore 有 getCache/setCache，React Query 也有缓存）
   - 可能导致数据不一致

---

### 3.2 API 层架构

**核心实现**：[apiClient.ts](file:///d:/developWorkPlaces/youju/youju-app/src/services/apiClient.ts)

#### ✅ 优点

1. **统一请求封装**：超时、重试、刷新 token、错误处理
2. **Token 自动刷新**：isTokenExpiring + refreshPromise 防并发刷新
3. **会话管理**：未登录用户使用 sessionId
4. **API 日志**：useApiLogsStore 记录所有请求
5. **错误类型系统**：ApiError + ErrorCode 枚举

#### ⚠️ 设计权衡

1. **localStorage 直接访问**
   - token/session/user 直接读写 localStorage
   - 没有抽象出 Storage 层
   - 未来切换到其他存储（如 IndexedDB）需要修改多处

2. **apiClient 与 authStorage 耦合**
   - 在同一个文件中定义
   - 虽然方便，但职责不够清晰

---

### 3.3 组件架构

**目录结构**：
```
components/
  chat/           # 聊天相关
  common/         # 通用组件
  custom/         # 自定义Button
  landing/        # 落地页组件
  modals/         # 弹窗
  print/          # 打印/导出
    atoms/
    molecules/
    organisms/
  templates/      # 页面模板
  ui/             # shadcn/ui 组件
  workspace/      # 工作台组件
    results/
    preferenceTabs/
```

#### ✅ 优点

1. **原子设计（Atomic Design）**：print 目录严格遵循 atoms/molecules/organisms 三级
2. **按功能分组**：workspace/、landing/、chat/ 等按业务域组织
3. **模板模式**：templates/ 定义页面布局骨架

#### ❌ 问题

1. **组件大小不均**
   - WorkspacePage.tsx、ResultPanel.tsx 等核心组件可能过大（需要进一步检查）
   - 业务逻辑与渲染逻辑混杂

2. **ui/ 与 custom/ 重复**
   - ui/button.tsx（shadcn）
   - custom/Button.tsx（自定义）
   - 两套按钮系统，容易造成混淆

---

## 四、与设计约束的一致性检查

### 4.1 项目记忆约束对照

| 约束项 | 设计要求 | 实现状态 | 一致性 |
|--------|---------|---------|--------|
| 5层隔离 | UI/API/Domain/AI/Data 五层，禁止跨层调用 | ⚠️ 部分实现 | ❌ 有违规 |
| AI业务解耦 | prompts只负责表达，业务判断在Domain | ⚠️ 部分实现 | ❌ 规则注入prompt |
| AI流水线可控 | 每步记录、可重放、可中断、可重试 | ✅ 完整实现 | ✅ |
| 数据事件驱动 | 保存过程数据，所有AI输出可追溯 | ✅ 基本实现 | ✅ analysis_logs |
| 前端集中状态 | 核心状态用集中store，不用散useState | ⚠️ 部分实现 | ⚠️ store过多 |
| pnpm workspace | monorepo + packageManager | ✅ 实现 | ✅ |
| Node版本锁定 | .nvmrc + engines | ⚠️ 部分实现 | ⚠️ nvmrc缺失 |
| Biome代码质量 | lint + format | ✅ 实现 | ✅ |
| simple-git-hooks | pre-commit检查 | ✅ 实现 | ✅ |
| Vitest测试框架 | 前后端统一 | ✅ 实现 | ✅ |
| CI/CD | GitHub Actions | ✅ 实现 | ✅ |
| .env.example | 环境变量示例 | ✅ 实现 | ✅ |
| Vite构建优化 | build.target/manualChunks | ⚠️ 待检查 | - |
| TypeScript strict | 严格模式 | ⚠️ 待检查 | - |
| Serverless数据库 | 迁移到Turso/Neon | ⚠️ 部分实现 | ❌ 默认SQLite |
| 文件解析纯JS | unpdf + officeparser | ✅ 实现 | ✅ |
| 可部署EdgeOne | 前后端配置文件 | ✅ 实现 | ✅ |
| SSE流式分析 | 长时任务适配 | ✅ 实现 | ✅ |
| express-rate-limit | 限流库 | ✅ 实现 | ✅ |
| SSRF防护 | 白名单/黑名单/私有IP | ✅ 实现 | ✅ |
| JWT jose库 | SignJWT + jwtVerify | ✅ 实现 | ✅ |
| Zod验证 | validateBody/Query/Params | ✅ 实现 | ✅ |
| AppError基类 | 12种ErrorCode | ✅ 实现 | ✅ |
| 安全响应头 | 7种头 | ✅ 实现 | ✅ |
| API版本控制 | /api/v1/ + header | ⚠️ 部分 | ⚠️ header有路径无 |
| 优雅关闭 | SIGTERM/SIGINT处理 | ✅ 实现 | ✅ |
| Zustand persist | UI偏好持久化 | ✅ 实现 | ✅ |
| 可访问性 | ARIA + 键盘导航 | ⚠️ 待检查 | - |
| 自定义滚动条 | 6px + hover显示 | ✅ 实现 | ✅ |
| 7步动画不遮挡 | flex布局 + 滚动 | ✅ 实现 | ✅ |
| 可调整面板 | ResizablePanel组件 | ✅ 实现 | ✅ |
| 深色模式 | 主题变量 | ✅ 实现 | ✅ |

---

### 4.2 关键缺失项

#### ❌ 1. .nvmrc 文件缺失

**项目记忆要求**："Node.js version must be locked via .nvmrc (v25.2.1)"

**现状**：根目录 package.json engines 字段是 `>=22.0.0`，没有 .nvmrc 文件。

---

#### ❌ 2. API 路径版本控制缺失

**项目记忆要求**："API versioning must use /api/v1/ path"

**现状**：
- 只有 `API-Version: v1` 响应头
- 路由路径都是 `/api/analyze`、`/api/sources` 等，没有 `/api/v1/` 前缀

---

#### ❌ 3. Serverless 数据库未完成迁移

**项目记忆要求**："better-sqlite3 is incompatible with Serverless; migrate to Turso, Neon, or Serverless Postgres"

**现状**：
- NeonDriver 已实现
- 但默认驱动是 SQLite
- 没有迁移脚本系统
- 没有在生产环境验证

---

## 五、核心模块质量评估

### 5.1 AI 流水线模块

**评分：8/10 ⚠️ 优秀但有设计瑕疵**

✅ **强项**：
- PipelineExecutor 设计精良，状态机完整
- 支持 checkpoint、暂停恢复、单步重试
- 步骤间依赖管理（dependsOn + invalidateDownstream）
- 7个步骤独立模块，可注册可扩展

❌ **弱项**：
- 提示词与业务规则耦合
- Mock 实现与真实实现路径分离度不够
- 步骤输入输出类型不够严格

---

### 5.2 领域服务模块

**评分：6.5/10 ⚠️ 中等，需重构**

✅ **强项**：
- 业务规则纯函数化
- Port 接口定义完整
- 增量分析逻辑独立

❌ **弱项**：
- AnalysisService 职责过重
- 服务间手动实例化，DI不彻底
- 反向依赖 AI 层类型

---

### 5.3 前端状态管理

**评分：6/10 ⚠️ 中等，架构过于复杂**

✅ **强项**：
- 拆分思路正确（按领域拆分）
- 门面模式统一接口
- React Query 服务端状态分离

❌ **弱项**：
- 6个 store + 同步机制过于复杂
- useAnalysis Hook 太大
- 缓存逻辑重复（Zustand + React Query 双缓存）

---

### 5.4 安全模块

**评分：8.5/10 ✅ 良好**

✅ **强项**：
- SSRF 防护非常完整
- JWT + session 双轨认证
- 安全响应头齐全
- 错误处理规范化

❌ **弱项**：
- rate-limit 使用内存存储，多实例不一致
- 没有 CSRF 防护（如需要）
- CSP 开发环境过宽

---

## 六、发现的问题汇总

### 🔴 严重问题（必须修复）

1. **Domain 层反向依赖 AI 层** - 违反分层架构核心原则
2. **better-sqlite3 不兼容 Serverless** - 部署风险
3. **缺少数据库迁移系统** - 演进困难
4. **API 路径无版本前缀** - 与设计约束不符
5. **缺少 .nvmrc** - Node 版本未锁定

### 🟡 中等问题（建议优化）

6. **AnalysisService 职责过重** - 应拆分为多个服务
7. **前端状态管理过于碎片化** - 6个store同步复杂
8. **useAnalysis Hook 过大** - 应按职责拆分
9. **DI 容器类型断言泛滥** - 类型安全不足
10. **AI 提示词与业务规则耦合** - 边界模糊
11. **rate-limit 单实例内存存储** - 分布式环境失效

### 🟢 轻微问题（可选改进）

12. **Presentation 层个别路由直接调 AI 层**
13. **ui/ 与 custom/ 组件重复**
14. **localStorage 直接访问未抽象**
15. **CSP 开发环境过宽**

---

## 七、建议改进优先级

### P0 - 架构正确性（影响系统可维护性）

1. 修复 Domain → AI 反向依赖：将 AIConfig 等类型移到 Domain 层
2. 修复 Domain → Data 类型依赖：在 Domain 层定义自己的 ModelConfig 类型
3. 修复 Presentation → AI 直接调用：通过 Domain Service 中转

### P1 - 生产就绪（影响部署与扩展）

4. 完成 Serverless 数据库迁移（Neon/Turso）
5. 建立数据库迁移系统（如 ley 或 drizzle-kit）
6. API 路径添加 /api/v1 前缀
7. 添加 .nvmrc 锁定 Node 版本
8. 限流改为 Redis 存储或 Upstash

### P2 - 代码质量（影响开发效率）

9. 拆分 AnalysisService 为多个子服务
10. 简化前端状态管理架构
11. 拆分 useAnalysis Hook
12. 完善 DI 类型安全

### P3 - 体验优化

13. 统一组件库（消除 custom/ 与 ui/ 重复）
14. 抽象 Storage 层
15. 收紧开发环境 CSP

---

## 八、总结

### 整体评分：**7/10 ⚠️ 良好，但架构设计与实现存在偏差**

### 核心结论

1. **架构设计理念先进**：5层隔离、Port-Adapter、AI流水线、事件溯源等设计理念都有体现
2. **实现有偏差**：部分分层边界被打破，依赖倒置原则没有严格遵守
3. **功能完整性高**：PRD 中的核心功能基本都有实现，安全特性齐全
4. **技术债存在**：DI 类型安全、迁移系统、Serverless 适配等需要完善
5. **前端架构过于复杂**：状态管理拆分过细，增加了认知成本

### 最值得肯定的方面

- AI 流水线设计非常出色，可控制、可观测、可调试
- 安全实现全面且规范
- 代码组织结构清晰，目录命名合理
- 测试基础设施完善（Vitest + 测试用例）

### 最需要关注的方面

- 分层架构的严格执行（依赖方向）
- 数据库迁移与 Serverless 适配
- 前端状态管理的简化
- 核心服务的职责拆分

---

*报告生成时间：2026-07-09*
*审计范围：youju-app + youju-server 核心架构代码*
