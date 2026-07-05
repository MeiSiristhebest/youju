import type { Express } from 'express'
import express from 'express'
import type { DatabaseDriver } from './data/DatabaseDriver.js'
import type { AnalysisService } from './domain/services/analysisService.js'
import { startBackgroundJobs, stopBackgroundJobs } from './infrastructure/backgroundJobs.js'
import { type AppDependencies, configureContainer } from './infrastructure/di/configureContainer.js'
import type { ServiceLocator } from './infrastructure/di/container.js'
import { hasService } from './infrastructure/di/serviceLocator.js'
import { Tokens } from './infrastructure/di/tokens.js'
import { getEnv } from './infrastructure/env.js'
import { logger } from './infrastructure/logger.js'
import { registerMiddleware } from './presentation/middleware/index.js'

export type { AppDependencies } from './infrastructure/di/configureContainer.js'

let _container: ServiceLocator | null = null
let _app: Express | null = null

export function createApp(driver: DatabaseDriver) {
  const { container, dependencies } = configureContainer(driver)
  _container = container

  const app = express()
  _app = app

  registerMiddleware(app)

  return { app, dependencies, container }
}

export function getContainer(): ServiceLocator {
  if (!_container) {
    throw new Error('Container not initialized. Call createApp() or bootstrap() first.')
  }
  return _container
}

export function getService<T>(token: symbol): T {
  return getContainer().resolve<T>(token)
}

export function getApp(): Express {
  if (!_app) {
    throw new Error('App not initialized. Call createApp() or bootstrap() first.')
  }
  return _app
}

export interface BootstrapResult {
  app: Express
  container: ServiceLocator
  dependencies: AppDependencies
  backgroundJobsStarted: boolean
  preheatStarted: boolean
}

export async function bootstrap(driver: DatabaseDriver): Promise<BootstrapResult> {
  const { app, container, dependencies } = createApp(driver)

  let backgroundJobsStarted = false
  let preheatStarted = false

  if (getEnv().ENABLE_BACKGROUND_JOBS === 'true') {
    startBackgroundJobs()
    backgroundJobsStarted = true
    logger.info('定时任务: 已启动 (decay + cleanup)')
  } else {
    logger.info('定时任务: 已禁用 (ENABLE_BACKGROUND_JOBS=false)')
  }

  if (getEnv().ENABLE_SCENARIO_PREHEAT === 'true') {
    preheatStarted = true
    const analysisService = container.resolve(Tokens.AnalysisService) as AnalysisService
    analysisService
      .preheatScenarioPresets()
      .then(({ preheated, skipped, failed }) => {
        if (preheated.length > 0) {
          logger.info(`[Preheat] 预热完成: ${preheated.join(', ')} 共 ${preheated.length} 个场景`)
        }
        if (skipped.length > 0) {
          logger.info(`[Preheat] 已存在缓存跳过: ${skipped.join(', ')}`)
        }
        if (failed.length > 0) {
          logger.warn(
            `[Preheat] 部分场景预热失败: ${failed.map((f: { id: string; error: string }) => `${f.id}(${f.error})`).join(', ')}`,
          )
        }
      })
      .catch((e: Error) => {
        logger.error({ err: e }, '[Preheat] 预热过程异常')
      })
    logger.info('预热: 已异步启动 (ENABLE_SCENARIO_PREHEAT)')
  } else {
    logger.info('预热: 已禁用 (ENABLE_SCENARIO_PREHEAT=false)')
  }

  return { app, container, dependencies, backgroundJobsStarted, preheatStarted }
}

export function shutdown(): void {
  try {
    stopBackgroundJobs()
    logger.info('✓ 定时任务已停止')
  } catch (e) {
    logger.error({ err: e }, '停止定时任务失败')
  }
}

export { hasService, Tokens }
