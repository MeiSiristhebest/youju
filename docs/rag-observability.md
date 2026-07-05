# RAG 可观测性：Langfuse 集成

## 概述

有据 RAG 对话系统通过 [Langfuse](https://langfuse.com/) 记录每次对话的全链路 trace，涵盖 LLM 调用、工具调用（searchDocs 检索）、token 用量与延迟。运维与开发人员可在 Langfuse 面板中回放对话链路、定位性能瓶颈与异常。

## 集成方式

### 1. 环境变量配置

在后端 `youju-server/.env` 中配置以下变量即可启用 Langfuse trace：

```bash
# Langfuse 可观测
LANGFUSE_SECRET=pk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

- `LANGFUSE_SECRET`：Langfuse Secret Key（仅配置此项即启用 telemetry）
- `LANGFUSE_PUBLIC_KEY`：Langfuse Public Key
- `LANGFUSE_HOST`：Langfuse 面板地址，云端默认 `https://cloud.langfuse.com`，自建部署时改为自建地址

> 未配置 `LANGFUSE_SECRET` 时，telemetry 自动降级关闭，不影响对话正常流程。

在前端 `youju-app/.env` 中配置面板地址以生成"查看 trace"链接：

```bash
VITE_LANGFUSE_HOST=https://cloud.langfuse.com
```

### 2. 后端 telemetry 实现

Langfuse 集成通过 Vercel AI SDK 的 `experimental_telemetry` 字段实现，位于 `youju-server/src/ai/adapters/chatAdapter.ts`：

```ts
const telemetry = process.env.LANGFUSE_SECRET
  ? {
      isEnabled: true,
      functionId: `chat-${options.conversationId}`,
      metadata: {
        userId: options.userId,
        sessionId: options.sessionId,
        conversationId: options.conversationId,
        messageId: options.messageId,
      },
    }
  : undefined
```

仅当 `LANGFUSE_SECRET` 环境变量存在时启用 telemetry，否则置为 `undefined`，对话流程不受影响。

### 3. trace metadata 字段

每次对话 trace 携带以下 metadata，用于在 Langfuse 面板中按维度筛选与关联：

| 字段             | 说明                         | 来源                              |
| ---------------- | ---------------------------- | --------------------------------- |
| `userId`         | 用户 ID（tenant 隔离标识）   | `ChatStreamOptions.userId`        |
| `sessionId`      | 会话 session ID              | `ChatStreamOptions.sessionId`     |
| `conversationId` | 对话 ID                      | `ChatStreamOptions.conversationId`|
| `messageId`      | 当前 user message ID         | `ChatStreamOptions.messageId`     |

`messageId` 由 `chatService.sendMessage` 在持久化 user message 后传入，确保 trace 可精确关联到单条消息。

## Langfuse 自动捕获内容

启用 telemetry 后，Langfuse 自动捕获以下信息：

- **LLM 调用**：模型名、输入/输出 token 数、延迟、system/user prompt
- **工具调用（searchDocs）**：检索查询词、检索结果（citations）、执行耗时
- **多步编排**：`stopWhen: isStepCount(3)` 控制的多轮工具调用链路
- **token 用量**：prompt tokens + completion tokens
- **错误与异常**：调用失败时的错误堆栈

## 查看 trace

### 方式一：前端"查看 trace"链接

在对话界面中，assistant 消息操作栏（hover 显示）包含"查看 trace"按钮（ExternalLink 图标）。仅当该消息存在 `langfuseTraceId` 时显示，点击在新窗口打开 Langfuse 面板对应 trace 页面：

```
${VITE_LANGFUSE_HOST}/trace/${langfuseTraceId}
```

### 方式二：Langfuse 面板直接查看

访问 Langfuse 面板（`LANGFUSE_HOST`），在 Traces 列表中按 `userId` / `sessionId` / `conversationId` / `messageId` 筛选定位。

## 与 chatAdapter 的关系

`chatAdapter`（`youju-server/src/ai/adapters/chatAdapter.ts`）是基于 Vercel AI SDK `streamText` 实现的默认 `AIChatPort`，是 RAG 对话的核心编排层：

- 通过 `searchDocs` 工具调用 `retrievalService.retrieve` 实现检索增强
- 通过 `experimental_telemetry` 集成 Langfuse，将上述全链路自动上报
- 完成后 `chatService` 将 `result.traceId` 持久化到 `messages.langfuse_trace_id` 字段，供前端构建查看链接

```
chatService.sendMessage
  → 持久化 user message（获得 messageId）
  → chatAdapter.chatStream（配置 experimental_telemetry，携带 messageId）
    → streamText + searchDocs 工具（Langfuse 自动捕获）
  → 持久化 assistant message（写入 langfuse_trace_id）
  → 前端渲染"查看 trace"链接
```
