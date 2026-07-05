# Tasks

> 按 4 个阶段递进交付：数据基础设施 → RAG 检索能力 → 对话编排层 → 前端对话 UI。每阶段可独立交付用户可见价值。
> P0 = 必须前置（数据与检索能力），P1 = 核心体验（对话 + UI），P2 = 增强（可观测 / 评估 / 长期记忆）。

## P0 — 数据基础设施（前置所有功能）

- [x] Task 1: 启用 pgvector 扩展并新增 3 张表的 schema
  - [x] SubTask 1.1: 在 `postgresSchema.ts` 顶部追加 `CREATE EXTENSION IF NOT EXISTS vector`
  - [x] SubTask 1.2: 新增 `source_chunks` 表：`id / source_id / parent_chunk_id / chunk_index / content / char_offset_start / char_offset_end / heading_path / token_count / embedding (vector(1024)) / embed_status / tsv (tsvector) / created_at`，HNSW 索引 on `embedding`，GIN 索引 on `tsv`
  - [x] SubTask 1.3: 新增 `conversations` 表：`id / user_id / session_id / title / scenario_type / source_ids (JSON) / context_source_ids (JSON) / deleted_at / created_at / updated_at`
  - [x] SubTask 1.4: 新增 `messages` 表：`id / conversation_id / role (user/assistant/system) / content / tool_calls (JSON) / citations (JSON) / parent_message_id / is_archived / is_partial / feedback / langfuse_trace_id / created_at`
  - [x] SubTask 1.5: 在 `sqliteSchema.ts` 提供降级 schema（`embedding` 改为 TEXT 存 JSON，`tsv` 省略），保持双驱动一致
  - [x] SubTask 1.6: 在 `POSTGRES_INDEXES` 数组追加 `source_chunks` 的 HNSW 与 GIN 索引定义
  - [x] SubTask 1.7: 编写迁移测试 `tests/migration.test.ts`，验证新表创建成功

- [x] Task 2: 新增 3 个 Repository（chunkRepository / conversationRepository / messageRepository）
  - [x] SubTask 2.1: 在 `domain/ports/repositories.ts` 新增 3 个 Repository 接口
  - [x] SubTask 2.2: 在 `data/repositories/` 新增 3 个 Repository 工厂函数，复用 `DatabaseDriver`
  - [x] SubTask 2.3: chunkRepository 提供 `insertChunks / findBySourceId / deleteBySourceId / vectorSearch / fullTextSearch / findParentChunk / updateEmbedStatus`
  - [x] SubTask 2.4: conversationRepository 提供 `create / list / findById / updateTitle / softDelete / findByUserId`
  - [x] SubTask 2.5: messageRepository 提供 `create / findByConversationId / archive / markPartial / updateFeedback / countByConversationId`
  - [x] SubTask 2.6: 在 `app.ts` DI 装配新 Repository，注入到对应 Service
  - [x] SubTask 2.7: 单元测试覆盖关键查询方法（含 tenant 隔离 WHERE 子句）

- [x] Task 3: 新增 chunkService 与文档分块策略
  - [x] SubTask 3.1: 在 `domain/services/chunkService.ts` 实现 `chunkAndEmbed(source: Source): Promise<void>`
  - [x] SubTask 3.2: 在 `infrastructure/fileParser/chunker.ts` 实现 `chunkDocument(text, options)` 函数
  - [x] SubTask 3.3: chunker 实现"文档结构感知（Markdown 标题层级）+ 递归字符分块"双层策略
  - [x] SubTask 3.4: 中文分隔符优先级：`\n\n` > `\n` > `。` > `！` > `？` > `；` > `，`
  - [x] SubTask 3.5: Parent-Child 双层分块：parent 1024 token，child 256 token，overlap 15%
  - [x] SubTask 3.6: 每个 chunk 记录 `char_offset_start / char_offset_end / heading_path / token_count`
  - [x] SubTask 3.7: 在 `sourceService.createSource` 末尾追加 `chunkService.chunkAndEmbed(source)` 异步调用（不阻塞主流程）
  - [x] SubTask 3.8: 在 `sourceService.deleteSource` 追加 `chunkRepository.deleteBySourceId(sourceId)` 调用
  - [x] SubTask 3.9: 单元测试：中文长文本分块结果正确性、Parent-Child 关系、offset 准确性

