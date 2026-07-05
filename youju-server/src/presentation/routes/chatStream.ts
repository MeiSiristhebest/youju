import express from 'express'
import { createTenantContext } from '../../domain/context/tenantContext.js'
import type { ChatService } from '../../domain/services/chatService.js'
import type { ModelConfigService } from '../../domain/services/modelConfigService.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { chatRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/zodValidator.js'
import { chatMessageSchema } from '../validation/schemas.js'

function getChatService(): ChatService {
  return getService<ChatService>(Tokens.ChatService)
}

function getModelConfigService(): ModelConfigService {
  return getService<ModelConfigService>(Tokens.ModelConfigService)
}

const router = express.Router()

// POST /conversations/:id/messages/stream - 流式发送消息
router.post(
  '/conversations/:id/messages/stream',
  chatRateLimiter,
  validateBody(chatMessageSchema),
  async (req, res) => {
    const { userId, sessionId } = await getUserIdAndSessionId(req)
    const conversationId = String(req.params.id)

    if (userId === null && sessionId === null) {
      return res.status(401).json({ code: 401, msg: '未授权访问' })
    }

    const { content, contextSourceIds, scenarioType } = req.body as {
      content: string
      contextSourceIds?: string[]
      scenarioType?: string
    }

    const tenantCtx = createTenantContext(userId, sessionId)
    const conversation = await getChatService().getConversation(conversationId, tenantCtx)
    if (!conversation) {
      return res.status(404).json({ code: 404, msg: '会话不存在' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const defaultModelConfig = await getModelConfigService().getDefaultModelConfig(
      userId,
      sessionId,
    )
    const aiConfig = defaultModelConfig
      ? {
          apiKey: defaultModelConfig.apiKey,
          baseURL: defaultModelConfig.baseURL,
          model: defaultModelConfig.model,
          provider: defaultModelConfig.provider,
        }
      : undefined

    const abortController = new AbortController()
    req.on('close', () => {
      abortController.abort()
    })

    getChatService()
      .sendMessage(
        conversationId,
        content,
        {
          userId,
          sessionId,
          scenarioType,
          contextSourceIds,
          aiConfig,
          abortSignal: abortController.signal,
        },
        {
          onInit: ({ userMessageId }) =>
            sendEvent('init', { conversationId, messageId: userMessageId }),
          onToken: (token) => sendEvent('token', { token }),
          onToolCall: (name, args) => sendEvent('tool_call', { name, args }),
          onCitation: (citations) => sendEvent('citation', { citations }),
          onComplete: (result) => {
            sendEvent('complete', result)
            if (!res.writableEnded) {
              res.end()
            }
          },
          onError: (error) => {
            sendEvent('error', { message: error.message })
            if (!res.writableEnded) {
              res.end()
            }
          },
        },
      )
      .catch((error) => {
        if (!res.writableEnded) {
          sendEvent('error', { message: error.message })
          res.end()
        }
      })
  },
)

// POST /messages/:id/regenerate - 重新生成
router.post('/messages/:id/regenerate', chatRateLimiter, async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  if (userId === null && sessionId === null) {
    return res.status(401).json({ code: 401, msg: '未授权访问' })
  }

  try {
    const originalMessage = await getChatService().getMessageById(String(req.params.id))
    if (originalMessage?.role !== 'user') {
      return res.status(404).json({ code: 404, msg: '原始消息不存在' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const defaultModelConfig = await getModelConfigService().getDefaultModelConfig(
      userId,
      sessionId,
    )
    const aiConfig = defaultModelConfig
      ? {
          apiKey: defaultModelConfig.apiKey,
          baseURL: defaultModelConfig.baseURL,
          model: defaultModelConfig.model,
          provider: defaultModelConfig.provider,
        }
      : undefined

    const abortController = new AbortController()
    req.on('close', () => {
      abortController.abort()
    })

    getChatService()
      .sendMessage(
        originalMessage.conversationId,
        originalMessage.content,
        {
          userId,
          sessionId,
          aiConfig,
          abortSignal: abortController.signal,
        },
        {
          onInit: ({ userMessageId }) =>
            sendEvent('init', {
              conversationId: originalMessage.conversationId,
              messageId: userMessageId,
            }),
          onToken: (token) => sendEvent('token', { token }),
          onToolCall: (name, args) => sendEvent('tool_call', { name, args }),
          onCitation: (citations) => sendEvent('citation', { citations }),
          onComplete: (result) => {
            sendEvent('complete', result)
            if (!res.writableEnded) {
              res.end()
            }
          },
          onError: (error) => {
            sendEvent('error', { message: error.message })
            if (!res.writableEnded) {
              res.end()
            }
          },
        },
      )
      .catch((error) => {
        if (!res.writableEnded) {
          sendEvent('error', { message: error.message })
          res.end()
        }
      })
  } catch (e) {
    console.error('Regenerate error:', e)
    if (!res.writableEnded) {
      res.status(500).json({ code: 500, msg: `重新生成失败: ${(e as Error).message}` })
    }
  }
})

export default router
