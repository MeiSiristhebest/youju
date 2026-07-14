import type {
  AIConfig,
  AnalyzeResult,
  Evidence,
  ScenarioKnowledge,
  Source,
  SourceChunk,
} from '../types.js'

export interface AIStepInput {
  sources: Source[]
  scenarioType?: string
  scenarioKnowledge?: ScenarioKnowledge[]
  aiConfig?: AIConfig
  previousOutputs: Record<string, unknown>
}

export interface AIStepOutput {
  data: unknown
  modelVersion: string
  promptVersion: string
  tokenPrompt: number
  tokenCompletion: number
  latencyMs: number
  rawOutput?: string
  error?: string
}

export interface AIPipelineStep {
  id: string
  name: string
  execute: (
    input: AIStepInput,
    onProgress?: (update: Record<string, unknown>) => void,
  ) => Promise<AIStepOutput>
}

export interface AnalysisCallbacks {
  onStepStart?: (step: { id: string; name: string }) => void
  onStepComplete?: (step: { id: string; name: string; output: AIStepOutput }) => void
  onStepError?: (step: { id: string; name: string; error: string }) => void
  onProgress?: (state: Record<string, unknown>) => void
}

export interface AnalysisResultSummary {
  result: AnalyzeResult
  steps: Array<{
    id: string
    name: string
    status: string
    modelVersion: string
    promptVersion: string
    tokenPrompt: number
    tokenCompletion: number
    latencyMs: number
  }>
  totalTokens: number
  totalLatencyMs: number
  isMock: boolean
}

export interface AnalysisCheckpoint {
  stepOutputs: Record<string, unknown>
  lastCompletedStepId: string
  lastCompletedStepIndex: number
}

export interface Analyzer {
  analyze(
    sources: Source[],
    options: {
      scenarioType?: string
      scenarioKnowledge?: ScenarioKnowledge[]
      aiConfig?: AIConfig
      isDemo?: boolean
    } & AnalysisCallbacks,
  ): Promise<AnalysisResultSummary>
}

export interface CheckpointCapableAnalyzer extends Analyzer {
  resumeFromCheckpoint(
    sources: Source[],
    checkpoint: AnalysisCheckpoint,
    options: {
      scenarioType?: string
      scenarioKnowledge?: ScenarioKnowledge[]
      aiConfig?: AIConfig
      isDemo?: boolean
    } & Omit<AnalysisCallbacks, 'onProgress'>,
  ): Promise<AnalysisResultSummary>
}

export type AIAnalysisPort = CheckpointCapableAnalyzer

export interface AIDraftPort {
  generateDraft(
    risk: {
      title: string
      description: string
      evidence: Evidence[]
    },
    context?: string,
    stylePref?: {
      formality?: number
      friendliness?: number
      conciseness?: number
      preferredTone?: string
    },
  ): Promise<string>
}

export interface SparseVector {
  indices: number[]
  values: number[]
}

export interface EmbeddingResult {
  dense: number[]
  sparse?: SparseVector
  colbert?: number[][]
}

export interface EmbeddingPort {
  embed(texts: string[]): Promise<EmbeddingResult[]>
  /** 返回当前模型维度（用于 schema vector(N) 校验） */
  getDimension(): number
}

export interface RetrievalQuery {
  text: string
  userId: number | null
  sessionId: string | null
  /** 限定在哪些 source 内检索 */
  sourceFilter?: string[]
  /** 默认 20 */
  topK?: number
  /** 默认 VECTOR_SIMILARITY_THRESHOLD */
  threshold?: number
}

export interface RetrievalResultItem {
  chunk: SourceChunk
  parentChunk?: SourceChunk | null
  /** 融合后的 RRF 分数 */
  score: number
  /** rerank 后的分数（可选） */
  rerankScore?: number
  /** 命中来源 */
  source: 'dense' | 'sparse' | 'both'
}

export interface RetrievalResult {
  items: RetrievalResultItem[]
  latencyMs: number
  stages: Array<{ stage: string; durationMs: number; count: number }>
}

/**
 * RerankerPort：仅负责对候选 chunks 进行 rerank 评分排序
 * 实现：BGE-Reranker-v2-m3 / Jina / Cohere 等
 */
export interface RerankerPort {
  rerank(
    query: string,
    chunks: SourceChunk[],
    topK?: number,
  ): Promise<Array<{ chunk: SourceChunk; score: number }>>
}

/**
 * RetrievalOrchestratorPort：负责完整检索编排（dense + sparse + rerank + RRF 融合）
 * 实现：retrievalService（domain 层）
 */
export interface RetrievalOrchestratorPort {
  retrieve(query: RetrievalQuery): Promise<RetrievalResult>
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat (RAG conversation) ports
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatStreamOptions {
  userId: number | null
  sessionId: string | null
  conversationId: string
  /** 当前 user message id（用于 Langfuse trace 关联） */
  messageId?: string
  scenarioType?: string
  /** 限定检索范围（source id 列表） */
  contextSourceIds?: string[]
  aiConfig?: AIConfig
  /** 历史消息（最近 N 轮） */
  history?: ChatMessageInput[]
  /** 注入到系统提示 {{INJECTION_WARNING}} 占位符的文本 */
  injectionWarning?: string
  /** SubTask 22.4: 注入到系统提示 {{MEMORY_CONTEXT}} 占位符的用户偏好记忆文本 */
  memoryContext?: string
  abortSignal?: AbortSignal
}

export interface ChatCitation {
  /** [n] 中的 n，从 1 开始 */
  index: number
  sourceId: string
  sourceName?: string
  chunkId: string
  /** 引用片段（前 200 字） */
  quote: string
  /** rerank 分数（无 rerank 时回退到 RRF 分数） */
  score: number
  charOffsetStart?: number
  charOffsetEnd?: number
}

export interface ChatToolCall {
  name: string
  args: unknown
  result?: unknown
}

export interface ChatCompleteResult {
  content: string
  citations: ChatCitation[]
  toolCalls: ChatToolCall[]
  tokenPrompt: number
  tokenCompletion: number
  model: string
  isMock: boolean
  /** Langfuse trace id（若启用 telemetry） */
  traceId?: string
}

export interface ChatStreamCallbacks {
  onToken?: (token: string) => void
  onToolCall?: (toolName: string, args: unknown) => void
  onCitation?: (citations: ChatCitation[]) => void
  onComplete?: (result: ChatCompleteResult) => void
  onError?: (error: Error) => void
}

export interface AIChatPort {
  chatStream(
    messages: ChatMessageInput[],
    options: ChatStreamOptions,
    callbacks: ChatStreamCallbacks,
  ): Promise<ChatCompleteResult>

  summarizeConversation(
    conversationText: string,
    aiConfig?: AIConfig,
  ): Promise<{ content: string; tokenPrompt: number; tokenCompletion: number; model: string }>

  generateConversationTitle(
    firstUserContent: string,
    aiConfig?: AIConfig,
  ): Promise<{ content: string; tokenPrompt: number; tokenCompletion: number; model: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Cache
// ─────────────────────────────────────────────────────────────────────────────
export interface PromptCacheLike<T> {
  get(key: string): T | undefined
  set(key: string, value: T): void
}
