import { analysisAdapter } from '../../ai/adapters/analysisAdapter.js'
import { ChatAdapter } from '../../ai/adapters/chatAdapter.js'
import { draftAdapter } from '../../ai/adapters/draftAdapter.js'
import { embeddingAdapter } from '../../ai/adapters/embeddingAdapter.js'
import { modelProviderAdapter } from '../../ai/adapters/modelProviderAdapter.js'
import { retrievalAdapter } from '../../ai/adapters/retrievalAdapter.js'
import { aiRequestQueue } from '../../ai/concurrencyLimiter.js'
import type { PreferenceRepository } from '../../domain/ports/repositories.js'
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
import { jwtAdapter } from '../auth.js'
import { documentChunkerAdapter } from '../fileParser/chunkerAdapter.js'
import type { AdapterDependencies } from './configureAdapters.js'
import type { RepositoryDependencies } from './configureRepositories.js'
import type { ServiceLocator } from './container.js'
import { Tokens } from './tokens.js'

export interface ServiceDependencies {
  analysisCache: InstanceType<typeof AnalysisCache>
  preferenceService: PreferenceService
  userService: UserService
  authService: AuthService
  shareService: ShareService
  observabilityService: ObservabilityService
  modelConfigService: ModelConfigService
  chunkService: ChunkService
  sourceService: SourceService
  memoryService: MemoryService
  retrievalService: RetrievalService
  chatService: ChatService
  analysisLogService: AnalysisLogService
  analysisCheckpointService: AnalysisCheckpointService
  analysisResultPersister: AnalysisResultPersister
  analysisStreamOrchestrator: AnalysisStreamOrchestrator
  incrementalAnalysis: IncrementalAnalysisService
  analysisService: AnalysisService
  taskService: TaskService
  analysisTaskScheduler: AnalysisTaskScheduler
}

export function configureServices(
  repos: RepositoryDependencies,
  adapters: AdapterDependencies,
  container: ServiceLocator,
): ServiceDependencies {
  const analysisCache = new AnalysisCache(adapters.modeChecker)
  const preferenceService = new PreferenceService(repos.preferenceRepository)

  const userService = new UserService(repos.userRepository)
  const authService = new AuthService(jwtAdapter, userService)
  const shareService = new ShareService(repos.shareRepository)
  const observabilityService = new ObservabilityService(
    repos.observabilityRepository,
    repos.scenarioKnowledgeRepository,
  )
  const modelConfigService = new ModelConfigService(
    repos.modelConfigRepository,
    modelProviderAdapter,
  )
  const chunkService = new ChunkService(
    repos.chunkRepository,
    embeddingAdapter,
    repos.analysisLogRepository,
    documentChunkerAdapter,
    repos.modelConfigRepository,
  )
  const sourceService = new SourceService(
    repos.sourceRepository,
    repos.chunkRepository,
    chunkService,
  )
  const memoryService = new MemoryService(
    repos.memoryRepository,
    embeddingAdapter,
    repos.modelConfigRepository,
  )
  const retrievalService = new RetrievalService(
    repos.chunkRepository,
    retrievalAdapter,
    embeddingAdapter,
    repos.analysisLogRepository,
    repos.modelConfigRepository,
  )
  const aiChatPort = new ChatAdapter(
    (query) => retrievalService.retrieve(query),
    // 批量查询 sourceId → sourceName，用于填充 chat citation 的 sourceName 字段
    async (ids, userId, sessionId) => {
      const nameMap = new Map<string, string>()
      await Promise.all(
        ids.map(async (id) => {
          try {
            const source = await repos.sourceRepository.getSourceById(userId, sessionId, id)
            if (source?.name) nameMap.set(id, source.name)
          } catch {
            // 忽略单个查询失败
          }
        }),
      )
      return nameMap
    },
  )
  const chatService = new ChatService(
    aiChatPort,
    repos.conversationRepository,
    repos.messageRepository,
    memoryService,
  )

  const analysisLogService = new AnalysisLogService(
    repos.analysisLogRepository,
    repos.analysisStepRepository,
    repos.scenarioKnowledgeRepository,
    repos.taskResultRepository,
  )
  const analysisCheckpointService = new AnalysisCheckpointService(
    analysisAdapter,
    repos.analysisLogRepository,
    repos.taskResultRepository,
  )
  const analysisResultPersister = new AnalysisResultPersister(
    repos.analysisLogRepository,
    repos.analysisStepRepository,
    repos.taskResultRepository,
    repos.scenarioKnowledgeRepository,
    adapters.modeChecker,
  )
  const analysisStreamOrchestrator = new AnalysisStreamOrchestrator(
    analysisAdapter,
    analysisResultPersister,
  )
  const incrementalAnalysis = new IncrementalAnalysisService(
    repos.analysisLogRepository,
    repos.analysisStepRepository,
    repos.scenarioKnowledgeRepository,
    analysisAdapter,
    preferenceService,
  )
  const analysisService = new AnalysisService(
    analysisAdapter,
    draftAdapter,
    incrementalAnalysis,
    analysisCheckpointService,
    preferenceService,
    repos.analysisLogRepository,
    repos.analysisStepRepository,
    repos.taskResultRepository,
    repos.scenarioKnowledgeRepository,
    adapters.modeChecker,
  )
  const taskService = new TaskService(repos.taskRepository, analysisService, sourceService)
  const analysisTaskScheduler = new AnalysisTaskScheduler(aiRequestQueue, analysisService)

  container.registerSingleton(Tokens.AnalysisCache, () => analysisCache)
  container.registerSingleton(Tokens.PreferenceService, () => preferenceService)
  container.registerSingleton(Tokens.RiskPreferencePort, () => preferenceService)
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

  return {
    analysisCache,
    preferenceService,
    userService,
    authService,
    shareService,
    observabilityService,
    modelConfigService,
    chunkService,
    sourceService,
    memoryService,
    retrievalService,
    chatService,
    analysisLogService,
    analysisCheckpointService,
    analysisResultPersister,
    analysisStreamOrchestrator,
    incrementalAnalysis,
    analysisService,
    taskService,
    analysisTaskScheduler,
  }
}
