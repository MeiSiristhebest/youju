# 架构重构实施计划

## 项目调研结论

### 当前状态
1. **前端 Store 拆分已完成**：`useAnalysisCoreStore.ts`、`useRiskStore.ts`、`useDimensionStore.ts`、`useDraftStore.ts` 已创建
2. **原始 `useAnalysisStore.ts` 仍在使用**：32个文件仍在引用原始 store，需要更新为兼容性层
3. **`AnalysisService` 构造函数有10个依赖**：需要提取子服务
4. **`configureContainer.ts` 有438行**：需要按模块拆分
5. **路由层包含业务逻辑**：风险排序逻辑在 `analysis.ts` 中

### 技术栈约束
- 前端：React + Vite + Zustand + React Query
- 后端：Node.js + Express + TypeScript + DI Container
- 遵循 5 层隔离原则：UI → API → Domain → AI Orchestration → Data

---

## 重构任务清单

### P0 级任务

#### 任务1：更新 `useAnalysisStore.ts` 为兼容性层（已完成基础拆分）
**目标**：将原始 store 转变为转发层，确保所有引用文件无需修改即可工作

**文件修改**：
- `youju-app/src/stores/useAnalysisStore.ts`：改为转发到四个新 store

**实现步骤**：
1. 删除原始状态定义和实现
2. 导入四个新 store
3. 实现转发方法，调用对应 store 的方法

**风险处理**：
- 需要确保所有方法签名完全匹配
- 需要处理跨 store 的状态访问（如 `getRiskStatus` 需要访问 `useAnalysisCoreStore`）

#### 任务2：拆分 `AnalysisService` 提取子服务
**目标**：减少构造函数参数，遵循 ISP 和 SRP

**文件修改**：
- `youju-server/src/domain/services/analysisService.ts`：拆分主服务
- `youju-server/src/domain/services/analysisCoreService.ts`（新建）：核心分析逻辑
- `youju-server/src/domain/services/analysisPersistenceService.ts`（新建）：持久化逻辑
- `youju-server/src/domain/services/analysisCacheService.ts`（新建）：缓存逻辑

**实现步骤**：
1. 创建 `AnalysisCoreService`：处理分析执行、流式分析、增量分析
2. 创建 `AnalysisPersistenceService`：处理日志、步骤、结果的持久化
3. 创建 `AnalysisCacheService`：处理缓存命中、写入、预热
4. 修改 `AnalysisService`：组合三个子服务

**风险处理**：
- 需要更新 `configureContainer.ts` 注册新服务
- 需要更新所有引用 `AnalysisService` 的代码

### P1 级任务

#### 任务3：拆分 `configureContainer.ts` 按模块拆分配置函数
**目标**：提高 DI 配置的可维护性和可测试性

**文件修改**：
- `youju-server/src/infrastructure/di/configureContainer.ts`：拆分为多个配置函数
- `youju-server/src/infrastructure/di/configureRepositories.ts`（新建）：Repository 配置
- `youju-server/src/infrastructure/di/configureServices.ts`（新建）：Service 配置
- `youju-server/src/infrastructure/di/configureAdapters.ts`（新建）：Adapter 配置

**实现步骤**：
1. 创建 `configureRepositories`：注册所有 Repository
2. 创建 `configureAdapters`：注册所有适配器和端口
3. 创建 `configureServices`：注册所有服务
4. 修改 `configureContainer`：调用三个子配置函数

**风险处理**：
- 需要确保 Tokens 和依赖关系正确传递
- 需要保持向后兼容性

#### 任务4：路由层业务逻辑迁移
**目标**：将风险排序等业务逻辑从路由层移到 `AnalysisService`

**文件修改**：
- `youju-server/src/presentation/routes/analysis.ts`：移除业务逻辑
- `youju-server/src/domain/services/analysisService.ts`：添加结果后处理方法

**实现步骤**：
1. 在 `AnalysisService` 中添加 `applyPreferences` 方法
2. 修改 `analyzeSources` 和 `analyzeWithStreaming` 返回包含偏好排序的结果
3. 修改路由层：移除风险排序逻辑，直接返回服务结果

**风险处理**：
- 需要更新 API 返回格式
- 需要确保 `PreferenceService` 被正确注入

### P2 级任务

#### 任务5：验证所有测试通过
**目标**：确保重构后所有测试仍然通过

**执行步骤**：
1. 运行前端测试：`pnpm --filter youju-app test`
2. 运行后端测试：`pnpm --filter youju-server test`
3. 运行 lint：`pnpm lint`

---

## 依赖关系图

```
configureContainer
├── configureRepositories → Repository Tokens
├── configureAdapters     → Adapter Tokens
└── configureServices
    ├── AnalysisCoreService
    ├── AnalysisPersistenceService
    ├── AnalysisCacheService
    └── AnalysisService (组合上述子服务)
```

---

## 预期收益

| 任务 | 收益 |
|------|------|
| Store 拆分 | 降低状态管理复杂度，提高可测试性 |
| Service 拆分 | 降低构造函数参数，提高可测试性 |
| DI 配置拆分 | 提高配置可维护性，支持独立测试 |
| 路由层清理 | 强化分层边界，业务逻辑集中管理 |

---

## 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 兼容性破坏 | 高 | 保留原始接口，使用转发层 |
| 测试失败 | 中 | 先运行现有测试，再进行重构 |
| 性能影响 | 低 | 无功能变更，仅结构调整 |

---

## 完成标准

1. ✅ `useAnalysisStore.ts` 变为转发层，所有方法转发到新 store
2. ✅ `AnalysisService` 构造函数参数减少到 4 个以下
3. ✅ `configureContainer.ts` 拆分为 3 个以上子配置函数
4. ✅ 路由层不再包含风险排序等业务逻辑
5. ✅ 所有测试通过（前端 + 后端）
6. ✅ Lint 检查通过