import cors from 'cors'
import express from 'express'
import { analysisAdapter } from './ai/adapters/analysisAdapter.js'
import { draftAdapter } from './ai/adapters/draftAdapter.js'
import type { DatabaseDriver } from './data/DatabaseDriver.js'
import { createAnalysisLogRepository } from './data/repositories/analysisLogRepository.js'
import { createAnalysisStepRepository } from './data/repositories/analysisStepRepository.js'
import { createModelConfigRepository } from './data/repositories/modelConfigRepository.js'
import { createObservabilityRepository } from './data/repositories/observabilityRepository.js'
import { createScenarioKnowledgeRepository } from './data/repositories/scenarioKnowledgeRepository.js'
import { createShareRepository } from './data/repositories/shareRepository.js'
import { createSourceRepository } from './data/repositories/sourceRepository.js'
import { createTaskRepository } from './data/repositories/taskRepository.js'
import { createTaskResultRepository } from './data/repositories/taskResultRepository.js'
import { createUserRepository } from './data/repositories/userRepository.js'
import {
  setAnalysisLogRepository,
  setAnalysisPort,
  setAnalysisStepRepository,
  setDraftPort,
  setScenarioKnowledgeRepository,
  setTaskResultRepository,
} from './domain/services/analysisService.js'
import { setModelConfigRepository } from './domain/services/modelConfigService.js'
import {
  setObservabilityRepository,
  setScenarioKnowledgeRepositoryForObservability,
} from './domain/services/observabilityService.js'
import { setShareRepository } from './domain/services/shareService.js'
import { setSourceRepository } from './domain/services/sourceService.js'
import { setTaskRepository } from './domain/services/taskService.js'
import { setUserRepository } from './domain/services/userService.js'
import { setUserRepository as setAuthUserRepository } from './infrastructure/auth.js'
import apiRouter from './presentation/index.js'
import { errorHandler, notFoundHandler } from './presentation/middleware/errorHandler.js'
import { generalRateLimiter } from './presentation/middleware/rateLimiter.js'
import { securityHeaders } from './presentation/middleware/securityHeaders.js'

export interface AppDependencies {
  driver: DatabaseDriver
  userRepository: ReturnType<typeof createUserRepository>
  sourceRepository: ReturnType<typeof createSourceRepository>
  taskResultRepository: ReturnType<typeof createTaskResultRepository>
  taskRepository: ReturnType<typeof createTaskRepository>
  shareRepository: ReturnType<typeof createShareRepository>
  analysisLogRepository: ReturnType<typeof createAnalysisLogRepository>
  analysisStepRepository: ReturnType<typeof createAnalysisStepRepository>
  scenarioKnowledgeRepository: ReturnType<typeof createScenarioKnowledgeRepository>
  observabilityRepository: ReturnType<typeof createObservabilityRepository>
}

export function createApp(driver: DatabaseDriver) {
  setAnalysisPort(analysisAdapter)
  setDraftPort(draftAdapter)

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

  setAnalysisLogRepository(
    analysisLogRepository as unknown as Parameters<typeof setAnalysisLogRepository>[0],
  )
  setAnalysisStepRepository(
    analysisStepRepository as unknown as Parameters<typeof setAnalysisStepRepository>[0],
  )
  setTaskResultRepository(
    taskResultRepository as unknown as Parameters<typeof setTaskResultRepository>[0],
  )
  setScenarioKnowledgeRepository(
    scenarioKnowledgeRepository as unknown as Parameters<typeof setScenarioKnowledgeRepository>[0],
  )
  setScenarioKnowledgeRepositoryForObservability(
    scenarioKnowledgeRepository as unknown as Parameters<
      typeof setScenarioKnowledgeRepositoryForObservability
    >[0],
  )
  setUserRepository(userRepository as unknown as Parameters<typeof setUserRepository>[0])
  setAuthUserRepository(userRepository as unknown as Parameters<typeof setAuthUserRepository>[0])
  setSourceRepository(sourceRepository as unknown as Parameters<typeof setSourceRepository>[0])
  setTaskRepository(taskRepository as unknown as Parameters<typeof setTaskRepository>[0])
  setShareRepository(shareRepository as unknown as Parameters<typeof setShareRepository>[0])
  setObservabilityRepository(
    observabilityRepository as unknown as Parameters<typeof setObservabilityRepository>[0],
  )
  setModelConfigRepository(
    modelConfigRepository as unknown as Parameters<typeof setModelConfigRepository>[0],
  )

  const app = express()

  app.set('trust proxy', 1)
  app.use(securityHeaders)
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.use('/api/v1', generalRateLimiter, apiRouter)
  app.use('/api', generalRateLimiter, apiRouter)
  app.use('/api', notFoundHandler)
  app.use(errorHandler)

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
  }

  return { app, dependencies }
}
