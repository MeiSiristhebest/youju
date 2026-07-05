/**
 * DI 容器 Token 定义
 *
 * 命名规则：每个 token 使用 `Symbol('ServiceName')` 形式
 * Repository tokens 与 Service tokens 分组
 */

// ─────────────────────────────────────────────────────────────────────────────
// Repository Tokens (完整 Repository + 读写分离)
// ─────────────────────────────────────────────────────────────────────────────
export const Tokens = {
  // Repositories - 完整接口（向后兼容）
  UserRepository: Symbol('UserRepository'),
  SourceRepository: Symbol('SourceRepository'),
  ChunkRepository: Symbol('ChunkRepository'),
  TaskRepository: Symbol('TaskRepository'),
  TaskResultRepository: Symbol('TaskResultRepository'),
  ShareRepository: Symbol('ShareRepository'),
  AnalysisLogRepository: Symbol('AnalysisLogRepository'),
  AnalysisStepRepository: Symbol('AnalysisStepRepository'),
  ScenarioKnowledgeRepository: Symbol('ScenarioKnowledgeRepository'),
  ObservabilityRepository: Symbol('ObservabilityRepository'),
  ModelConfigRepository: Symbol('ModelConfigRepository'),
  ConversationRepository: Symbol('ConversationRepository'),
  MessageRepository: Symbol('MessageRepository'),
  MemoryRepository: Symbol('MemoryRepository'),
  PreferenceRepository: Symbol('PreferenceRepository'),

  // Read Repositories
  UserReadRepository: Symbol('UserReadRepository'),
  SourceReadRepository: Symbol('SourceReadRepository'),
  ChunkReadRepository: Symbol('ChunkReadRepository'),
  TaskReadRepository: Symbol('TaskReadRepository'),
  TaskResultReadRepository: Symbol('TaskResultReadRepository'),
  ShareReadRepository: Symbol('ShareReadRepository'),
  AnalysisLogReadRepository: Symbol('AnalysisLogReadRepository'),
  AnalysisStepReadRepository: Symbol('AnalysisStepReadRepository'),
  ScenarioKnowledgeReadRepository: Symbol('ScenarioKnowledgeReadRepository'),
  ObservabilityReadRepository: Symbol('ObservabilityReadRepository'),
  ModelConfigReadRepository: Symbol('ModelConfigReadRepository'),
  ConversationReadRepository: Symbol('ConversationReadRepository'),
  MessageReadRepository: Symbol('MessageReadRepository'),
  MemoryReadRepository: Symbol('MemoryReadRepository'),
  PreferenceReadRepository: Symbol('PreferenceReadRepository'),

  // Write Repositories
  UserWriteRepository: Symbol('UserWriteRepository'),
  SourceWriteRepository: Symbol('SourceWriteRepository'),
  ChunkWriteRepository: Symbol('ChunkWriteRepository'),
  TaskWriteRepository: Symbol('TaskWriteRepository'),
  TaskResultWriteRepository: Symbol('TaskResultWriteRepository'),
  ShareWriteRepository: Symbol('ShareWriteRepository'),
  AnalysisLogWriteRepository: Symbol('AnalysisLogWriteRepository'),
  AnalysisStepWriteRepository: Symbol('AnalysisStepWriteRepository'),
  ScenarioKnowledgeWriteRepository: Symbol('ScenarioKnowledgeWriteRepository'),
  ObservabilityWriteRepository: Symbol('ObservabilityWriteRepository'),
  ModelConfigWriteRepository: Symbol('ModelConfigWriteRepository'),
  ConversationWriteRepository: Symbol('ConversationWriteRepository'),
  MessageWriteRepository: Symbol('MessageWriteRepository'),
  MemoryWriteRepository: Symbol('MemoryWriteRepository'),
  PreferenceWriteRepository: Symbol('PreferenceWriteRepository'),

  // AI Ports
  AIAnalysisPort: Symbol('AIAnalysisPort'),
  AIDraftPort: Symbol('AIDraftPort'),
  AIChatPort: Symbol('AIChatPort'),
  EmbeddingPort: Symbol('EmbeddingPort'),
  RerankerPort: Symbol('RerankerPort'),

  // Provider Registries
  LLMProviderRegistry: Symbol('LLMProviderRegistry'),
  EmbeddingProviderRegistry: Symbol('EmbeddingProviderRegistry'),
  RerankerProviderRegistry: Symbol('RerankerProviderRegistry'),

  // Services
  UserService: Symbol('UserService'),
  AuthService: Symbol('AuthService'),
  SourceService: Symbol('SourceService'),
  TaskService: Symbol('TaskService'),
  ShareService: Symbol('ShareService'),
  AnalysisCache: Symbol('AnalysisCache'),
  AnalysisService: Symbol('AnalysisService'),
  AnalysisLogService: Symbol('AnalysisLogService'),
  AnalysisCheckpointService: Symbol('AnalysisCheckpointService'),
  AnalysisTaskScheduler: Symbol('AnalysisTaskScheduler'),
  AnalysisResultPersister: Symbol('AnalysisResultPersister'),
  AnalysisStreamOrchestrator: Symbol('AnalysisStreamOrchestrator'),
  ChatService: Symbol('ChatService'),
  ChunkService: Symbol('ChunkService'),
  IncrementalAnalysis: Symbol('IncrementalAnalysis'),
  MemoryService: Symbol('MemoryService'),
  ModelConfigService: Symbol('ModelConfigService'),
  ObservabilityService: Symbol('ObservabilityService'),
  PreferenceService: Symbol('PreferenceService'),
  RetrievalService: Symbol('RetrievalService'),
} as const

export type Token = keyof typeof Tokens