- [x] Task 4: 新增 embeddingService 与 EmbeddingPort
  - [x] SubTask 4.1: 在 `domain/ports/aiPorts.ts` 新增 `EmbeddingPort { embed(texts: string[]): Promise<{ dense: number[][], sparse?: ... }[]> }`
  - [x] SubTask 4.2: 在 `ai/adapters/embeddingAdapter.ts` 实现默认 EmbeddingPort
  - [x] SubTask 4.3: 默认使用 BGE-M3 API（通过 `EMBEDDING_BASE_URL` + `EMBEDDING_API_KEY` 配置），维度 1024
  - [x] SubTask 4.4: 备选支持 OpenAI text-embedding-3-large（3072 维）通过环境变量切换
  - [x] SubTask 4.5: 在 `ai/llm.ts` 添加 `callEmbedding(texts: string[], config?)` 函数，复用 `aiRequestQueue` 限流
  - [x] SubTask 4.6: 失败重试：指数退避 3 次（1s / 2s / 4s）
  - [x] SubTask 4.7: Mock 兜底：未配置 API Key 时返回随机向量（仅本地开发）
  - [x] SubTask 4.8: 单元测试：批量嵌入、失败重试、降级 Mock

## P0 — RAG 检索能力

- [x] Task 5: 新增 retrievalService 与混合检索实现
  - [x] SubTask 5.1: 在 `domain/ports/aiPorts.ts` 新增 `RetrievalPort { retrieve(query, options): Promise<RetrievalResult> }`
  - [x] SubTask 5.2: 在 `domain/services/retrievalService.ts` 编排：embedQuery → denseSearch → sparseSearch → RRF 融合 → rerank → 过滤阈值
  - [x] SubTask 5.3: denseSearch：通过 `chunkRepository.vectorSearch(queryVector, limit=50, tenantCtx, sourceFilter?)`
  - [x] SubTask 5.4: sparseSearch：通过 `chunkRepository.fullTextSearch(query, limit=50, tenantCtx, sourceFilter?)`
  - [x] SubTask 5.5: RRF 融合实现：`score = Σ 1/(60 + rank_i)`，按 score 降序取 Top 20
  - [x] SubTask 5.6: 在 `ai/adapters/retrievalAdapter.ts` 实现 rerank，默认调 BGE-Reranker-v2-m3 API（`RERANKER_API_KEY`）
  - [x] SubTask 5.7: rerank 备选：Jina Reranker v2 API、Cohere Rerank 3.5
  - [x] SubTask 5.8: 阈值过滤：rerank score < `VECTOR_SIMILARITY_THRESHOLD`（默认 0.65）的 chunk 被过滤
  - [x] SubTask 5.9: 检索结果映射到 parent chunk 提供完整上下文
  - [x] SubTask 5.10: 检索全过程通过 `analysis_logs` 记录（log_group_id = `retrieve-{messageId}`）
  - [x] SubTask 5.11: 单元测试：RRF 融合正确性、阈值过滤、parent chunk 映射

- [x] Task 6: 新增 `/api/v1/retrieve` 内部端点（供调试与对话调用）
  - [x] SubTask 6.1: 在 `presentation/routes/` 新增 `retrieve.ts` 路由
  - [x] SubTask 6.2: 端点 `POST /api/v1/retrieve`：body `{ query, sourceIds?, topK? }`，返回 `{ chunks: RetrievedChunk[], latencyMs }`
  - [x] SubTask 6.3: 复用 `getUserIdAndSessionId` 鉴权 + `chatRateLimiter`（30 req/min）
  - [x] SubTask 6.4: Zod schema 验证：`retrieveSchema`
  - [x] SubTask 6.5: 集成测试：上传素材 → 等待 embed 完成 → 调用 retrieve → 验证返回 chunks

