import express from 'express'
import { testModelConnection } from '../../ai/llm.js'
import * as modelConfigService from '../../domain/services/modelConfigService.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { validateBody } from '../middleware/zodValidator.js'
import {
  modelConfigCreateSchema,
  modelConfigTestSchema,
  modelConfigUpdateSchema,
} from '../validation/schemas.js'

const router = express.Router()

router.get('/model-configs', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const configs = await modelConfigService.listModelConfigs(userId, sessionId)
  const safeConfigs = configs.map(({ apiKey, ...rest }) => rest)
  res.json({ code: 200, data: safeConfigs })
})

router.get('/model-configs/default', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const config = await modelConfigService.getDefaultModelConfig(userId, sessionId)
  if (!config) {
    return res.json({ code: 200, data: null })
  }
  const { apiKey, ...safeConfig } = config
  res.json({ code: 200, data: safeConfig })
})

router.post('/model-configs', validateBody(modelConfigCreateSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const config = await modelConfigService.createModelConfig(userId, sessionId, req.body)
  const { apiKey, ...safeConfig } = config
  res.json({ code: 200, data: safeConfig })
})

router.put('/model-configs/:id', validateBody(modelConfigUpdateSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const config = await modelConfigService.updateModelConfig(
    String(req.params.id),
    userId,
    sessionId,
    req.body,
  )
  if (!config) {
    return res.status(404).json({ code: 404, msg: '配置不存在' })
  }
  const { apiKey, ...safeConfig } = config
  res.json({ code: 200, data: safeConfig })
})

router.delete('/model-configs/:id', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const success = await modelConfigService.deleteModelConfig(
    String(req.params.id),
    userId,
    sessionId,
  )
  if (!success) {
    return res.status(404).json({ code: 404, msg: '配置不存在' })
  }
  res.json({ code: 200, data: { success: true } })
})

router.post('/model-configs/:id/set-default', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const success = await modelConfigService.setDefaultModelConfig(
    String(req.params.id),
    userId,
    sessionId,
  )
  if (!success) {
    return res.status(404).json({ code: 404, msg: '配置不存在' })
  }
  res.json({ code: 200, data: { success: true } })
})

router.post('/model-configs/test', validateBody(modelConfigTestSchema), async (req, res) => {
  try {
    const result = await testModelConnection({
      provider: req.body.provider,
      apiKey: req.body.apiKey,
      baseURL: req.body.baseURL,
      model: req.body.model,
    })
    res.json({ code: 200, data: result })
  } catch (e) {
    const message = (e as Error).message
    res.status(400).json({ code: 400, msg: '连接测试失败', data: { error: message } })
  }
})

export default router
