import { analysisAdapter } from '../../ai/adapters/analysisAdapter.js'
import { ChatAdapter } from '../../ai/adapters/chatAdapter.js'
import { draftAdapter } from '../../ai/adapters/draftAdapter.js'
import { embeddingAdapter } from '../../ai/adapters/embeddingAdapter.js'
import { retrievalAdapter } from '../../ai/adapters/retrievalAdapter.js'
import { aiRequestQueue } from '../../ai/concurrencyLimiter.js'
import type { DatabaseDriver } from '../../data/DatabaseDriver.js'
import { createAnalysisLogRepository } from '../../data/repositories/analysisLogRepository.js'
import { createAnalysisStepRepository } from '../../data/repositories/analysisStepRepository.js'
import { createChunkRepository } from '../../data/repositories/chunkRepository.js'
import { createConversationRepository } from '../../data/repositories/conversationRepository.js'
import { createMemoryRepository } from '../../data/repositories/memoryRepository.js'
import { createMessageRepository } from '../../data/repositories/messageRepository.js'
import { createModelConfigRepository } from '../../data/repositories/modelConfigRepository.js'
import { createObservabilityRepository } from '../../data/repositories/observabilityRepository.js'
import { createPreferenceRepository } from '../../data/repositories/preferenceRepository.js'
import { createScenarioKnowledgeRepository } from '../../data/repositories/scenarioKnowledgeRepository.js'
import { createShareRepository } from '../../data/repositories/shareRepository.js'
import { createSourceRepository } from '../../data/repositories/sourceRepository.js'
import { createTaskRepository } from '../../data/repositories/taskRepository.js'
import { createTaskResultRepository } from '../../data/repositories/taskResultRepository.js'
import { createUserRepository } from '../../data/repositories/userRepository.js'
import type {
  AnalysisLogReadRepository,
  AnalysisLogRepository,
  AnalysisLogWriteRepository,
  AnalysisStepReadRepository,
  AnalysisStepRepository,
  AnalysisStepWriteRepository,
  ChunkReadRepository,
  ChunkRepository,
  ChunkWriteRepository,
  ConversationReadRepository,
  ConversationRepository,
  ConversationWriteRepository,
  MemoryReadRepository,
  MemoryRepository,
  MemoryWriteRepository,
  MessageReadRepository,
  MessageRepository,
  MessageWriteRepository,
  ModelConfigReadRepository,
  ModelConfigWriteRepository,
  ObservabilityReadRepository,
  ObservabilityRepository,
  ObservabilityWriteRepository,
  PreferenceReadRepository,
  PreferenceWriteRepository,
  ScenarioKnowledgeReadRepository,
  ScenarioKnowledgeRepository,
  ScenarioKnowledgeWriteRepository,
  ShareReadRepository,
  ShareRepository,
  ShareWriteRepository,
  SourceReadRepository,
  SourceRepository,
  SourceWriteRepository,
  TaskReadRepository,
  TaskRepository,
  TaskResultReadRepository,
  TaskResultRepository,
  TaskResultWriteRepository,
  TaskWriteRepository,
  UserReadRepository,
  UserRepository,
  UserWriteRepository,
} from '../../domain/ports/repositories.js'
import { AnalysisCache } from '../../domain/services/analysisCache.js'
import { AnalysisCheckpointService } from '../../domain/services/analysisCheckpointService.js'
import { AnalysisLogService } from '../../domain/services/analysisLogService.js'
import { AnalysisResultPersister } from '../../domain/services/analysisResultPersister.js'
import { AnalysisService } from '../../domain/services/analysisService.js'
import { AnalysisStreamOrchestrator } from '../../domain/services/analysisStreamOrchestrator.js'
import { AnalysisTaskScheduler } from '../../domain/services/analysisTaskScheduler.js'
import { AuthService } from '../../domain/services/authService.js'
import { ChatService } from '../../domain/services/chatService.js'
import { ChunkService } from '../../domain/services/chunkService.js'
import { IncrementalAnalysisService } from '../../domain/services/incrementalAnalysis.js'
import { MemoryService } from '../../domain/services/memoryService.js'
import { ModelConfigService } from '../../domain/services/modelConfigService.js'
import { ObservabilityService } from '../../domain/services/observabilityService.js'
import { PreferenceService } from '../../domain/services/preferenceService.js'
import { RetrievalService } from '../../domain/services/retrievalService.js'
import { ShareService } from '../../domain/services/shareService.js'
import { SourceService } from '../../domain/services/sourceService.js'
import { TaskService } from '../../domain/services/taskService.js'
import { UserService } from '../../domain/services/userService.js'
import { embeddingProviderRegistry } from '../ai/embeddingProviderRegistry.js'
import { llmProviderRegistry } from '../ai/llmProviderRegistry.js'
import { rerankerProviderRegistry } from '../ai/rerankerProviderRegistry.js'
import { jwtAdapter } from '../auth.js'
import { createContainer, type ServiceLocator } from './container.js'
import { setServiceLocator } from './serviceLocator.js'
import { Tokens } from './tokens.js'

