import cors from 'cors'
import type { Express } from 'express'
import express from 'express'
import apiRouter from '../routes/index.js'
import { errorHandler, notFoundHandler } from './errorHandler.js'
import { generalRateLimiter } from './rateLimiter.js'
import { securityHeaders } from './securityHeaders.js'

export function registerMiddleware(app: Express): void {
  app.set('trust proxy', 1)
  app.use(securityHeaders)
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.use('/api/v1', generalRateLimiter, apiRouter)
  app.use('/api', generalRateLimiter, apiRouter)
  app.use('/api', notFoundHandler)
  app.use(errorHandler)
}