- [x] Task 7: 修复素材入库与删除流程的级联钩子
  - [x] SubTask 7.1: 在 `sourceService.createSource` 末尾追加 `void chunkService.chunkAndEmbed(source).catch(err => logError(...))`
  - [x] SubTask 7.2: 在 `sourceService.deleteSource` 追加 `await chunkRepository.deleteBySourceId(sourceId)`
  - [x] SubTask 7.3: 新增 `POST /api/v1/sources/:id/reindex` 端点，手动触发重新分块嵌入
  - [x] SubTask 7.4: 在 `sources.ts` 路由暴露 reindex 端点，复用 `analyzeRateLimiter`
  - [x] SubTask 7.5: 集成测试：创建素材 → 验证 chunks 写入 → 删除素材 → 验证 chunks 清理

## P1 — 对话编排层

- [x] Task 8: 新增 AIChatPort 与 chatAdapter
  - [x] SubTask 8.1: 在 `domain/ports/aiPorts.ts` 新增 `AIChatPort { chatStream(messages, options, callbacks): Promise<ChatResult> }`
  - [x] SubTask 8.2: 在 `ai/adapters/chatAdapter.ts` 实现默认 AIChatPort
  - [x] SubTask 8.3: 基于 Vercel AI SDK `streamText` + `tool`（searchDocs）+ `maxSteps: 3`
  - [x] SubTask 8.4: `searchDocs` 工具：inputSchema 用 Zod 校验 query，execute 调用 retrievalService.retrieve
  - [x] SubTask 8.5: 通过 `experimental_telemetry` 集成 Langfuse（若配置 `LANGFUSE_SECRET`）
  - [x] SubTask 8.6: callbacks：`onToken / onToolCall / onCitation / onComplete / onError`
  - [x] SubTask 8.7: 系统提示从 `prompts/versions/v1/chat.system.md` 加载
  - [x] SubTask 8.8: Mock 兜底：未配置 API Key 时返回预设回答（含 mock citations）

- [x] Task 9: 新增 chat.system.md 与 chat.user.ts 提示词
  - [x] SubTask 9.1: 在 `ai/prompts/versions/v1/` 新增 `chat.system.md`，约束：
    - 仅基于检索文档片段回答
    - 引用必须标注 `[n]` 对应 sources 数组索引
    - 检索不足时回答"知识库中未找到相关内容"
    - 不编造、不基于参数知识回答事实性问题
    - 中文回答，专业但易懂
  - [x] SubTask 9.2: 新增 `chat.user.ts`，提供 `buildChatUserPrompt(content, contextSourceIds?)` 函数
  - [x] SubTask 9.3: 在 `prompts/index.ts` 注册 `chat` prompt 类型，复用版本化机制
  - [x] SubTask 9.4: 在 `domain/rules/` 新增 `chatRules.ts`，含 Prompt Injection 防护规则（regex + 关键词）

- [x] Task 10: 新增 chatService 编排对话全流程
  - [x] SubTask 10.1: 在 `domain/services/chatService.ts` 实现 `sendMessage(conversationId, content, options)`
  - [x] SubTask 10.2: 加载会话历史（最近 8 轮），超过则触发 `summarizeHistory` 压缩
  - [x] SubTask 10.3: `summarizeHistory`：调用 LLM 对最旧 N 条消息生成摘要，原消息标记 `is_archived`
  - [x] SubTask 10.4: 持久化 user message 到 `messages` 表
  - [x] SubTask 10.5: 调用 `chatAdapter.chatStream`，转发 callbacks 给路由层 SSE
  - [x] SubTask 10.6: 完成后持久化 assistant message（含 citations / tool_calls）到 `messages` 表
  - [x] SubTask 10.7: 第一轮对话后调用 LLM 生成会话标题（取首条消息前 20 字或 LLM 摘要）
  - [x] SubTask 10.8: Prompt Injection 检测：调用 `chatRules.detectInjection(content)`，注入防护提示或拒绝
  - [x] SubTask 10.9: 单元测试：历史加载、摘要压缩、注入检测

