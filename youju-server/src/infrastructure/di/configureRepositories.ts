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
  AnalysisLogRepository,
  AnalysisStepRepository,
  ChunkRepository,
  ConversationRepository,
  MemoryRepository,
  MessageRepository,
  ModelConfigRepository,
  ObservabilityRepository,
  PreferenceRepository,
  ScenarioKnowledgeRepository,
  ShareRepository,
  SourceRepository,
  TaskRepository,
  TaskResultRepository,
  UserRepository,
} from '../../domain/ports/repositories.js'
import type { ServiceLocator } from './container.js'
import { Tokens } from './tokens.js'

export interface RepositoryDependencies {
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
  modelConfigRepository: ModelConfigRepository
  preferenceRepository: PreferenceRepository
}

export function configureRepositories(
  driver: DatabaseDriver,
  container: ServiceLocator,
): RepositoryDependencies {
  const userRepository = createUserRepository(driver)
  const sourceRepository = createSourceRepository(driver)
  const taskResultRepository = createTaskResultRepository(driver)
  const taskRepository = createTaskRepository(driver, taskResultRepository)
  const shareRepository = createShareRepository(driver)
  const analysisLogRepository = createAnalysisLogRepository(driver)
  const analysisStepRepository = createAnalysisStepRepository(driver)
  const scenarioKnowledgeRepository = createScenarioKnowledgeRepository(driver)
  const observabilityRepository = createObservabilityRepository(driver)
  const modelConfigRepository = createModelConfigRepository(driver)
  const chunkRepository = createChunkRepository(driver)
  const conversationRepository = createConversationRepository(driver)
  const messageRepository = createMessageRepository(driver)
  const memoryRepository = createMemoryRepository(driver)
  const preferenceRepository = createPreferenceRepository(driver)

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

  return {
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
  }
}
