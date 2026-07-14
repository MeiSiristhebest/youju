# AI 模型服务商扩展计划（OpenAI 兼容版）

## 一、调研结论

### 1.1 核心原则

**全部走 OpenAI 兼容格式**，不引入额外 SDK 依赖。所有厂商都通过 `createOpenAI` 统一调用，baseURL 差异化配置。

### 1.2 国内主流厂商（权威源确认）

| 服务商 | Provider Key | API Base URL | 最新旗舰模型 | 官方文档 |
|--------|-------------|--------------|-------------|----------|
| **OpenAI** | `openai` | `https://api.openai.com/v1` | GPT-5.5 / GPT-5.4 / o3 | platform.openai.com/docs/models |
| **Anthropic** | `anthropic` | `https://api.anthropic.com/v1` | Claude Sonnet 5 / Opus 4 | docs.anthropic.com |
| **DeepSeek** | `deepseek` | `https://api.deepseek.com/v1` | DeepSeek-V4 / DeepSeek-R1 | api-docs.deepseek.com |
| **智谱 AI** | `zhipu` | `https://open.bigmodel.cn/api/paas/v4` | GLM-5.2 | bigmodel.cn/dev/api |
| **Moonshot (Kimi)** | `moonshot` | `https://api.moonshot.cn/v1` | Kimi K2.7 / K2.6 | platform.moonshot.cn/docs |
| **通义千问** | `qwen` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Qwen3.7-Max | help.aliyun.com/product/dashscope |
| **火山引擎 (豆包)** | `volcengine` | `https://ark.cn-beijing.volces.com/api/v3` | Doubao Seed 2.1 Pro | www.volcengine.com/docs/82379 |
| **百度千帆 (文心)** | `qianfan` | `https://qianfan.baidubce.com/v2` | 文心 5.0 / ERNIE 5.0 | cloud.baidu.com/doc/QIANFAN |
| **零一万物 (Yi)** | `yi` | `https://api.lingyiwanwu.com/v1` | Yi-Light / Yi-Large | platform.lingyiwanwu.com/docs |
| **讯飞星火** | `spark` | `https://spark-api-open.xf-yun.com/v1` | 星火 V4.0 / Spark 4.0 | www.xfyun.cn/doc/spark |
| **OpenRouter** | `openrouter` | `https://openrouter.ai/api/v1` | 聚合 200+ 模型 | openrouter.ai/docs |
| **自定义** | `custom` | - | 用户自行填写 | - |

**当前已有**：7 个 provider（openai, anthropic, deepseek, zhipu, moonshot, qwen, custom）
**需新增**：5 个国内主流厂商 + 1 个聚合平台 = **6 个新 provider**
- 火山引擎 (volcengine)
- 百度千帆 (qianfan)
- 零一万物 (yi)
- 讯飞星火 (spark)
- OpenRouter (openrouter)

> 注：Anthropic 虽然原生不是 OpenAI 兼容格式，但已有 `@ai-sdk/anthropic` 支持，且用户已在用，保留。

### 1.3 各厂商 /models 接口兼容性

| 厂商 | /models 接口 | 说明 |
|------|-------------|------|
| OpenAI | ✅ 支持 | 标准接口 |
| Anthropic | ❌ 不支持 | 返回预设列表 |
| DeepSeek | ✅ 支持 | OpenAI 兼容 |
| 智谱 | ✅ 支持 | OpenAI 兼容 |
| Moonshot | ✅ 支持 | OpenAI 兼容 |
| 通义千问 | ✅ 支持 | OpenAI 兼容 |
| 火山引擎 | ✅ 支持 | OpenAI 兼容 |
| 百度千帆 | ✅ 支持 | OpenAI 兼容 |
| 零一万物 | ✅ 支持 | OpenAI 兼容 |
| 讯飞星火 | ✅ 支持 | OpenAI 兼容 |
| OpenRouter | ✅ 支持 | OpenAI 兼容，数据最丰富（200+ 模型） |

---

## 二、需要修改的文件和模块

### 后端 (youju-server)

| 文件 | 修改内容 |
|------|---------|
| `src/domain/types.ts` | ModelProvider 类型新增：volcengine、qianfan、yi、spark、openrouter |
| `src/presentation/validation/schemas.ts` | PROVIDER_ENUM 同步新增 5 个值 |
| `src/ai/llm.ts` | 1. listModels 函数：新增厂商全部走 OpenAI 兼容路径<br>2. createModel 函数：新增厂商全部走 createOpenAI<br>3. Anthropic 预设模型更新为最新版 |
| `src/infrastructure/ai/llmProvider.ts` | provider 类型扩展 |

### 前端 (youju-app)