export interface AppDependencies {
  driver: DatabaseDriver
  userRepository: UserRepository
  sourceRepository: SourceRepository
  taskResultRepository: TaskResultRepository
  taskRepository: TaskRepository
  shareRepository: ShareRepository
  analysisLogRepository: AnalysisLogRepository
  analysisStepRepository: AnalysisStepRepository
  scenarioKnowledgeRepository: ScenarioKnowledgeRepository
  observabilityRepository: ObservabilityRepository
  chunkRepository: ChunkRepository
  conversationRepository: ConversationRepository
  messageRepository: MessageRepository
  memoryRepository: MemoryRepository
  modelConfigRepository: ReturnType<typeof createModelConfigRepository>
  preferenceRepository: ReturnType<typeof createPreferenceRepository>
  userReadRepository: UserReadRepository
  userWriteRepository: UserWriteRepository
  sourceReadRepository: SourceReadRepository
  sourceWriteRepository: SourceWriteRepository
  taskResultReadRepository: TaskResultReadRepository
  taskResultWriteRepository: TaskResultWriteRepository
  taskReadRepository: TaskReadRepository
  taskWriteRepository: TaskWriteRepository
  shareReadRepository: ShareReadRepository
  shareWriteRepository: ShareWriteRepository
  analysisLogReadRepository: AnalysisLogReadRepository
  analysisLogWriteRepository: AnalysisLogWriteRepository
  analysisStepReadRepository: AnalysisStepReadRepository
  analysisStepWriteRepository: AnalysisStepWriteRepository
  scenarioKnowledgeReadRepository: ScenarioKnowledgeReadRepository
  scenarioKnowledgeWriteRepository: ScenarioKnowledgeWriteRepository
  observabilityReadRepository: ObservabilityReadRepository
  observabilityWriteRepository: ObservabilityWriteRepository
  chunkReadRepository: ChunkReadRepository
  chunkWriteRepository: ChunkWriteRepository
  conversationReadRepository: ConversationReadRepository
  conversationWriteRepository: ConversationWriteRepository
  messageReadRepository: MessageReadRepository
  messageWriteRepository: MessageWriteRepository
  memoryReadRepository: MemoryReadRepository
  memoryWriteRepository: MemoryWriteRepository
  modelConfigReadRepository: ModelConfigReadRepository
  modelConfigWriteRepository: ModelConfigWriteRepository
  preferenceReadRepository: PreferenceReadRepository
  preferenceWriteRepository: PreferenceWriteRepository
}

