# Verification Checklist

> 对应 spec.md 中 ADDED / MODIFIED Requirements 的验收点。每完成一项打勾。

## 一、数据基础设施层

- [x] `postgresSchema.ts` 顶部追加 `CREATE EXTENSION IF NOT EXISTS vector`
- [x] `source_chunks` 表字段完整：`id / source_id / parent_chunk_id / chunk_index / content / char_offset_start / char_offset_end / heading_path / token_count / embedding / embed_status / tsv / created_at`
- [x] `source_chunks.embedding` 列类型为 `vector(1024)`，HNSW 索引已创建
- [x] `source_chunks.tsv` 列类型为 `tsvector`，GIN 索引已创建
- [x] `conversations` 表字段完整：`id / user_id / session_id / title / scenario_type / source_ids / context_source_ids / deleted_at / created_at / updated_at`
- [x] `messages` 表字段完整：`id / conversation_id / role / content / tool_calls / citations / parent_message_id / is_archived / is_partial / feedback / langfuse_trace_id / created_at`
- [x] `sqliteSchema.ts` 提供降级 schema（`embedding` 改为 TEXT 存 JSON，`tsv` 省略）
- [ ] 双驱动 schema 一致性测试通过【未通过原因：仅 SQLite 单端测试（migration.test.ts），未发现 Postgres/SQLite 双驱动一致性专门测试】
- [x] `chunkRepository` 提供 `insertChunks / findBySourceId / deleteBySourceId / vectorSearch / fullTextSearch / findParentChunk / updateEmbedStatus`
- [x] `conversationRepository` 提供 `create / list / findById / updateTitle / softDelete / findByUserId`
- [x] `messageRepository` 提供 `create / findByConversationId / archive / markPartial / updateFeedback / countByConversationId`
- [x] 所有 Repository 查询方法均使用 `buildDataScopeWhere` 实施 tenant 隔离
- [x] `app.ts` DI 装配新 Repository 完成

## 二、文档分块与嵌入层

- [x] `chunkService.chunkAndEmbed(source)` 在素材入库后异步触发
- [x] chunker 实现"文档结构感知 + 递归字符分块"双层策略
- [x] 中文分隔符优先级：`\n\n` > `\n` > `。` > `！` > `？` > `；` > `，`
- [x] Parent-Child 双层分块：parent 1024 token，child 256 token，overlap 15%
- [x] 每个 chunk 记录 `char_offset_start / char_offset_end / heading_path / token_count`
- [x] Embedding 默认使用 BGE-M3（1024 维），备选 OpenAI text-embedding-3-large
- [x] Embedding 失败重试：指数退避 3 次（1s / 2s / 4s）
- [x] Embedding 失败后标记 `embed_status = 'failed'`
- [x] 未配置 API Key 时降级为 Mock 向量（仅本地开发）
- [x] 删除素材时级联清理 `source_chunks` 表中对应记录
- [x] `POST /api/v1/sources/:id/reindex` 端点支持手动重新分块嵌入
- [ ] 全过程通过 `analysis_logs` 记录（log_group_id = `embed-{sourceId}`）【未通过原因：chunkService 未实现 analysis_logs 写入逻辑，未发现 log_group_id=`embed-{sourceId}` 的日志记录】
- [x] 单元测试覆盖：中文长文本分块、Parent-Child 关系、offset 准确性、批量嵌入、失败重试

## 三、RAG 检索能力层

- [x] `retrievalService` 编排：embedQuery → denseSearch → sparseSearch → RRF 融合 → rerank → 阈值过滤
- [x] denseSearch：通过 `chunkRepository.vectorSearch` 检索 Top 50（用 `<=>` 余弦距离）
- [x] sparseSearch：通过 `chunkRepository.fullTextSearch` 检索 Top 50（用 `tsvector` + `plainto_tsquery`）
- [x] RRF 融合公式：`score = Σ 1/(60 + rank_i)`，按 score 降序取 Top 20
- [x] Reranker 默认 BGE-Reranker-v2-m3，备选 Jina / Cohere
- [x] 阈值过滤：rerank score < `VECTOR_SIMILARITY_THRESHOLD`（默认 0.65）的 chunk 被过滤
- [x] 检索结果映射到 parent chunk 提供完整上下文
- [x] 检索范围受 tenant 隔离（`user_id` 或 `session_id` 匹配）
- [x] "指定素材对话"进一步过滤 `source_id IN (selected)`
- [x] 检索全过程通过 `analysis_logs` 记录（log_group_id = `retrieve-{messageId}`）
- [x] `POST /api/v1/retrieve` 内部端点可调试
- [x] 单元测试覆盖：RRF 融合正确性、阈值过滤、parent chunk 映射

