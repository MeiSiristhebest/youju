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
export interface ObservabilityReadRepository {
  getCostStats(userId: number | null, sessionId?: string | null): Promise<CostStats>
  getStepPerformanceStats(
    userId: number | null,
    sessionId?: string | null,
    limit?: number,
  ): Promise<StepPerformanceStats[]>
}

export interface ObservabilityWriteRepository {
  estimateCost(tokenPrompt: number, tokenCompletion: number, model: string): number
}

export interface ObservabilityRepository
  extends ObservabilityReadRepository,
    ObservabilityWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisLog Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface AnalysisLogReadRepository {
  getLatestAnalysisLog(logGroupId: string): Promise<AnalysisLog | null>
  getAnalysisLogById(id: string): Promise<AnalysisLog | null>
  getAnalysisLogsByUser(
    userId: number | null,
    sessionId?: string | null,
    limit?: number,
  ): Promise<AnalysisLog[]>
  getAnalysisStats(userId: number | null, sessionId?: string | null): Promise<AnalysisStats>
  getCheckpoint(analysisLogId: string): Promise<unknown | null>
}

export interface AnalysisLogWriteRepository {
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

export interface AnalysisLogRepository
  extends AnalysisLogReadRepository,
    AnalysisLogWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisStep Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface AnalysisStepReadRepository {
  getAnalysisStepsByLogId(analysisLogId: string): Promise<AnalysisStep[]>
  getLatestStepByLogAndStepId(analysisLogId: string, stepId: string): Promise<AnalysisStep | null>
  getStepEvents(analysisLogId: string, stepId: string): Promise<StepEvent[]>
}

export interface AnalysisStepWriteRepository {
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

export interface AnalysisStepRepository
  extends AnalysisStepReadRepository,
    AnalysisStepWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// TaskResult Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface TaskResultReadRepository {
  getLatestTaskResult(taskId: string): Promise<TaskResult | null>
  getTaskResultVersions(taskId: string): Promise<TaskResult[]>
  getTaskResultByVersion(taskId: string, version: number): Promise<TaskResult | null>
}

export interface TaskResultWriteRepository {
  createTaskResult(taskId: string, result: unknown, analysisLogId?: string): Promise<TaskResult>
}

export interface TaskResultRepository extends TaskResultReadRepository, TaskResultWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// ScenarioKnowledge Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ScenarioKnowledgeReadRepository {
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
}

export interface ScenarioKnowledgeWriteRepository {
  accumulateScenarioKnowledge(
    scenarioType: string,
    items: Array<{ type: string; dimension: string; confidence: number }>,
  ): Promise<void>
  applyTimeDecay(): Promise<void>
  recalculateWeightedFrequencies(): Promise<void>
  pruneLowQualityKnowledge(threshold?: number): Promise<number>
}

export interface ScenarioKnowledgeRepository
  extends ScenarioKnowledgeReadRepository,
    ScenarioKnowledgeWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// User Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface UserReadRepository {
  getUserById(id: number): Promise<User | null>
}

export interface UserWriteRepository {
  findOrCreateUser(openid: string, nickname?: string, avatar?: string): Promise<User>
}

export interface UserRepository extends UserReadRepository, UserWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// Preference Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface PreferenceReadRepository {
  getUserPreference(userId: number | null, sessionId: string | null, key: string): Promise<unknown>
}

export interface PreferenceWriteRepository {
  setUserPreference(
    userId: number | null,
    sessionId: string | null,
    key: string,
    value: unknown,
  ): Promise<void>
}

export interface PreferenceRepository extends PreferenceReadRepository, PreferenceWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// Source Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface SourceReadRepository {
  getSourcesByUser(userId: number | null, sessionId?: string | null): Promise<Source[]>
  getSourceById(userId: number | null, sessionId: string | null, id: string): Promise<Source | null>
  getSourceIds?(sourceIds: string[]): Promise<string[]>
}

export interface SourceWriteRepository {
  createSource(
    userId: number | null,
    sessionId: string | null,
    type: string,
    name: string,
    content: string,
    meta?: string,
  ): Promise<Source>
  deleteSource(userId: number | null, sessionId: string | null, id: string): Promise<boolean>
}

