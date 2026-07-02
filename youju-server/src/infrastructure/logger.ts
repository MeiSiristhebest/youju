import pino from 'pino'
import { getEnv, isDev, isTest } from './env.js'

const level = isTest() ? 'silent' : isDev() ? 'debug' : 'info'

const transport = isDev()
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    }
  : undefined

export const logger = pino({
  level,
  transport,
  base: {
    env: getEnv().NODE_ENV,
  },
})

export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings)
}