## 四、对话编排层

- [x] `AIChatPort` 接口定义完整
- [x] `chatAdapter` 基于 Vercel AI SDK `streamText` + `tool`（searchDocs）+ `maxSteps: 3`
- [x] `searchDocs` 工具 inputSchema 用 Zod 校验，execute 调用 retrievalService
- [x] `chat.system.md` 约束：仅基于检索文档回答 / 引用标注 `[n]` / 不编造
- [x] `chat.user.ts` 提供 `buildChatUserPrompt` 函数
- [x] Prompt 版本化机制复用 `prompts/versions/v1/`
- [x] `chatService.sendMessage` 编排全流程：加载历史 → 摘要压缩 → 持久化 user message → chatStream → 持久化 assistant message
- [x] 历史超过 8 轮触发 `summarizeHistory` 压缩，原消息标记 `is_archived`
- [x] 第一轮对话后 LLM 自动生成会话标题
- [x] Prompt Injection 检测：regex + 关键词，注入时追加防护提示或拒绝
- [x] Mock 兜底：未配置 API Key 时返回预设回答
- [x] 单元测试覆盖：历史加载、摘要压缩、注入检测

## 五、流式 SSE 对话端点

- [x] `POST /api/v1/chat/conversations/:id/messages/stream` 端点实现
- [x] 响应头：`Content-Type: text/event-stream / Cache-Control: no-cache / Connection: keep-alive / X-Accel-Buffering: no`
- [x] SSE 事件类型完整：`init / token / tool_call / citation / complete / error`
- [ ] `init` 事件立即发送：`{ messageId, conversationId }`【未通过原因：init 事件仅发送 `{ conversationId }`，缺少 messageId 字段（chat.ts 第 135 行 sendEvent('init', { conversationId })）】
- [x] `tool_call` 事件：`{ tool: 'searchDocs', query }`
- [x] `citation` 事件：`{ chunks: [{ chunkId, sourceId, sourceName, quote, score }] }`
- [x] `token` 事件持续发送：`{ delta: 'token 内容' }`
- [x] `complete` 事件：`{ messageId, tokenUsage, latencyMs }`
- [x] `error` 事件：`{ code, message }` 并关闭连接
- [x] 客户端中断时 `abortController.abort()`，已生成部分标记 `is_partial` 持久化
- [ ] `chatRateLimiter` 30 req/min，超限返回 429 + `Retry-After`【未通过原因：rateLimiter.ts formatErrorResponse 仅返回 429 JSON，未设置 Retry-After header；createLazyRateLimiter 配置 legacyHeaders: false，不会自动生成 Retry-After】
- [x] 完整端点清单：conversations CRUD / messages stream / feedback / regenerate
- [x] Zod schema 验证：`chatCreateSchema / chatMessageSchema / chatFeedbackSchema`
- [x] 集成测试：创建会话 → 发送消息 → 验证 SSE 事件序列 → 验证消息持久化

## 六、前端状态管理层

- [x] `types/chat.ts` 类型定义完整：`Conversation / Message / Citation / ChatStreamEvent / ContextScope`
- [x] `useChatStore` 字段完整：`conversations / activeConversationId / messages / streaming / streamingMessage / isRetrieving / retrievedChunks / contextScope`
- [x] actions 完整：`createConversation / loadConversations / selectConversation / sendMessage / abortStream / regenerateMessage / deleteConversation / renameConversation / setContextScope`
- [x] 启用 persist + partialize，持久化 `conversations / activeConversationId / contextScope`
- [x] `chatApi.ts` 封装完整：CRUD + SSE 流式
- [x] SSE 解析提取为 `lib/sseParser.ts` 公共工具
- [x] `useChat.ts` hook 封装 React Query mutation + 流式处理
- [ ] 错误处理：网络失败重试 2 次，失败 toast 反馈【未通过原因：useChat.ts 未实现网络失败重试 2 次逻辑，仅依赖 React Query mutation 默认行为；toast 反馈已实现】
- [x] abort 支持完整

## 七、前端对话 UI 层

