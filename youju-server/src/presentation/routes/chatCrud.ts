import express from 'express'
import { createTenantContext } from '../../domain/context/tenantContext.js'
import type { ChatService } from '../../domain/services/chatService.js'
import type { MemoryService } from '../../domain/services/memoryService.js'
import type { MessageFeedback } from '../../domain/types.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { chatRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/zodValidator.js'
import {
  chatCreateSchema,
  chatFeedbackSchema,
  chatMemoryCreateSchema,
  chatRenameSchema,
} from '../validation/schemas.js'

function getChatService(): ChatService {
  return getService<ChatService>(Tokens.ChatService)
}

function getMemoryService(): MemoryService {
  return getService<MemoryService>(Tokens.MemoryService)
}

const router = express.Router()

function parsePagination(query: { limit?: string; offset?: string }): {
  limit?: number
  offset?: number
} {
  const result: { limit?: number; offset?: number } = {}
  const limit = query.limit ? Number(query.limit) : undefined
  const offset = query.offset ? Number(query.offset) : undefined
  if (Number.isFinite(limit) && limit! > 0 && limit! <= 100) {
    result.limit = limit
  }
  if (Number.isFinite(offset) && offset! >= 0) {
    result.offset = offset
  }
  return result
}

// POST /conversations - 创建会话
router.post('/conversations', chatRateLimiter, validateBody(chatCreateSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }

  try {
    const conversation = await getChatService().createConversation({
      userId,
      sessionId,
      title: req.body.title,
      scenarioType: req.body.scenarioType,
      sourceIds: req.body.sourceIds,
      contextSourceIds: req.body.contextSourceIds,
    })
    res.json({ code: 200, data: conversation })
  } catch (e) {
    console.error('Create conversation error:', e)
    res.status(500).json({ code: 500, msg: `创建会话失败: ${(e as Error).message}` })
  }
})

// GET /conversations - 列出会话（分页）
router.get('/conversations', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }

  try {
    const pagination = parsePagination(req.query as { limit?: string; offset?: string })
    const conversations = await getChatService().listConversations(userId, sessionId, pagination)
    res.json({ code: 200, data: conversations })
  } catch (e) {
    console.error('List conversations error:', e)
    res.status(500).json({ code: 500, msg: `列出会话失败: ${(e as Error).message}` })
  }
})

// GET /conversations/:id/messages - 获取历史消息
router.get('/conversations/:id/messages', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }

  try {
    const messages = await getChatService().getMessages(String(req.params.id), { limit: 50 })
    res.json({ code: 200, data: messages })
  } catch (e) {
    console.error('Get messages error:', e)
    res.status(500).json({ code: 500, msg: `获取消息失败: ${(e as Error).message}` })
  }
})

// PATCH /conversations/:id - 重命名
router.patch('/conversations/:id', validateBody(chatRenameSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }

  try {
    const tenantCtx = createTenantContext(userId, sessionId)
    const updated = await getChatService().renameConversation(
      String(req.params.id),
      req.body.title,
      tenantCtx,
    )
    if (!updated) {
      return res.status(404).json({ code: 404, msg: '会话不存在' })
    }
    res.json({ code: 200, data: updated })
  } catch (e) {
    console.error('Rename conversation error:', e)
    res.status(500).json({ code: 500, msg: `重命名失败: ${(e as Error).message}` })
  }
})

// DELETE /conversations/:id - 软删除
router.delete('/conversations/:id', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }

  try {
    const tenantCtx = createTenantContext(userId, sessionId)
    const ok = await getChatService().deleteConversation(String(req.params.id), tenantCtx)
    if (!ok) {
      return res.status(404).json({ code: 404, msg: '会话不存在' })
    }
    res.json({ code: 200, msg: '已删除' })
  } catch (e) {
    console.error('Delete conversation error:', e)
    res.status(500).json({ code: 500, msg: `删除失败: ${(e as Error).message}` })
  }
})

// POST /messages/:id/feedback - 反馈
router.post(
  '/messages/:id/feedback',
  chatRateLimiter,
  validateBody(chatFeedbackSchema),
  async (req, res) => {
    const { userId, sessionId } = await getUserIdAndSessionId(req)

    if (userId === null && sessionId === null) {
      return res.status(401).json({ code: 401, msg: '未授权访问' })
    }

    try {
      const feedback = req.body.feedback as MessageFeedback
      const ok = await getChatService().updateMessageFeedback(String(req.params.id), feedback)
      if (!ok) {
        return res.status(404).json({ code: 404, msg: '消息不存在' })
      }
      res.json({ code: 200, msg: '反馈已记录' })
    } catch (e) {
      console.error('Update feedback error:', e)
      res.status(500).json({ code: 500, msg: `反馈失败: ${(e as Error).message}` })
    }
  },
)

// POST /memory - 创建长期记忆
router.post('/memory', chatRateLimiter, validateBody(chatMemoryCreateSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }
  try {
    const memory = await getMemoryService().createMemory({
      userId,
      sessionId,
      content: req.body.content,
    })
    res.json({
      code: 200,
      data: { id: memory.id, content: memory.content, createdAt: memory.createdAt },
    })
  } catch (e) {
    console.error('Create memory error:', e)
    res.status(500).json({ code: 500, msg: `创建记忆失败: ${(e as Error).message}` })
  }
})

// GET /memory - 列出当前用户/会话的所有长期记忆
router.get('/memory', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }
  try {
    const tenantCtx = createTenantContext(userId, sessionId)
    const memories = await getMemoryService().listMemories(tenantCtx)
    res.json({ code: 200, data: memories })
  } catch (e) {
    console.error('List memories error:', e)
    res.status(500).json({ code: 500, msg: `列出记忆失败: ${(e as Error).message}` })
  }
})

// DELETE /memory/:id - 删除指定长期记忆
router.delete('/memory/:id', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }
  try {
    const tenantCtx = createTenantContext(userId, sessionId)
    const ok = await getMemoryService().deleteMemory(String(req.params.id), tenantCtx)
    if (!ok) {
      return res.status(404).json({ code: 404, msg: '记忆不存在' })
    }
    res.json({ code: 200, msg: '已删除' })
  } catch (e) {
    console.error('Delete memory error:', e)
    res.status(500).json({ code: 500, msg: `删除记忆失败: ${(e as Error).message}` })
  }
})

export default router
