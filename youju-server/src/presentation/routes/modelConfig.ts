import express from 'express'
import { ANALYSIS_MODEL_OPTIONS, PROVIDER_PRESETS } from '../../domain/registry/modelRegistry.js'
import type { ModelConfigService } from '../../domain/services/modelConfigService.js'
import type { AIConfig } from '../../domain/types.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { validateBody } from '../middleware/zodValidator.js'
import {
  modelConfigCreateSchema,
  modelConfigTestSchema,
  modelConfigUpdateSchema,
  modelListFetchSchema,
} from '../validation/schemas.js'

function getModelConfigService(): ModelConfigService {
  return getService<ModelConfigService>(Tokens.ModelConfigService)
}

const router = express.Router()

// 厂商预设列表（静态数据，无需鉴权）
router.get('/models/presets', (_req, res) => {
  res.json({ code: 200, data: PROVIDER_PRESETS })
})

// 分析模型下拉选项（静态数据，无需鉴权）
router.get('/models/options', (_req, res) => {
  res.json({ code: 200, data: ANALYSIS_MODEL_OPTIONS })
})

router.get('/model-configs', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const configType = req.query.type as string | undefined
  const configs = await getModelConfigService().listModelConfigs(userId, sessionId, configType)
  const safeConfigs = configs.map(({ apiKey, ...rest }) => rest)
  res.json({ code: 200, data: safeConfigs })
})

router.get('/model-configs/default', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const configType = (req.query.type as string) || 'llm'
  const config = await getModelConfigService().getDefaultModelConfig(userId, sessionId, configType)
  if (!config) {
    return res.json({ code: 200, data: null })
  }
  const { apiKey, ...safeConfig } = config
  res.json({ code: 200, data: safeConfig })
})

router.post('/model-configs', validateBody(modelConfigCreateSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const config = await getModelConfigService().createModelConfig(userId, sessionId, req.body)
  const { apiKey, ...safeConfig } = config
  res.json({ code: 200, data: safeConfig })
})

router.put('/model-configs/:id', validateBody(modelConfigUpdateSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const config = await getModelConfigService().updateModelConfig(
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
  const success = await getModelConfigService().deleteModelConfig(
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
  const success = await getModelConfigService().setDefaultModelConfig(
    String(req.params.id),
    userId,
    sessionId,
  )
  if (!success) {
    return res.status(404).json({ code: 404, msg: '配置不存在' })
  }
  res.json({ code: 200, data: { success: true } })
})

router.post('/model-configs/:id/list-models', async (req, res) => {
  try {
    const { userId, sessionId } = await getUserIdAndSessionId(req)
    const config = await getModelConfigService().getModelConfig(
      String(req.params.id),
      userId,
      sessionId,
    )
    if (!config) {
      return res.status(404).json({ code: 404, msg: '配置不存在' })
    }
    const models = await getModelConfigService().listModels({
      provider: config.provider,
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: '',
    } as AIConfig)
    res.json({ code: 200, data: models })
  } catch (e) {
    const message = (e as Error).message
    res.status(400).json({ code: 400, msg: '获取模型列表失败', data: { error: message } })
  }
})

router.post('/model-configs/list-models', validateBody(modelListFetchSchema), async (req, res) => {
  try {
    const models = await getModelConfigService().listModels({
      provider: req.body.provider,
      apiKey: req.body.apiKey,
      baseURL: req.body.baseURL,
      model: '',
    } as AIConfig)
    res.json({ code: 200, data: models })
  } catch (e) {
    const message = (e as Error).message
    res.status(400).json({ code: 400, msg: '获取模型列表失败', data: { error: message } })
  }
})

router.post('/model-configs/:id/test', async (req, res) => {
  try {
    const { userId, sessionId } = await getUserIdAndSessionId(req)
    const config = await getModelConfigService().getModelConfig(
      String(req.params.id),
      userId,
      sessionId,
    )
    if (!config) {
      return res.status(404).json({ code: 404, msg: '配置不存在' })
    }
    const result = await getModelConfigService().testModelConnection({
      provider: config.provider,
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model,
    } as AIConfig)
    res.json({ code: 200, data: result })
  } catch (e) {
    const message = (e as Error).message
    res.status(400).json({ code: 400, msg: '连接测试失败', data: { error: message } })
  }
})

router.post('/model-configs/test', validateBody(modelConfigTestSchema), async (req, res) => {
  try {
    const result = await getModelConfigService().testModelConnection({
      provider: req.body.provider,
      apiKey: req.body.apiKey,
      baseURL: req.body.baseURL,
      model: req.body.model,
    } as AIConfig)
    res.json({ code: 200, data: result })
  } catch (e) {
    const message = (e as Error).message
    res.status(400).json({ code: 400, msg: '连接测试失败', data: { error: message } })
  }
})

export default router