- [x] `ChatPanel` 主容器布局：顶部标题栏 + 中间消息流（flex-1 overflow-y-auto）+ 底部输入区
- [x] 自动滚动到底部，用户上滚时不强制
- [x] "滚动到最新"按钮：距底 > 200px 显示
- [x] GSAP 入场动画，尊重 `prefers-reduced-motion`
- [x] 空状态展示 ChatEmpty：推荐问题 + 引导
- [x] `ChatMessage` 消息气泡：user 右对齐（accent 色）/ assistant 左对齐（paper 色）
- [x] assistant 消息下方渲染 citations 引用标签
- [x] hover assistant 消息显示操作栏：复制 / 重新生成 / 反馈
- [x] `ChatStreamRenderer` 流式渲染，复用 TypewriterText 逻辑
- [x] typing 指示器（三个点 pulse 动画）
- [x] `tool_call` 事件触发"正在检索文档..."加载态
- [x] 用户可点击"停止"按钮中断生成
- [x] `ChatInput` 输入区：textarea + 发送按钮 + 上下文范围选择器
- [x] Enter 发送 / Shift+Enter 换行，textarea 自适应高度
- [x] 上下文范围下拉：全部素材 / 当前任务素材 / 指定素材
- [x] "指定素材"弹出素材多选弹窗（shadcn Dialog）
- [x] 发送按钮在流式过程中变为"停止"按钮
- [x] `ChatCitation` 引用标签 + popover
- [x] popover 内容：原文片段 + 来源名 + 置信度 + "查看原文"按钮
- [x] click 引用标签 → 打开 SourceDetailModal 高亮
- [x] rerank score < 0.5 的引用显示"低可信"标识
- [x] `ChatHistorySidebar` 会话历史列表
- [x] 列表项：标题 + 最新消息预览 + 相对时间
- [x] 单击切换 / 双击重命名 / 右键菜单
- [x] 删除操作改为 5 秒撤销 toast
- [x] 无引用回答显示警告条 + "重新检索并回答"按钮

## 八、工作台集成层

- [x] `WorkspaceTabs` 新增固定"对话"tab（不可关闭，icon=MessageCircle）
- [x] 切换到"对话"tab 时主区域显示 ChatPanel
- [x] `WorkspaceSidebar` "更多工具"分组新增"AI 对话"入口
- [x] `WorkspacePage` 接入 useChatStore + useChat hook
- [x] `useWorkspaceHandlers` 新增对话相关 handler
- [x] ChatHistorySidebar 在 sidebar 展开显示
- [x] `CommandPalette` "AI"分组新增 `ai_chat_new / ai_chat_open / ai_chat_ask_{scenarioId}`
- [x] 命令支持拼音匹配（"dh" 匹配"对话"）
- [x] 最近 5 条对话命令记忆到 `youju_recent_commands`
- [x] `Ctrl+J` 快捷键切换到"对话"tab
- [x] `KeyboardShortcutsModal` 文档新增"Ctrl+J - 切换到 AI 对话"
- [x] 快捷键提示气泡在 sidebar 入口展示

## 九、可观测与评估层

- [x] `streamText` 配置 `experimental_telemetry` 集成 Langfuse
- [x] telemetry metadata 包含 `userId / sessionId / conversationId / messageId`
- [x] `.env.example` 新增 `LANGFUSE_SECRET / LANGFUSE_PUBLIC_KEY / LANGFUSE_HOST`
- [x] ChatMessage 操作栏新增"查看 trace"链接（仅当 `langfuse_trace_id` 存在）
- [x] RAGAS 评估集 `dataset.json` 含 20+ 标注样本
- [x] RAGAS 4 指标计算：Faithfulness / Answer Relevancy / Context Precision / Context Recall
- [x] `pnpm test:rag` 脚本可执行
- [x] 评估报告生成到 `docs/rag-eval-report.md`
- [x] 阈值：Faithfulness < 0.85 / Answer Relevancy < 0.7 时 CI 失败

## 十、长期记忆层（可选）

- [x] `memory` 表创建：`id / user_id / content / embedding / created_at`
- [x] ChatMessage 操作栏新增"记住这个偏好"按钮（仅 user 消息）
- [x] `POST /api/v1/chat/memory` 端点向量化存入 memory 表
- [x] 会话开始时检索 Top 3 相关记忆注入系统提示
- [x] `PreferencePanel` 新增"长期记忆"管理区，支持查看 / 删除
- [x] 长期记忆受 tenant 隔离（`user_id` 匹配）

## 十一、安全与隔离层

