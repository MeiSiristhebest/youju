import { CACHE_ENABLED, startCacheStatsLogger } from './ai/promptCache.js'
import { createApp } from './app.js'
import { driver } from './data/db.js'
import type { AnalysisService } from './domain/services/analysisService.js'
import { Tokens } from './infrastructure/di/tokens.js'
import { getEnv } from './infrastructure/env.js'
import { logger } from './infrastructure/logger.js'

const { app, container } = createApp(driver)

const PORT = getEnv().PORT
const server = app.listen(PORT, () => {
  logger.info(`有据 后端服务启动: http://localhost:${PORT}`)
  logger.info(`AI API Key: ${getEnv().AI_API_KEY ? '已配置' : '未配置 (将使用 Mock 模式)'}`)
  logger.info('数据库: SQLite (youju.db)')
  logger.info('架构: 分层架构 (Presentation → Domain → Data → AI)')
  logger.info('端口注入: AIAnalysisPort → AnalysisAdapter, AIDraftPort → DraftAdapter')

  if (CACHE_ENABLED) {
    startCacheStatsLogger()
    logger.info('Prompt Cache: 已启用 (AI_PROMPT_CACHE_ENABLED=true)')
  } else {
    logger.info('Prompt Cache: 已禁用 (AI_PROMPT_CACHE_ENABLED=false)')
  }

  // 后台定时任务已迁移到 Serverless Cron (scheduledTasks.ts)，不再使用 setInterval 方式

  if (getEnv().ENABLE_SCENARIO_PREHEAT === 'true') {
    ;(container.resolve(Tokens.AnalysisService) as AnalysisService)
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
})

async function gracefulShutdown(signal: string) {
  logger.info(`收到 ${signal}，正在优雅关闭服务...`)

  const timeout = setTimeout(() => {
    logger.error('优雅关闭超时，强制退出')
    process.exit(1)
  }, 10_000)

  // 后台定时任务已迁移到 Serverless Cron，无需手动停止

  server.close(() => {
    logger.info('✓ HTTP 服务器已关闭')
  })

  try {
    await driver.close()
    logger.info('✓ 数据库连接已关闭')
  } catch (e) {
    logger.error({ err: e }, '关闭数据库失败')
  }

  clearTimeout(timeout)
  logger.info('服务已完全关闭')
  process.exit(0)
}

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM')
})

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT')
})

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '未处理的 Promise 拒绝')
})

process.on('uncaughtException', (error) => {
  logger.error({ error }, '未捕获的异常')
  gracefulShutdown('uncaughtException')
})