- [x] Task 11: 新增对话路由与 SSE 流式端点
  - [x] SubTask 11.1: 在 `presentation/routes/chat.ts` 新增路由
  - [x] SubTask 11.2: 端点清单：
    - `POST /api/v1/chat/conversations` 创建会话
    - `GET /api/v1/chat/conversations` 列出会话（分页）
    - `GET /api/v1/chat/conversations/:id/messages` 获取历史消息
    - `POST /api/v1/chat/conversations/:id/messages/stream` 流式发送消息（主入口）
    - `PATCH /api/v1/chat/conversations/:id` 重命名
    - `DELETE /api/v1/chat/conversations/:id` 软删除
    - `POST /api/v1/chat/messages/:id/feedback` 反馈
    - `POST /api/v1/chat/messages/:id/regenerate` 重新生成
  - [x] SubTask 11.3: SSE 实现参考 `analysis.ts` 第 89-192 行，事件类型：`init / token / tool_call / citation / complete / error`
  - [x] SubTask 11.4: 客户端中断处理：`req.on('close')` → `abortController.abort()`，已生成部分标记 `is_partial` 持久化
  - [x] SubTask 11.5: 新增 `chatRateLimiter`（30 req/min）在 `rateLimiter.ts`
  - [x] SubTask 11.6: Zod schema：`chatCreateSchema / chatMessageSchema / chatFeedbackSchema`
  - [x] SubTask 11.7: 在 `presentation/index.ts` 挂载 chat 路由到 `/api/v1/chat`
  - [x] SubTask 11.8: 集成测试：创建会话 → 发送消息 → 验证 SSE 事件序列 → 验证消息持久化

## P1 — 前端对话 UI

- [x] Task 12: 新增前端类型与状态管理
  - [x] SubTask 12.1: 在 `types/chat.ts` 新增类型：`Conversation / Message / Citation / ChatStreamEvent（SSE 联合类型）/ ContextScope`
  - [x] SubTask 12.2: 在 `types/index.ts` 导出新类型
  - [x] SubTask 12.3: 在 `stores/useChatStore.ts` 新增 store，字段：`conversations / activeConversationId / messages / streaming / streamingMessage / isRetrieving / retrievedChunks / contextScope`
  - [x] SubTask 12.4: actions：`createConversation / loadConversations / selectConversation / sendMessage / abortStream / regenerateMessage / deleteConversation / renameConversation / setContextScope`
  - [x] SubTask 12.5: 启用 persist + partialize：持久化 `conversations / activeConversationId / contextScope`
  - [x] SubTask 12.6: 在 `stores/index.ts` 导出 useChatStore

- [x] Task 13: 新增 chatApi 与 useChat hook
  - [x] SubTask 13.1: 在 `services/chatApi.ts` 封装 API：`createConversation / listConversations / getMessages / streamMessage（SSE 手动解析）/ sendFeedback / regenerateMessage / deleteConversation / renameConversation`
  - [x] SubTask 13.2: SSE 解析参考 `useAnalysis.streamAnalyze` 的 `parseSSEEvents`，提取为 `lib/sseParser.ts` 公共工具
  - [x] SubTask 13.3: 在 `hooks/useChat.ts` 封装 React Query mutation + 流式处理
  - [x] SubTask 13.4: 流式状态管理：`isRetrieving / isStreaming / streamingMessage`，abort 支持
  - [x] SubTask 13.5: 错误处理：网络失败重试 2 次（指数退避），失败 toast 反馈
  - [x] SubTask 13.6: 单元测试：SSE 解析、流式状态转换

- [x] Task 14: 新增 ChatPanel 主容器组件
  - [x] SubTask 14.1: 在 `components/chat/ChatPanel.tsx` 实现主容器：顶部标题栏 + 中间消息流 + 底部输入区
  - [x] SubTask 14.2: 消息流使用 `flex-1 min-h-0 overflow-y-auto`，防止内容遮挡
  - [x] SubTask 14.3: 自动滚动到底部：新消息到达时滚动，用户上滚时不强制（监听 scrollTop）
  - [x] SubTask 14.4: "滚动到最新"按钮：距底 > 200px 显示，点击平滑滚动
  - [x] SubTask 14.5: GSAP 入场动画（参考 WorkspaceLayout 模式），尊重 `prefers-reduced-motion`
  - [x] SubTask 14.6: 空状态展示 ChatEmpty：推荐问题 + "选择素材后开始提问"引导
  - [x] SubTask 14.7: 推荐问题点击直接发送到输入框