export interface SourceRepository extends SourceReadRepository, SourceWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// Task Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface TaskReadRepository {
  getTaskById(userId: number | null, sessionId: string | null, id: string): Promise<Task | null>
  getTasksByUser(userId: number | null, sessionId: string | null): Promise<Task[]>
  getTaskChecklistState(taskId: string): Promise<unknown | null>
  getTaskMetaByIdForShare?(id: string): Promise<Partial<Task> | null>
}

export interface TaskWriteRepository {
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

export interface TaskRepository extends TaskReadRepository, TaskWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// Share Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ShareReadRepository {
  getShareByToken(token: string): Promise<(Share & { task: Task | null; result: unknown }) | null>
  getShareById(userId: number | null, sessionId: string | null, id: string): Promise<Share | null>
  getSharesByUser(userId: number | null, sessionId: string | null): Promise<Share[]>
  getSharesByTask(taskId: string): Promise<Share[]>
}

export interface ShareWriteRepository {
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

export interface ShareRepository extends ShareReadRepository, ShareWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// Chunk Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ChunkReadRepository {
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
}

export interface ChunkWriteRepository {
  insertChunks(chunks: SourceChunk[]): Promise<void>
  deleteBySourceId(sourceId: string): Promise<void>
  updateEmbedStatus(
    chunkId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    embedding?: number[],
  ): Promise<void>
}

export interface ChunkRepository extends ChunkReadRepository, ChunkWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface ConversationReadRepository {
  list(
    userId: string | null,
    sessionId: string | null,
    pagination?: { limit?: number; offset?: number },
  ): Promise<Conversation[]>
  findById(id: string, tenantCtx: TenantContext): Promise<Conversation | null>
  findByUserId(userId: string): Promise<Conversation[]>
}

export interface ConversationWriteRepository {
  create(input: {
    userId: string | null
    sessionId: string | null
    title?: string
    scenarioType?: string | null
    sourceIds?: string[]
    contextSourceIds?: string[]
  }): Promise<Conversation>
  updateTitle(id: string, title: string, tenantCtx: TenantContext): Promise<Conversation | null>
  softDelete(id: string, tenantCtx: TenantContext): Promise<boolean>
}

export interface ConversationRepository
  extends ConversationReadRepository,
    ConversationWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// Message Repository
// ─────────────────────────────────────────────────────────────────────────────
export interface MessageReadRepository {
  findByConversationId(
    conversationId: string,
    pagination?: { limit?: number; offset?: number },
  ): Promise<ChatMessage[]>
  findById(messageId: string): Promise<ChatMessage | null>
  countByConversationId(conversationId: string): Promise<number>
}

export interface MessageWriteRepository {
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

export interface MessageRepository extends MessageReadRepository, MessageWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Repository
// ─────────────────────────────────────────────────────────────────────────────
// SubTask 22.3 + 22.6: 跨会话长期记忆 Repository
// 所有查询均受 tenant 隔离（user_id OR session_id）
export interface MemoryReadRepository {
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
}

export interface MemoryWriteRepository {
  create(input: {
    userId: string | null
    sessionId: string | null
    content: string
    embedding: number[]
  }): Promise<ChatMemory>
  delete(id: string, tenantCtx: TenantContext): Promise<boolean>
}

export interface MemoryRepository extends MemoryReadRepository, MemoryWriteRepository {}

// ─────────────────────────────────────────────────────────────────────────────
// ModelConfig Repository (补充接口定义)
// ─────────────────────────────────────────────────────────────────────────────
export interface ModelConfigReadRepository {
  listConfigs(userId: number | null, sessionId: string | null): Promise<unknown[]>
  getConfigById(id: string): Promise<unknown | null>
  getDefaultConfig(userId: number | null, sessionId: string | null): Promise<unknown | null>
}

export interface ModelConfigWriteRepository {
  createConfig(
    userId: number | null,
    sessionId: string | null,
    data: Record<string, unknown>,
  ): Promise<unknown>
  updateConfig(
    id: string,
    userId: number | null,
    sessionId: string | null,
    data: Record<string, unknown>,
  ): Promise<unknown | null>
  deleteConfig(id: string, userId: number | null, sessionId: string | null): Promise<boolean>
  setDefault(id: string, userId: number | null, sessionId: string | null): Promise<boolean>
}

export interface ModelConfigRepository
  extends ModelConfigReadRepository,
    ModelConfigWriteRepository {}