| 文件 | 修改内容 |
|------|---------|
| `src/services/modelConfigApi.ts` | ModelProvider 类型扩展 |
| `src/components/workspace/ModelSettingsContent.tsx` | 1. PROVIDER_LABELS 新增 5 个中文标签<br>2. PROVIDER_PRESETS 新增 5 个预设（baseURL + 推荐模型）<br>3. 优化获取模型列表交互 |
| `src/components/workspace/preferenceTabs/AnalysisTab.tsx` | 默认模型下拉列表扩展 |
| `src/stores/useUIPreferenceStore.ts` | 默认模型值更新 |
| `src/constants/demoData.ts` | demo 数据模型名更新 |

---

## 三、实施步骤

### 步骤 1：类型定义扩展（后端 + 前端同步）

- 后端 `ModelProvider` 联合类型新增：`'volcengine' | 'qianfan' | 'yi' | 'spark' | 'openrouter'`
- 后端 Zod schema `PROVIDER_ENUM` 同步新增
- 前端 `ModelProvider` 类型同步新增
- 确保前后端类型完全一致

### 步骤 2：后端 AI 调用适配

- `createModel` 函数中新增厂商全部走 `createOpenAI` 兼容路径
- 无需新增任何 SDK 依赖
- 已有 anthropic / deepseek 保持现有 SDK 不变

### 步骤 3：后端 listModels 函数增强

- 新增的 volcengine / qianfan / yi / spark / openrouter 全部走标准 OpenAI 兼容路径：
  - `GET {baseURL}/models`
  - 解析 `{ data: [{ id, name, ... }] }` 格式
- **Anthropic**：更新预设列表为最新版（Claude Sonnet 5、Opus 4 等）
- 异常处理保持统一

### 步骤 4：前端服务商预设更新

- `PROVIDER_LABELS` 新增 5 个中文标签：
  - volcengine → "火山引擎 (豆包)"
  - qianfan → "百度千帆 (文心)"
  - yi → "零一万物 (Yi)"
  - spark → "讯飞星火"
  - openrouter → "OpenRouter"
- `PROVIDER_PRESETS` 新增 5 个预设配置：
  - baseURL 预填
  - 推荐模型预填
- 选择服务商时自动填充 baseURL 和默认模型

### 步骤 5：前端模型获取交互优化

- 确保"获取模型列表"按钮在 baseURL + API Key 都有值时可点击
- OpenRouter 模型列表可能非常多（200+）：
  - 前端下拉框已有 `max-h-60` 滚动支持
  - 按返回顺序展示（OpenRouter 已按推荐度排序）
  - 显示 name + id 两行，id 用等宽字体

### 步骤 6：默认模型与预设更新

- AnalysisTab 下拉列表新增更多模型选项
- 默认模型从 `gpt-4.5` → `gpt-5.5`
- 各厂商推荐模型更新为最新版
- demo 数据同步更新

### 步骤 7：类型检查与验证

- 前端 `npx tsc --noEmit`
- 后端 `npx tsc --noEmit`
- 确保零报错

---

## 四、依赖与注意事项

### 4.1 无新增依赖

所有新增厂商全部走 OpenAI 兼容路径，**无需安装任何新 SDK 包**。

### 4.2 模型命名差异

各厂商模型命名规则不同：
- OpenAI：`gpt-5.5`、`gpt-4o`
- 火山引擎：`doubao-seed-2-1-pro-260628`（带版本号后缀）
- 通义千问：`qwen3.7-max`
- OpenRouter：`provider/model-name`（如 `anthropic/claude-sonnet-5`）

前端显示策略：
- 主行显示 `name`（友好名称）
- 次行显示 `id`（模型 ID，等宽字体）
- 用户选择后填充 `id` 到输入框

### 4.3 向后兼容

- 新增 provider 不影响已有配置
- 已有 custom provider 继续可用
- 数据库中存储的 provider 字段为 string，无需迁移

### 4.4 错误容错

- 部分厂商的 `/models` 接口可能不稳定或返回格式不同
- 统一错误处理：返回错误信息 + 提示用户手动输入模型名
- 不阻塞核心功能（用户仍可手动填写模型名）

---

## 五、风险与应对

| 风险 | 影响 | 应对方案 |
|------|------|---------|
| 某厂商 /models 接口返回格式不同 | 获取模型列表失败 | 降级方案：用户可手动输入模型名，不影响使用 |
| OpenRouter 模型太多（200+） | 下拉框渲染慢 | 已有 max-h-60 滚动容器，虚拟滚动非必需 |
| 国内厂商 API 文档变更快 | 预设 URL 过期 | 用户可自行修改 baseURL，提供灵活配置 |
| 模型命名差异大 | 用户困惑 | 显示 name + id 两行，清晰展示 |

---

## 六、验证标准

1. ✅ 前后端 TypeScript 编译零报错
2. ✅ 模型设置中可选择 13 种服务商（含 custom）
3. ✅ 选择服务商后自动填充 baseURL 和推荐模型
4. ✅ 点击"获取模型列表"能正确返回各厂商模型
5. ✅ OpenRouter 能获取到大量模型
6. ✅ 选择模型后自动填充到输入框
7. ✅ 测试连接功能正常
8. ✅ 默认模型下拉列表包含最新模型选项