- [x] Task 15: 新增 ChatMessage 与 ChatStreamRenderer 组件
  - [x] SubTask 15.1: 在 `components/chat/ChatMessage.tsx` 实现消息气泡：user 右对齐（accent 色背景）/ assistant 左对齐（paper 色）
  - [x] SubTask 15.2: assistant 消息下方渲染 citations 引用标签（上标 `[1] [2]`，accent 色小标签）
  - [x] SubTask 15.3: hover assistant 消息显示操作栏：复制 / 重新生成 / 反馈（👍 / 👎）
  - [x] SubTask 15.4: 在 `components/chat/ChatStreamRenderer.tsx` 实现流式渲染，复用 TypewriterText 渲染逻辑
  - [x] SubTask 15.5: 流式过程显示 typing 指示器（三个点 pulse 动画）
  - [x] SubTask 15.6: `tool_call` 事件触发"正在检索文档..."加载态（spinner + 文字）
  - [x] SubTask 15.7: `citation` 事件到达时缓存 citations，`complete` 事件时渲染引用标签
  - [x] SubTask 15.8: 用户可点击"停止"按钮中断生成（调用 `useChat.abortStream`）

- [x] Task 16: 新增 ChatInput 与 ChatCitation 组件
  - [x] SubTask 16.1: 在 `components/chat/ChatInput.tsx` 实现输入区：textarea + 发送按钮 + 上下文范围选择器
  - [x] SubTask 16.2: Enter 发送 / Shift+Enter 换行，textarea 自适应高度（最大 200px）
  - [x] SubTask 16.3: 上下文范围下拉：全部素材 / 当前任务素材 / 指定素材
  - [x] SubTask 16.4: "指定素材"弹出素材多选弹窗（复用 SourcePanel 列表样式 + shadcn Dialog）
  - [x] SubTask 16.5: 发送按钮在流式过程中变为"停止"按钮（图标切换 + 颜色变 danger）
  - [x] SubTask 16.6: 在 `components/chat/ChatCitation.tsx` 实现引用标签 + popover
  - [x] SubTask 16.7: popover 内容：原文片段（前 200 字）+ 来源名 + 置信度 + "查看原文"按钮
  - [x] SubTask 16.8: click 引用标签 → 调用 `onEvidenceClick(sourceId, quote)` → 打开 SourceDetailModal 高亮
  - [x] SubTask 16.9: rerank score < 0.5 的引用显示"低可信"标识（琥珀色边框）

- [x] Task 17: 新增 ChatHistorySidebar 与 ChatEmpty 组件
  - [x] SubTask 17.1: 在 `components/chat/ChatHistorySidebar.tsx` 实现会话历史列表
  - [x] SubTask 17.2: 列表项：会话标题 + 最新消息预览（前 30 字）+ updated_at 相对时间
  - [x] SubTask 17.3: 单击切换会话 / 双击重命名 / 右键菜单（重命名 / 删除）
  - [x] SubTask 17.4: "新建对话"按钮在列表顶部
  - [x] SubTask 17.5: 删除操作改为 5 秒撤销 toast（复用 `useUndoableAction`）
  - [x] SubTask 17.6: 在 `components/chat/ChatEmpty.tsx` 实现空状态：图标 + 推荐问题卡片 + "选择素材后开始提问"引导
  - [x] SubTask 17.7: 推荐问题按当前 scenarioType 动态展示（如 contract 场景展示"这份合同的关键风险是什么？"）

