/**
 * DI 容器 Token 定义
 *
 * 命名规则：每个 token 使用 `Symbol('ServiceName')` 形式
 * Repository tokens 与 Service tokens 分组
 */

// ─────────────────────────────────────────────────────────────────────────────
// Repository Tokens
// ─────────────────────────────────────────────────────────────────────────────
export const Tokens = {
  // Repositories
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

  // AI Ports
  AIAnalysisPort: Symbol('AIAnalysisPort'),
  AIDraftPort: Symbol('AIDraftPort'),
  AIChatPort: Symbol('AIChatPort'),
  EmbeddingPort: Symbol('EmbeddingPort'),
  RerankerPort: Symbol('RerankerPort'),

  // Infrastructure Ports
  ModeChecker: Symbol('ModeChecker'),

  // Service Ports
  RiskPreferencePort: Symbol('RiskPreferencePort'),

  // Provider Registries
  LLMProviderRegistry: Symbol('LLMProviderRegistry'),
  EmbeddingProviderRegistry: Symbol('EmbeddingProviderRegistry'),
  RerankerProviderRegistry: Symbol('RerankerProviderRegistry'),
  ModelProviderAdapter: Symbol('ModelProviderAdapter'),

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
