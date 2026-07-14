# 模型配置迁移到前端 localStorage 方案

## 背景

当前模型配置（API Key、Base URL、模型名等）完全存后端数据库 `user_model_configs` 表，按 `session_id` 隔离。匿名用户的 session_id 存在 localStorage 中，清缓存/换浏览器就生成新的 session_id，导致之前配置的模型查不到，回退到 mock 模式。

## 方案

将模型配置改为前端 localStorage 存储，分析/聊天请求时直接在请求体中携带 `aiConfig` 发给后端。后端优先从请求体读 `aiConfig`，回退到数据库查询（向后兼容）。

## 改动点

### 前端（youju-app）

#### 1. 新建 `src/stores/useModelConfigStore.ts`
- 使用 zustand + persist 中间件，存储名 `youju-model-configs`
- State: `configs: ModelConfig[]`，包含 apiKey（本地存储，不经过后端）
- Actions: `addConfig`, `updateConfig`, `deleteConfig`, `setDefault`, `getDefaultConfig`
- 类型定义：
  ```typescript
  interface ModelConfig {
    id: string
    name: string
    provider: ModelProvider
    apiKey: string
    baseURL: string
    model: string
    modelMappings: ModelMapping[]
    isDefault: boolean
    createdAt: string
    updatedAt: string
  }
  ```
- 数据迁移：首次加载时检查后端是否有已配置的模型，自动拉取并迁移到 localStorage（需要临时保留后端 GET 接口）

#### 2. 修改 `src/components/workspace/ModelSettingsContent.tsx`
- 配置列表的增删改查改为读写 `useModelConfigStore`，不再调后端 API
- 测试连接仍调后端 `POST /api/model-configs/test`（传明文 apiKey，后端代理请求）
- 拉取模型列表仍调后端 `POST /api/model-configs/list-models`

#### 3. 修改 `src/services/analysisApi.ts`
- `analyze()`, `analyzeIncremental()`, `analyzeAsync()` 请求体添加 `aiConfig` 字段
- 从 `useModelConfigStore.getDefaultConfig()` 获取配置

#### 4. 修改 `src/services/analysisStreamService.ts`
- `streamAnalyze()` 请求体添加 `aiConfig`
- 流式请求的 body 构造中加入 aiConfig

#### 5. 修改 `src/services/chatApi.ts`
- `sendChatMessage()` 请求体添加 `aiConfig`

#### 6. 修改 `src/services/modelConfigApi.ts`
- 保留 `testModelConnection()` 和 `fetchModelList()`（后端代理）
- CRUD 函数标记为 deprecated 或删除（改由 store 直接操作）

#### 7. 修改 `src/stores/useUIPreferenceStore.ts`（可选，低优先级）
- 清理未使用的 `sessionId` 和 `setSessionId`（全代码库从未调用）

### 后端（youju-server）

#### 8. 修改 `src/presentation/validation/schemas.ts`
- `analyzeSchema`, `analyzeStreamSchema`, `analyzeIncrementalSchema` 添加可选字段：
  ```typescript
  aiConfig: z.object({
    apiKey: z.string(),
    baseURL: z.string(),
    model: z.string(),
    provider: z.string().optional(),
  }).optional()
  ```

#### 9. 修改 `src/presentation/routes/analysis.ts`
- 同步分析路由（~L77-88）：优先从 `req.body.aiConfig` 读取，为空时回退到数据库查询
- 流式分析路由（~L170-180）：同上

#### 10. 修改 `src/presentation/routes/chat.ts`
- 聊天路由：优先从 `req.body.aiConfig` 读取，为空时回退到数据库查询

#### 11. 保留 `src/presentation/routes/modelConfig.ts`
- 保留 `POST /api/model-configs/test` 和 `POST /api/model-configs/list-models`（前端测试连接用）
- CRUD 路由保留（向后兼容，但前端不再使用）

## 数据流变化

### 改动前
```
设置页 → POST /api/model-configs → 后端数据库
分析请求 → 后端查数据库拿 aiConfig → 调 LLM
```

### 改动后
```
设置页 → 直接写 localStorage (zustand persist)
分析请求 → 请求体携带 aiConfig → 后端直接用 → 调 LLM
测试连接 → POST /api/model-configs/test (传明文 key，后端代理)
```

## 向后兼容策略

1. 后端分析/聊天路由：请求体有 aiConfig 就用，没有就查数据库（旧客户端不受影响）
2. 数据迁移：前端 store 首次初始化时，尝试从后端拉取已有配置并迁移到 localStorage
3. 后端 model-configs CRUD 路由保留不删

## 验证步骤

1. 启动前后端，在前端设置页配置一个模型（如豆包）
2. 关闭浏览器，重新打开 → 确认配置仍在
3. 清除 cookie 但不清 localStorage → 确认配置仍在
4. 执行分析流程 → 确认后端日志显示使用的是 localStorage 中的配置，非 mock 模式
5. 执行聊天对话 → 确认聊天正常使用配置的模型
6. 测试连接功能 → 确认仍能正常测试
