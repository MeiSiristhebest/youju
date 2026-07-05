import express from 'express'
import type { RetrievalService } from '../../domain/services/retrievalService.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { chatRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/zodValidator.js'
import { retrieveSchema } from '../validation/schemas.js'

function getRetrievalService(): RetrievalService {
  return getService<RetrievalService>(Tokens.RetrievalService)
}

const router = express.Router()

router.post('/retrieve', chatRateLimiter, validateBody(retrieveSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }

  const { query, sourceIds, topK } = req.body as {
    query: string
    sourceIds?: string[]
    topK?: number
  }

  try {
    const result = await getRetrievalService().retrieve({
      text: query,
      userId,
      sessionId,
      sourceFilter: sourceIds,
      topK,
    })

    res.json({
      code: 200,
      data: {
        chunks: result.items,
        latencyMs: result.latencyMs,
        stages: result.stages,
      },
    })
  } catch (e) {
    console.error('Retrieve error:', e)
    res.status(500).json({ code: 500, msg: `检索失败: ${(e as Error).message}` })
  }
})

export default router