- [x] Task 18: 集成到 WorkspaceTabs 与 WorkspaceSidebar
  - [x] SubTask 18.1: 在 `WorkspaceTabs.tsx` 新增固定"对话"tab（不可关闭，icon=MessageCircle）
  - [x] SubTask 18.2: 切换到"对话"tab 时主区域显示 ChatPanel
  - [x] SubTask 18.3: 在 `WorkspaceSidebar.tsx` "更多工具"分组新增"AI 对话"入口（icon=MessageCircle）
  - [x] SubTask 18.4: 点击入口切换到"对话"tab
  - [x] SubTask 18.5: 在 `WorkspacePage.tsx` 接入 useChatStore + useChat hook
  - [x] SubTask 18.6: 在 `useWorkspaceHandlers.ts` 新增对话相关 handler：`handleNewChat / handleSelectChat / handleDeleteChat / handleRenameChat`
  - [x] SubTask 18.7: ChatHistorySidebar 在 sidebar"更多工具"分组下方展开（参考 ModelSettingsPanel 模式）

- [x] Task 19: 集成到 CommandPalette 与 KeyboardShortcuts
  - [x] SubTask 19.1: 在 `CommandPalette.tsx` "AI"分组新增命令：`ai_chat_new / ai_chat_open / ai_chat_ask_{scenarioId}`
  - [x] SubTask 19.2: `ai_chat_ask_{scenarioId}` 子菜单展开预设问题（按当前 scenarioType 动态生成）
  - [x] SubTask 19.3: 命令支持拼音匹配（"dh" 匹配"对话"）
  - [x] SubTask 19.4: 最近 5 条对话命令记忆到 `youju_recent_commands`
  - [x] SubTask 19.5: 在 `useKeyboardShortcuts.ts` 新增 `Ctrl+J` 切换到"对话"tab
  - [x] SubTask 19.6: 在 `KeyboardShortcutsModal.tsx` 文档新增"Ctrl+J - 切换到 AI 对话"
  - [x] SubTask 19.7: 快捷键提示气泡（shadcn Tooltip）展示在 sidebar"AI 对话"入口

## P2 — 可观测与评估

- [x] Task 20: 集成 Langfuse trace
  - [x] SubTask 20.1: 在 `ai/llm.ts` 的 `callAIStream` 配置 `experimental_telemetry`
  - [x] SubTask 20.2: telemetry metadata 包含 `userId / sessionId / conversationId / messageId`
  - [x] SubTask 20.3: 在 `.env.example` 新增 `LANGFUSE_SECRET / LANGFUSE_PUBLIC_KEY / LANGFUSE_HOST`
  - [x] SubTask 20.4: 在前端 ChatMessage 操作栏新增"查看 trace"链接（仅当 `langfuse_trace_id` 存在）
  - [x] SubTask 20.5: trace 链接打开 Langfuse 面板对应 trace（新窗口）
  - [x] SubTask 20.6: 文档：在 `docs/rag-observability.md` 说明 Langfuse 集成方式

- [x] Task 21: RAGAS 离线评估
  - [x] SubTask 21.1: 在 `youju-server/tests/rag-eval/` 新增评估集 `dataset.json`（20+ 标注样本）
  - [x] SubTask 21.2: 评估样本覆盖：单文档问答、多文档对比、跨文档推理、无答案场景
  - [x] SubTask 21.3: 在 `youju-server/tests/rag-eval/evaluator.ts` 实现 RAGAS 4 指标计算
  - [x] SubTask 21.4: 在 `package.json` 新增 `test:rag` 脚本
  - [x] SubTask 21.5: CI 在 `.github/workflows/ci.yml` 新增 `rag-eval` job（可选，需 secrets）
  - [x] SubTask 21.6: 评估报告生成到 `docs/rag-eval-report.md`，含指标表格 + 失败样本分析
  - [x] SubTask 21.7: 阈值：Faithfulness < 0.85 / Answer Relevancy < 0.7 时 CI 失败

## P2 — 长期记忆（可选）

