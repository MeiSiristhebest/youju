import type { TenantContext } from '../context/tenantContext.js'
import type {
  AnalysisLog,
  AnalysisStats,
  AnalysisStep,
  ChatMemory,
  ChatMessage,
  Conversation,
  CostStats,
  MessageFeedback,
  MessageRole,
  RetrievedChunk,
  ScenarioKnowledge,
  Share,
  Source,
  SourceChunk,
  StepEvent,
  StepPerformanceStats,
  Task,
  TaskResult,
  User,
} from '../types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Observability Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ObservabilityRepository {
  getCostStats(userId: number | null, sessionId?: string | null): Promise<CostStats>
  getStepPerformanceStats(
    userId: number | null,
    sessionId?: string | null,
    limit?: number,
  ): Promise<StepPerformanceStats[]>
  estimateCost(tokenPrompt: number, tokenCompletion: number, model: string): number
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisLog Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface AnalysisLogRepository {
  getLatestAnalysisLog(logGroupId: string): Promise<AnalysisLog | null>
  getAnalysisLogById(id: string): Promise<AnalysisLog | null>
  getAnalysisLogsByUser(
    userId: number | null,
    sessionId?: string | null,
    limit?: number,
  ): Promise<AnalysisLog[]>
  getAnalysisStats(userId: number | null, sessionId?: string | null): Promise<AnalysisStats>
  getCheckpoint(analysisLogId: string): Promise<unknown | null>
  createAnalysisLog(
    input: Omit<AnalysisLog, 'id' | 'createdAt' | 'version' | 'logGroupId'> & {
      logGroupId?: string | null
      version?: number
    },
  ): Promise<{ id: string; logGroupId: string; version: number } & AnalysisLog>
  appendAnalysisLog(
    logGroupId: string,
    status: string,
    patch: Partial<AnalysisLog>,
  ): Promise<AnalysisLog>
  saveCheckpoint(analysisLogId: string, checkpointData: unknown): Promise<void>
  updateAnalysisLog?(id: string, data: Partial<AnalysisLog>): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisStep Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface AnalysisStepRepository {
  getAnalysisStepsByLogId(analysisLogId: string): Promise<AnalysisStep[]>
  getLatestStepByLogAndStepId(analysisLogId: string, stepId: string): Promise<AnalysisStep | null>
  getStepEvents(analysisLogId: string, stepId: string): Promise<StepEvent[]>
  createAnalysisStep(
    input: Omit<AnalysisStep, 'id' | 'startedAt' | 'completedAt'> & {
      startedAt?: string | null
      completedAt?: string | null
    },
  ): Promise<AnalysisStep>
  updateAnalysisStep?(id: string, data: Partial<AnalysisStep>): Promise<boolean>
  createStepEvent(
    input: Omit<StepEvent, 'id' | 'createdAt'> & { createdAt?: string },
  ): Promise<StepEvent>
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskResult Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface TaskResultRepository {
  getLatestTaskResult(taskId: string): Promise<TaskResult | null>
  getTaskResultVersions(taskId: string): Promise<TaskResult[]>
  getTaskResultByVersion(taskId: string, version: number): Promise<TaskResult | null>
  createTaskResult(taskId: string, result: unknown, analysisLogId?: string): Promise<TaskResult>
}

// ─────────────────────────────────────────────────────────────────────────────
// ScenarioKnowledge Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ScenarioKnowledgeRepository {
  getTopKnowledge(scenarioType: string, limit: number): Promise<ScenarioKnowledge[]>
  getScenarioKnowledge?(
    scenarioType: string,
    limit?: number,
    version?: string,
  ): Promise<ScenarioKnowledge[]>
  getTopRiskTypesByScenario?(
    scenarioType: string,
    limit?: number,
    version?: string,
  ): Promise<string[]>
  getKnowledgeStats?(): Promise<{ total: number; byScenario: Record<string, number> }>
  accumulateScenarioKnowledge(
    scenarioType: string,
    items: Array<{ type: string; dimension: string; confidence: number }>,
  ): Promise<void>
  applyTimeDecay(): Promise<void>
  recalculateWeightedFrequencies(): Promise<void>
  pruneLowQualityKnowledge(threshold?: number): Promise<number>
}

// ─────────────────────────────────────────────────────────────────────────────
// User Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface UserRepository {
  getUserById(id: number): Promise<User | null>
  findOrCreateUser(openid: string, nickname?: string, avatar?: string): Promise<User>
}

