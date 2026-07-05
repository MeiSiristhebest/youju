import { bootstrap, shutdown } from './app.js'
import { driver } from './data/db.js'
import { getEnv } from './infrastructure/env.js'
import { logger } from './infrastructure/logger.js'

async function main() {
  const { app } = await bootstrap(driver)

  const PORT = getEnv().PORT
  const server = app.listen(PORT, () => {
    logger.info(`有据 后端服务启动: http://localhost:${PORT}`)
    logger.info(`AI API Key: ${getEnv().AI_API_KEY ? '已配置' : '未配置 (将使用 Mock 模式)'}`)
    logger.info('数据库: SQLite (youju.db)')
    logger.info('架构: 分层架构 (Presentation → Domain → Data → AI)')
    logger.info('端口注入: AIAnalysisPort → AnalysisAdapter, AIDraftPort → DraftAdapter')
  })

  async function gracefulShutdown(signal: string) {
    logger.info(`收到 ${signal}，正在优雅关闭服务...`)

    const timeout = setTimeout(() => {
      logger.error('优雅关闭超时，强制退出')
      process.exit(1)
    }, 10_000)

    try {
      shutdown()
    } catch (e) {
      logger.error({ err: e }, '关闭应用失败')
    }

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
}

main().catch((err) => {
  logger.error({ err }, '应用启动失败')
  process.exit(1)
})