export function configureContainer(driver: DatabaseDriver): {
  container: ServiceLocator
  dependencies: AppDependencies
} {
  // 注意：repository 实现类型与 port 接口类型存在一些差异（如返回值字段不完全匹配）
  // 运行时行为是兼容的，这里使用双重断言来桥接类型差异
  const userRepository = createUserRepository(driver) as unknown as UserRepository
  const sourceRepository = createSourceRepository(driver) as unknown as SourceRepository
  const taskResultRepository = createTaskResultRepository(driver) as unknown as TaskResultRepository
  const taskRepository = createTaskRepository(
    driver,
    taskResultRepository,
  ) as unknown as TaskRepository
  const shareRepository = createShareRepository(driver) as unknown as ShareRepository
  const analysisLogRepository = createAnalysisLogRepository(
    driver,
  ) as unknown as AnalysisLogRepository
  const analysisStepRepository = createAnalysisStepRepository(
    driver,
  ) as unknown as AnalysisStepRepository
  const scenarioKnowledgeRepository = createScenarioKnowledgeRepository(
    driver,
  ) as unknown as ScenarioKnowledgeRepository
  const observabilityRepository = createObservabilityRepository(
    driver,
  ) as unknown as ObservabilityRepository
  const modelConfigRepository = createModelConfigRepository(driver)
  const chunkRepository = createChunkRepository(driver) as unknown as ChunkRepository
  const conversationRepository = createConversationRepository(
    driver,
  ) as unknown as ConversationRepository
  const messageRepository = createMessageRepository(driver) as unknown as MessageRepository
  const memoryRepository = createMemoryRepository(driver) as unknown as MemoryRepository
  const preferenceRepository = createPreferenceRepository(driver)

  // 读写分离接口 - 使用同一个实现对象（结构兼容）
  const userReadRepository = userRepository as UserReadRepository
  const userWriteRepository = userRepository as UserWriteRepository
  const sourceReadRepository = sourceRepository as SourceReadRepository
  const sourceWriteRepository = sourceRepository as SourceWriteRepository
  const taskResultReadRepository = taskResultRepository as TaskResultReadRepository
  const taskResultWriteRepository = taskResultRepository as TaskResultWriteRepository
  const taskReadRepository = taskRepository as TaskReadRepository
  const taskWriteRepository = taskRepository as TaskWriteRepository
  const shareReadRepository = shareRepository as ShareReadRepository
  const shareWriteRepository = shareRepository as ShareWriteRepository
  const analysisLogReadRepository = analysisLogRepository as AnalysisLogReadRepository
  const analysisLogWriteRepository = analysisLogRepository as AnalysisLogWriteRepository
  const analysisStepReadRepository = analysisStepRepository as AnalysisStepReadRepository
  const analysisStepWriteRepository = analysisStepRepository as AnalysisStepWriteRepository
  const scenarioKnowledgeReadRepository =
    scenarioKnowledgeRepository as ScenarioKnowledgeReadRepository
  const scenarioKnowledgeWriteRepository =
    scenarioKnowledgeRepository as ScenarioKnowledgeWriteRepository
  const observabilityReadRepository = observabilityRepository as ObservabilityReadRepository
  const observabilityWriteRepository = observabilityRepository as ObservabilityWriteRepository
  const chunkReadRepository = chunkRepository as ChunkReadRepository
  const chunkWriteRepository = chunkRepository as ChunkWriteRepository
  const conversationReadRepository = conversationRepository as ConversationReadRepository
  const conversationWriteRepository = conversationRepository as ConversationWriteRepository
  const messageReadRepository = messageRepository as MessageReadRepository
  const messageWriteRepository = messageRepository as MessageWriteRepository
  const memoryReadRepository = memoryRepository as MemoryReadRepository
  const memoryWriteRepository = memoryRepository as MemoryWriteRepository
  const modelConfigReadRepository = modelConfigRepository as unknown as ModelConfigReadRepository
  const modelConfigWriteRepository = modelConfigRepository as unknown as ModelConfigWriteRepository
  const preferenceReadRepository = preferenceRepository as unknown as PreferenceReadRepository
  const preferenceWriteRepository = preferenceRepository as unknown as PreferenceWriteRepository

  const container = createContainer()
  setServiceLocator(container)

  // 完整 Repository（向后兼容）
  container.registerSingleton(Tokens.UserRepository, () => userRepository)
  container.registerSingleton(Tokens.SourceRepository, () => sourceRepository)
  container.registerSingleton(Tokens.TaskRepository, () => taskRepository)
  container.registerSingleton(Tokens.TaskResultRepository, () => taskResultRepository)
  container.registerSingleton(Tokens.ShareRepository, () => shareRepository)
  container.registerSingleton(Tokens.AnalysisLogRepository, () => analysisLogRepository)
  container.registerSingleton(Tokens.AnalysisStepRepository, () => analysisStepRepository)
  container.registerSingleton(Tokens.ScenarioKnowledgeRepository, () => scenarioKnowledgeRepository)
  container.registerSingleton(Tokens.ObservabilityRepository, () => observabilityRepository)
  container.registerSingleton(Tokens.ModelConfigRepository, () => modelConfigRepository)
  container.registerSingleton(Tokens.ChunkRepository, () => chunkRepository)
  container.registerSingleton(Tokens.ConversationRepository, () => conversationRepository)
  container.registerSingleton(Tokens.MessageRepository, () => messageRepository)
  container.registerSingleton(Tokens.MemoryRepository, () => memoryRepository)
  container.registerSingleton(Tokens.PreferenceRepository, () => preferenceRepository)

  // Read Repositories
  container.registerSingleton(Tokens.UserReadRepository, () => userReadRepository)
  container.registerSingleton(Tokens.SourceReadRepository, () => sourceReadRepository)
  container.registerSingleton(Tokens.TaskReadRepository, () => taskReadRepository)
  container.registerSingleton(Tokens.TaskResultReadRepository, () => taskResultReadRepository)
  container.registerSingleton(Tokens.ShareReadRepository, () => shareReadRepository)
  container.registerSingleton(Tokens.AnalysisLogReadRepository, () => analysisLogReadRepository)
  container.registerSingleton(Tokens.AnalysisStepReadRepository, () => analysisStepReadRepository)
  container.registerSingleton(
    Tokens.ScenarioKnowledgeReadRepository,
    () => scenarioKnowledgeReadRepository,
  )
  container.registerSingleton(Tokens.ObservabilityReadRepository, () => observabilityReadRepository)
  container.registerSingleton(Tokens.ModelConfigReadRepository, () => modelConfigReadRepository)
  container.registerSingleton(Tokens.ChunkReadRepository, () => chunkReadRepository)
  container.registerSingleton(Tokens.ConversationReadRepository, () => conversationReadRepository)
  container.registerSingleton(Tokens.MessageReadRepository, () => messageReadRepository)
  container.registerSingleton(Tokens.MemoryReadRepository, () => memoryReadRepository)
  container.registerSingleton(Tokens.PreferenceReadRepository, () => preferenceReadRepository)

  // Write Repositories
  container.registerSingleton(Tokens.UserWriteRepository, () => userWriteRepository)
  container.registerSingleton(Tokens.SourceWriteRepository, () => sourceWriteRepository)
  container.registerSingleton(Tokens.TaskWriteRepository, () => taskWriteRepository)
  container.registerSingleton(Tokens.TaskResultWriteRepository, () => taskResultWriteRepository)
  container.registerSingleton(Tokens.ShareWriteRepository, () => shareWriteRepository)
  container.registerSingleton(Tokens.AnalysisLogWriteRepository, () => analysisLogWriteRepository)
  container.registerSingleton(Tokens.AnalysisStepWriteRepository, () => analysisStepWriteRepository)
  container.registerSingleton(
    Tokens.ScenarioKnowledgeWriteRepository,
    () => scenarioKnowledgeWriteRepository,
  )
  container.registerSingleton(
    Tokens.ObservabilityWriteRepository,
    () => observabilityWriteRepository,
  )
  container.registerSingleton(Tokens.ModelConfigWriteRepository, () => modelConfigWriteRepository)
  container.registerSingleton(Tokens.ChunkWriteRepository, () => chunkWriteRepository)
  container.registerSingleton(Tokens.ConversationWriteRepository, () => conversationWriteRepository)
  container.registerSingleton(Tokens.MessageWriteRepository, () => messageWriteRepository)
  container.registerSingleton(Tokens.MemoryWriteRepository, () => memoryWriteRepository)
  container.registerSingleton(Tokens.PreferenceWriteRepository, () => preferenceWriteRepository)

  container.registerSingleton(Tokens.AIAnalysisPort, () => analysisAdapter)
  container.registerSingleton(Tokens.AIDraftPort, () => draftAdapter)
  container.registerSingleton(Tokens.EmbeddingPort, () => embeddingAdapter)
  container.registerSingleton(Tokens.RerankerPort, () => retrievalAdapter)

  container.registerSingleton(Tokens.LLMProviderRegistry, () => llmProviderRegistry)
  container.registerSingleton(Tokens.EmbeddingProviderRegistry, () => embeddingProviderRegistry)
  container.registerSingleton(Tokens.RerankerProviderRegistry, () => rerankerProviderRegistry)

  const analysisCache = new AnalysisCache()
  const preferenceService = new PreferenceService()

  // TODO: Service 层依赖注入 - 逐步将只读服务改为使用 ReadRepository
  // 当前保持注入完整 Repository 以确保向后兼容
  const userService = new UserService(userRepository)
  const authService = new AuthService(jwtAdapter, userService)
  const shareService = new ShareService(shareRepository)
  const observabilityService = new ObservabilityService(
    observabilityReadRepository,
    scenarioKnowledgeReadRepository,
  )
  const modelConfigService = new ModelConfigService(modelConfigRepository)
  const chunkService = new ChunkService(chunkRepository, embeddingAdapter, analysisLogRepository)
  const sourceService = new SourceService(sourceRepository, chunkRepository, chunkService)
  const memoryService = new MemoryService(memoryRepository, embeddingAdapter)
  const retrievalService = new RetrievalService(
    chunkRepository,
    retrievalAdapter,
    embeddingAdapter,
    analysisLogRepository,
  )
  const aiChatPort = new ChatAdapter((query) => retrievalService.retrieve(query))
  const chatService = new ChatService(
    aiChatPort,
    conversationRepository,
    messageRepository,
    memoryService,
  )
  const analysisLogService = new AnalysisLogService(
    analysisLogRepository,
    analysisStepRepository,
    scenarioKnowledgeRepository,
    taskResultRepository,
  )
  const analysisCheckpointService = new AnalysisCheckpointService(
    analysisAdapter,
    analysisLogRepository,
    taskResultRepository,
  )
  const analysisResultPersister = new AnalysisResultPersister(
    analysisLogRepository,
    analysisStepRepository,
    taskResultRepository,
    scenarioKnowledgeRepository,
  )
  const analysisStreamOrchestrator = new AnalysisStreamOrchestrator(
    analysisAdapter,
    analysisResultPersister,
  )
  const incrementalAnalysis = new IncrementalAnalysisService(
    analysisLogRepository,
    analysisStepRepository,
    scenarioKnowledgeRepository,
    analysisAdapter,
  )
  const analysisService = new AnalysisService(
    analysisAdapter,
    draftAdapter,
    analysisLogRepository,
    analysisStepRepository,
    taskResultRepository,
    scenarioKnowledgeRepository,
    incrementalAnalysis,
    analysisCheckpointService,
    analysisCache,
  )
  const taskService = new TaskService(taskRepository, analysisService, sourceService)
  const analysisTaskScheduler = new AnalysisTaskScheduler(aiRequestQueue, analysisService)

  container.registerSingleton(Tokens.AnalysisCache, () => analysisCache)
  container.registerSingleton(Tokens.PreferenceService, () => preferenceService)
  container.registerSingleton(Tokens.UserService, () => userService)
  container.registerSingleton(Tokens.AuthService, () => authService)
  container.registerSingleton(Tokens.ShareService, () => shareService)
  container.registerSingleton(Tokens.ObservabilityService, () => observabilityService)
  container.registerSingleton(Tokens.ModelConfigService, () => modelConfigService)
  container.registerSingleton(Tokens.ChunkService, () => chunkService)
  container.registerSingleton(Tokens.SourceService, () => sourceService)
  container.registerSingleton(Tokens.MemoryService, () => memoryService)
  container.registerSingleton(Tokens.RetrievalService, () => retrievalService)
  container.registerSingleton(Tokens.AIChatPort, () => aiChatPort)
  container.registerSingleton(Tokens.ChatService, () => chatService)
  container.registerSingleton(Tokens.AnalysisLogService, () => analysisLogService)
  container.registerSingleton(Tokens.AnalysisCheckpointService, () => analysisCheckpointService)
  container.registerSingleton(Tokens.AnalysisResultPersister, () => analysisResultPersister)
  container.registerSingleton(Tokens.AnalysisStreamOrchestrator, () => analysisStreamOrchestrator)
  container.registerSingleton(Tokens.IncrementalAnalysis, () => incrementalAnalysis)
  container.registerSingleton(Tokens.AnalysisService, () => analysisService)
  container.registerSingleton(Tokens.TaskService, () => taskService)
  container.registerSingleton(Tokens.AnalysisTaskScheduler, () => analysisTaskScheduler)

  const dependencies: AppDependencies = {
    driver,
    userRepository,
    sourceRepository,
    taskResultRepository,
    taskRepository,
    shareRepository,
    analysisLogRepository,
    analysisStepRepository,
    scenarioKnowledgeRepository,
    observabilityRepository,
    chunkRepository,
    conversationRepository,
    messageRepository,
    memoryRepository,
    modelConfigRepository,
    preferenceRepository,
    userReadRepository,
    userWriteRepository,
    sourceReadRepository,
    sourceWriteRepository,
    taskResultReadRepository,
    taskResultWriteRepository,
    taskReadRepository,
    taskWriteRepository,
    shareReadRepository,
    shareWriteRepository,
    analysisLogReadRepository,
    analysisLogWriteRepository,
    analysisStepReadRepository,
    analysisStepWriteRepository,
    scenarioKnowledgeReadRepository,
    scenarioKnowledgeWriteRepository,
    observabilityReadRepository,
    observabilityWriteRepository,
    chunkReadRepository,
    chunkWriteRepository,
    conversationReadRepository,
    conversationWriteRepository,
    messageReadRepository,
    messageWriteRepository,
    memoryReadRepository,
    memoryWriteRepository,
    modelConfigReadRepository,
    modelConfigWriteRepository,
    preferenceReadRepository,
    preferenceWriteRepository,
  }

  return { container, dependencies }
}