// ─────────────────────────────────────────────────────────────────────────────
// Preference Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface PreferenceRepository {
  getUserPreference(userId: number | null, sessionId: string | null, key: string): Promise<unknown>
  setUserPreference(
    userId: number | null,
    sessionId: string | null,
    key: string,
    value: unknown,
  ): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Source Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface SourceRepository {
  getSourcesByUser(
    userId: number | null,
    sessionId?: string | null,
    taskId?: string | null,
  ): Promise<Source[]>
  getSourcesByTask(taskId: string): Promise<Source[]>
  getSourceById(userId: number | null, sessionId: string | null, id: string): Promise<Source | null>
  getAllSources(userId: number | null): Promise<Source[]>
  getSourceIds?(sourceIds: string[]): Promise<string[]>
  createSource(
    userId: number | null,
    sessionId: string | null,
    type: string,
    name: string,
    content: string,
    meta?: string,
    taskId?: string | null,
  ): Promise<Source>
  deleteSource(userId: number | null, sessionId: string | null, id: string): Promise<boolean>
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface TaskRepository {
  getTaskById(userId: number | null, sessionId: string | null, id: string): Promise<Task | null>
  getTasksByUser(userId: number | null, sessionId: string | null): Promise<Task[]>
  getTaskChecklistState(taskId: string): Promise<unknown | null>
  getTaskMetaByIdForShare?(id: string): Promise<Partial<Task> | null>
  createTask(
    userId: number | null,
    sessionId: string | null,
    title: string,
    scenarioType?: string,
  ): Promise<Task>
  updateTask(
    userId: number | null,
    sessionId: string | null,
    id: string,
    data: Partial<Task>,
  ): Promise<Task | null>
  deleteTask(userId: number | null, sessionId: string | null, id: string): Promise<boolean>
  updateTaskChecklistState(taskId: string, state: unknown): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Share Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ShareRepository {
  getShareByToken(token: string): Promise<(Share & { task: Task | null; result: unknown }) | null>
  getShareById(userId: number | null, sessionId: string | null, id: string): Promise<Share | null>
  getSharesByUser(userId: number | null, sessionId: string | null): Promise<Share[]>
  getSharesByTask(taskId: string): Promise<Share[]>
  createShare(
    userId: number | null,
    sessionId: string | null,
    taskId: string,
    title: string,
    snapshotData: unknown,
    expiresAt?: string,
  ): Promise<Share & { url: string }>
  deleteShare(userId: number | null, sessionId: string | null, id: string): Promise<boolean>
  incrementShareView?(id: string): Promise<boolean>
  generateShareToken?(): string
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunk Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ChunkRepository {
  findBySourceId(sourceId: string): Promise<SourceChunk[]>
  vectorSearch(
    queryVector: number[],
    limit: number,
    tenantCtx: TenantContext,
    sourceFilter?: string[],
  ): Promise<RetrievedChunk[]>
  fullTextSearch(
    query: string,
    limit: number,
    tenantCtx: TenantContext,
    sourceFilter?: string[],
  ): Promise<SourceChunk[]>
  findParentChunk(parentChunkId: string): Promise<SourceChunk | null>
  insertChunks(chunks: SourceChunk[]): Promise<void>
  deleteBySourceId(sourceId: string): Promise<void>
  updateEmbedStatus(
    chunkId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    embedding?: number[],
  ): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ConversationRepository {
  list(
    userId: string | null,
    sessionId: string | null,
    pagination?: { limit?: number; offset?: number },
    filters?: { taskId?: string; scenarioType?: string },
  ): Promise<Conversation[]>
  findById(id: string, tenantCtx: TenantContext): Promise<Conversation | null>
  findByUserId(userId: string): Promise<Conversation[]>
  create(input: {
    userId: string | null
    sessionId: string | null
    taskId?: string | null
    title?: string
    scenarioType?: string | null
    sourceIds?: string[]
    contextSourceIds?: string[]
  }): Promise<Conversation>
  updateTitle(id: string, title: string, tenantCtx: TenantContext): Promise<Conversation | null>
  softDelete(id: string, tenantCtx: TenantContext): Promise<boolean>
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface MessageRepository {
  findByConversationId(
    conversationId: string,
    pagination?: { limit?: number; offset?: number },
  ): Promise<ChatMessage[]>
  findById(messageId: string): Promise<ChatMessage | null>
  countByConversationId(conversationId: string): Promise<number>
  create(input: {
    conversationId: string
    role: MessageRole
    content: string
    toolCalls?: unknown[] | null
    citations?: unknown[] | null
    parentMessageId?: string | null
    langfuseTraceId?: string | null
  }): Promise<ChatMessage>
  archive(messageId: string): Promise<boolean>
  markPartial(messageId: string, isPartial: boolean): Promise<boolean>
  updateFeedback(messageId: string, feedback: MessageFeedback): Promise<boolean>
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Repository
// ─────────────────────────────────────────────────────────────────────────────
// SubTask 22.3 + 22.6: 跨会话长期记忆 Repository
// 所有查询均受 tenant 隔离（user_id OR session_id）
export interface MemoryRepository {
  list(
    tenantCtx: TenantContext,
    pagination?: { limit?: number; offset?: number },
  ): Promise<ChatMemory[]>
  findById(id: string, tenantCtx: TenantContext): Promise<ChatMemory | null>
  vectorSearch(
    queryVector: number[],
    limit: number,
    tenantCtx: TenantContext,
  ): Promise<Array<{ memory: ChatMemory; score: number }>>
  create(input: {
    userId: string | null
    sessionId: string | null
    content: string
    embedding: number[]
  }): Promise<ChatMemory>
  delete(id: string, tenantCtx: TenantContext): Promise<boolean>
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelConfig Repository (补充接口定义)
// ─────────────────────────────────────────────────────────────────────────────
interface ModelConfigRecord {
  id: number
  user_id: number | null
  session_id: string | null
  name: string
  provider: string
  api_key: string
  base_url: string
  model: string
  model_mappings: string
  config_type: string
  is_default: number
  created_at: string
  updated_at: string
}

export interface ModelConfigRepository {
  listConfigs(
    userId: number | null,
    sessionId: string | null,
    configType?: string,
  ): Promise<ModelConfigRecord[]>
  getConfigById(id: string): Promise<ModelConfigRecord | undefined>
  getDefaultConfig(
    userId: number | null,
    sessionId: string | null,
    configType?: string,
  ): Promise<ModelConfigRecord | undefined>
  createConfig(
    userId: number | null,
    sessionId: string | null,
    data: {
      name: string
      provider: string
      apiKey: string
      baseURL: string
      model: string
      modelMappings: string
      configType?: string
      isDefault: boolean
    },
  ): Promise<ModelConfigRecord>
  updateConfig(
    id: string,
    userId: number | null,
    sessionId: string | null,
    data: {
      name?: string
      provider?: string
      apiKey?: string
      baseURL?: string
      model?: string
      modelMappings?: string
      configType?: string
      isDefault?: boolean
    },
  ): Promise<ModelConfigRecord | undefined>
  deleteConfig(id: string, userId: number | null, sessionId: string | null): Promise<boolean>
  setDefault(id: string, userId: number | null, sessionId: string | null): Promise<boolean>
}