- [x] Task 22: 跨会话长期记忆
  - [x] SubTask 22.1: 新增 `memory` 表：`id / user_id / content / embedding / created_at`
  - [x] SubTask 22.2: 在 ChatMessage 操作栏新增"记住这个偏好"按钮（仅 user 消息）
  - [x] SubTask 22.3: 点击后调用 `POST /api/v1/chat/memory`，向量化存入 memory 表
  - [x] SubTask 22.4: 会话开始时检索 Top 3 相关记忆注入系统提示
  - [x] SubTask 22.5: 在 `PreferencePanel.tsx` 新增"长期记忆"管理区，支持查看 / 删除
  - [x] SubTask 22.6: 长期记忆受 tenant 隔离（`user_id` 匹配）

## P0 — 环境变量与配置

- [x] Task 23: 更新环境变量与配置文件
  - [x] SubTask 23.1: 在 `youju-server/.env.example` 新增：
    - `EMBEDDING_API_KEY=` / `EMBEDDING_BASE_URL=` / `EMBEDDING_MODEL=bge-m3`
    - `RERANKER_API_KEY=` / `RERANKER_BASE_URL=` / `RERANKER_MODEL=bge-reranker-v2-m3`
    - `VECTOR_SIMILARITY_THRESHOLD=0.65`
    - `CHAT_MAX_TOKENS=4096`
    - `LANGFUSE_SECRET=` / `LANGFUSE_PUBLIC_KEY=` / `LANGFUSE_HOST=`
    - `DB_DRIVER=sqlite`（声明默认值，原文件缺失）
    - `CRON_SECRET=`（声明，原文件缺失）
    - `URL_FETCH_ALLOWLIST=` / `URL_FETCH_DENYLIST=`（声明，原文件缺失）
  - [x] SubTask 23.2: 在 `youju-app/.env.example` 新增 `VITE_ENABLE_CHAT=true`
  - [x] SubTask 23.3: 在 `youju-app/src/vite-env.d.ts` 新增 `VITE_ENABLE_CHAT` 类型
  - [x] SubTask 23.4: 在 `edgeone/edgeone.config.ts` 环境变量清单追加新变量
  - [x] SubTask 23.5: 在 `infrastructure/env.ts` 新增 embedding / reranker / langfuse 配置读取

# Task Dependencies

- **Task 1（schema）是所有后端任务的前置**——表不存在无法实现 Repository / Service
- Task 2（Repository）依赖 Task 1
- Task 3（chunkService）依赖 Task 2，Task 4（embeddingService）独立可并行
- Task 5（retrievalService）依赖 Task 2 + Task 4
- Task 6（retrieve 端点）依赖 Task 5
- Task 7（source 流程改造）依赖 Task 3
- Task 8（chatAdapter）依赖 Task 5
- Task 9（prompts）独立可并行
- Task 10（chatService）依赖 Task 8 + Task 9
- Task 11（chat 路由）依赖 Task 10
- Task 12（前端 store）独立可并行
- Task 13（chatApi + useChat）依赖 Task 11（后端 API）+ Task 12
- Task 14-17（前端组件）依赖 Task 13
- Task 18（WorkspaceTabs 集成）依赖 Task 14-17
- Task 19（命令面板 + 快捷键）依赖 Task 18
- Task 20（Langfuse）依赖 Task 8
- Task 21（RAGAS）依赖 Task 11
- Task 22（长期记忆）依赖 Task 11
- Task 23（环境变量）独立可并行，建议最先完成

# 并行化建议

- **第一波（基础设施并行）**：Task 1 + Task 23 + Task 9（互不影响，是后续所有任务的基础）
- **第二波（数据层并行）**：Task 2 + Task 3 + Task 4（依赖 Task 1）
- **第三波（检索能力并行）**：Task 5 + Task 6 + Task 7（依赖 Task 2/3/4）
- **第四波（对话编排并行）**：Task 8 + Task 10 + Task 11（依赖 Task 5/9）
- **第五波（前端基础并行）**：Task 12 + Task 13（依赖 Task 11）
- **第六波（前端 UI 并行）**：Task 14 + Task 15 + Task 16 + Task 17（依赖 Task 13）
- **第七波（前端集成并行）**：Task 18 + Task 19（依赖 Task 14-17）
- **第八波（增强能力并行）**：Task 20 + Task 21 + Task 22（依赖 Task 11）