- [x] 所有检索 / 对话查询 WHERE 子句包含 `user_id OR session_id` 条件
- [ ] Postgres RLS 策略在 `source_chunks / conversations / messages` 表上启用【未通过原因：postgresSchema.ts 未定义 RLS 策略（无 ALTER TABLE ... ENABLE ROW LEVEL SECURITY / CREATE POLICY 语句），隔离完全依赖应用层 buildDataScopeWhere】
- [x] 用户 A 无法检索到用户 B 的素材 chunks（集成测试验证）
- [ ] 用户 A 无法查看用户 B 的会话（集成测试验证）【未通过原因：tenant-isolation.test.ts 仅覆盖 sources 表隔离，未覆盖 conversations/messages 表跨租户访问的集成测试】
- [x] Prompt Injection 检测：regex + 关键词
- [x] 检测到注入时追加防护提示
- [x] 检索内容作为 `tool result` 注入，不混入 `user` 消息
- [x] 严重注入时拒绝回答并提示"检测到不安全输入"

## 十二、环境变量与配置层

- [x] `youju-server/.env.example` 新增 EMBEDDING / RERANKER / VECTOR_SIMILARITY_THRESHOLD / CHAT_MAX_TOKENS / LANGFUSE 变量
- [x] `youju-server/.env.example` 补充 `DB_DRIVER / CRON_SECRET / URL_FETCH_ALLOWLIST / URL_FETCH_DENYLIST`
- [x] `youju-app/.env.example` 新增 `VITE_ENABLE_CHAT`
- [x] `youju-app/src/vite-env.d.ts` 新增 `VITE_ENABLE_CHAT` 类型
- [x] `edgeone/edgeone.config.ts` 环境变量清单追加新变量
- [x] `infrastructure/env.ts` 新增配置读取

## 十三、架构合规层

- [x] 5 层隔离：UI（chat 组件）→ API（chat 路由）→ Domain（chatService）→ AI（chatAdapter）→ Data（chatRepository）
- [x] 跨层直接调用禁止（验证：grep 检查无 chat 组件直接 import Repository）
- [x] AI 与业务解耦：chat.system.md 仅含表达，业务规则在 chatService / chatRules
- [x] 提示词版本化：chat prompt 纳入 `prompts/versions/v1/`，记录 prompt_version
- [x] 数据事件驱动：每条消息持久化到 `messages` 表，支持回放
- [x] Tenant 隔离：所有新表含 `user_id` + `session_id`，复用 `buildDataScopeWhere`
- [x] Serverless 兼容：embedding 长任务异步化，SSE 控制在 30s 内
- [ ] 单文件 ≤ 400 行（拆分原则遵循 workbench-parity-upgrade spec）【未通过原因：chat.ts 407 行、PreferencePanel.tsx 979 行超过 400 行阈值（chatService.ts 372 行、ChatPanel.tsx 293 行、ChatInput.tsx 391 行均在阈值内）】
- [x] shadcn 组件复用：Dialog / Button / Tooltip / Popover / Command 等

## 十四、编译与回归

- [x] `pnpm --filter youju-app exec tsc --noEmit` 零错误
- [x] `pnpm --filter youju-server exec tsc --noEmit` 零错误
- [x] `pnpm exec biome check` 无 lint 错误
- [x] `pnpm --filter youju-app test` 全部通过
- [x] `pnpm --filter youju-server test` 全部通过
- [ ] `pnpm test:rag` RAGAS 评估指标达标【需手动验证】
- [ ] 对话主流程手动回归：上传素材 → 等待 embed → 新建对话 → 提问 → 查看 SSE 流式 → 点击引用跳转【需手动验证】
- [ ] 多会话场景回归：新建多个对话 → 切换 → 重命名 → 删除（撤销）【需手动验证】
- [ ] 上下文范围切换回归：全部素材 / 指定素材 / 当前任务素材【需手动验证】
- [ ] 命令面板回归：Ctrl+K → ai_chat_new → 拼音匹配 → 子菜单【需手动验证】
- [ ] 快捷键回归：Ctrl+J 切换对话 tab【需手动验证】
- [ ] 暗色模式全流程回归【需手动验证】
- [ ] 移动端（375px 视口）对话 UI 回归【需手动验证】
- [ ] `prefers-reduced-motion` 跳过 GSAP 动画【需手动验证】
- [ ] 多租户隔离回归：用户 A 数据对用户 B 不可见【需手动验证】
