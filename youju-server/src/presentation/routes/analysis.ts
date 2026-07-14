import express from 'express'
import type { ServerResponse } from 'http'
import type { AnalysisCache } from '../../domain/services/analysisCache.js'
import type { AnalysisCheckpointService } from '../../domain/services/analysisCheckpointService.js'
import type { AnalysisService } from '../../domain/services/analysisService.js'
import type { AnalysisTaskScheduler } from '../../domain/services/analysisTaskScheduler.js'
import type { IncrementalAnalysisService } from '../../domain/services/incrementalAnalysis.js'
import type { ModelConfigService } from '../../domain/services/modelConfigService.js'
import type { ObservabilityService } from '../../domain/services/observabilityService.js'
import type { PreferenceService } from '../../domain/services/preferenceService.js'
import type { SourceService } from '../../domain/services/sourceService.js'
import type { AnalyzeResult, Source } from '../../domain/types.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { isMockMode } from '../../infrastructure/env.js'
import { analyzeRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/zodValidator.js'
import { analyzeSchema } from '../validation/schemas.js'

function getAnalysisService(): AnalysisService {
  return getService<AnalysisService>(Tokens.AnalysisService)
}

function getAnalysisCheckpointService(): AnalysisCheckpointService {
  return getService<AnalysisCheckpointService>(Tokens.AnalysisCheckpointService)
}

function getAnalysisTaskScheduler(): AnalysisTaskScheduler {
  return getService<AnalysisTaskScheduler>(Tokens.AnalysisTaskScheduler)
}

function getAnalysisCache(): AnalysisCache {
  return getService<AnalysisCache>(Tokens.AnalysisCache)
}

function getIncrementalAnalysisService(): IncrementalAnalysisService {
  return getService<IncrementalAnalysisService>(Tokens.IncrementalAnalysis)
}

function getModelConfigService(): ModelConfigService {
  return getService<ModelConfigService>(Tokens.ModelConfigService)
}

function getObservabilityService(): ObservabilityService {
  return getService<ObservabilityService>(Tokens.ObservabilityService)
}

function getPreferenceService(): PreferenceService {
  return getService<PreferenceService>(Tokens.PreferenceService)
}

function getSourceService(): SourceService {
  return getService<SourceService>(Tokens.SourceService)
}

const router = express.Router()

router.post('/analyze', analyzeRateLimiter, validateBody(analyzeSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const taskId = req.body.task_id as string | undefined
  let allSources: Source[]
  if (taskId) {
    allSources = await getSourceService().listSources(userId, sessionId, taskId)
  } else {
    allSources = await getSourceService().listSources(userId, sessionId)
  }
  const sourceIds = req.body.sourceIds || allSources.map((s) => s.id)
  const scenarioType = req.body.scenarioType || 'custom'
  const selectedSources = sourceIds
    .map((id: string) => allSources.find((s: Source) => s.id === id))
    .filter(Boolean)

  if (selectedSources.length === 0) {
    return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
  }

  const startTime = Date.now()
  let isMock = true
  let _status: 'success' | 'failed' = 'success'
  let _errorMsg: string | null = null

  try {
    const scenarioKnowledge = await getObservabilityService().getScenarioKnowledge(scenarioType, 10)
    // 优先从请求体获取 aiConfig，回退到数据库查询
    let aiConfig = req.body.aiConfig
    let defaultModelConfigApiKey: string | undefined
    if (!aiConfig) {
      const defaultModelConfig = await getModelConfigService().getDefaultModelConfig(
        userId,
        sessionId,
      )
      if (defaultModelConfig) {
        aiConfig = {
          apiKey: defaultModelConfig.apiKey,
          baseURL: defaultModelConfig.baseURL,
          model: defaultModelConfig.model,
          provider: defaultModelConfig.provider,
        }
        defaultModelConfigApiKey = defaultModelConfig.apiKey
      }
    }

    const isDemo = req.body.isDemo || false
    const result = await getAnalysisService().analyzeSources(
      selectedSources,
      scenarioType,
      scenarioKnowledge,
      {
        userId,
        sessionId,
        taskId: null,
        persist: true,
        aiConfig,
        isDemo,
      },
    )

    isMock = isMockMode(aiConfig?.apiKey || defaultModelConfigApiKey, isDemo)
    const durationMs = Date.now() - startTime

    const riskWeights = await getPreferenceService().getUserRiskWeights(userId, sessionId)

    res.json({
      code: 200,
      data: {
        ...result,
        meta: {
          durationMs,
          isMock,
          sourceCount: selectedSources.length,
        },
        preferences: {
          riskWeights,
        },
      },
    })
  } catch (e) {
    _status = 'failed'
    _errorMsg = (e as Error).message
    console.error('Analyze error:', e)
    res.status(500).json({ code: 500, msg: '分析失败' })
  }
})

const analyzeStreamHandler: express.RequestHandler = async (req, res) => {
  console.log('[Analyze Stream] 收到流式分析请求')
  try {
    const { userId, sessionId } = await getUserIdAndSessionId(req)
    console.log('[Analyze Stream] userId:', userId, 'sessionId:', sessionId?.substring(0, 20))

    const taskId = req.body.task_id as string | undefined
    let allSources: Source[]
    if (taskId) {
      allSources = await getSourceService().listSources(userId, sessionId, taskId)
    } else {
      allSources = await getSourceService().listSources(userId, sessionId)
    }
    console.log('[Analyze Stream] 所有材料数量:', allSources.length)

    const sourceIds = req.body.sourceIds || allSources.map((s) => s.id)
    const scenarioType = req.body.scenarioType || 'custom'
    console.log('[Analyze Stream] 请求的 sourceIds:', sourceIds, 'scenarioType:', scenarioType)

    const selectedSources = sourceIds
      .map((id: string) => allSources.find((s: Source) => s.id === id))
      .filter(Boolean)
    console.log('[Analyze Stream] 找到的材料数量:', selectedSources.length)

    if (selectedSources.length === 0) {
      console.log('[Analyze Stream] 没有材料，返回 400')
      return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    console.log('[Analyze Stream] SSE headers 已设置')

    let clientDisconnected = false
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null

    const sendEvent = (event: string, data: unknown) => {
      if (clientDisconnected || res.writableEnded) return
      console.log(`[Analyze Stream] 发送事件: ${event}`)
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    heartbeatInterval = setInterval(() => {
      if (!clientDisconnected && !res.writableEnded) {
        res.write(`event: ping\n`)
        res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`)
      }
    }, 15000)

    req.on('close', () => {
      clientDisconnected = true
      console.log('[Analyze Stream] 客户端断开连接')
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
    })

    const scenarioKnowledge = await getObservabilityService().getScenarioKnowledge(scenarioType, 10)
    console.log('[Analyze Stream] 场景知识数量:', scenarioKnowledge?.length || 0)

    // 优先从请求体获取 aiConfig，回退到数据库查询
    let aiConfig = req.body.aiConfig
    let defaultModelConfigApiKey: string | undefined
    if (!aiConfig) {
      const defaultModelConfig = await getModelConfigService().getDefaultModelConfig(
        userId,
        sessionId,
      )
      console.log(
        '[Analyze Stream] 默认模型配置(DB):',
        defaultModelConfig ? defaultModelConfig.provider : '无',
      )
      if (defaultModelConfig) {
        aiConfig = {
          apiKey: defaultModelConfig.apiKey,
          baseURL: defaultModelConfig.baseURL,
          model: defaultModelConfig.model,
          provider: defaultModelConfig.provider,
        }
        defaultModelConfigApiKey = defaultModelConfig.apiKey
      }
    } else {
      console.log('[Analyze Stream] 使用请求体 aiConfig, provider:', aiConfig.provider || '未指定')
    }

    const isDemo = req.body.isDemo || false
    console.log('[Analyze Stream] isDemo:', isDemo)

    const initialLog = await getAnalysisService().createAnalysisLogEntry({
      userId,
      sessionId,
      scenarioType,
      sourceCount: selectedSources.length,
    })
    const analysisLogId = initialLog.id
    console.log('[Analyze Stream] 创建分析日志成功, analysisLogId:', analysisLogId)

    sendEvent('init', { analysisLogId, sourceCount: selectedSources.length })
    console.log('[Analyze Stream] init 事件已发送')

    const isMock = isMockMode(aiConfig?.apiKey || defaultModelConfigApiKey, isDemo)
    console.log('[Analyze Stream] isMock:', isMock)

    const streamStartTime = Date.now()

    getAnalysisService()
      .analyzeWithStreaming(
        analysisLogId,
        selectedSources,
        scenarioType,
        scenarioKnowledge,
        {
          onStepStart: (step) => {
            console.log(`[Analyze Stream] 步骤开始: ${step.name}`)
            sendEvent('step_start', {
              stepId: step.id,
              stepName: step.name,
              stepIndex: step.index,
              analysisLogId,
            })
          },
          onStepComplete: (step) => {
            console.log(`[Analyze Stream] 步骤完成: ${step.name}`)
            sendEvent('step_complete', {
              stepId: step.id,
              stepName: step.name,
              stepIndex: step.index,
              partialResult: step.output?.data || null,
              analysisLogId,
            })
          },
          onStepError: (step) => {
            console.log(`[Analyze Stream] 步骤错误: ${step.name}`, step.error)
            sendEvent('step_error', {
              stepId: step.id,
              stepName: step.name,
              stepIndex: step.index,
              error: step.error,
              analysisLogId,
            })
          },
          onComplete: async (result) => {
            console.log('[Analyze Stream] 分析完成')
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval)
            }
            const riskWeights = await getPreferenceService().getUserRiskWeights(userId, sessionId)
            const streamDurationMs = Date.now() - streamStartTime
            const finalResult = {
              ...result,
              meta: {
                ...result.meta,
                durationMs: result.meta?.durationMs || streamDurationMs,
                isMock,
                sourceCount: selectedSources.length,
                sourceIds,
                analysisLogId,
              },
              preferences: {
                riskWeights,
              },
            }
            console.log('[Analyze Stream] complete 事件数据:', {
              hasSummary: !!finalResult.summary,
              riskCount: finalResult.risks?.length || 0,
              hasChecklist: !!finalResult.checklist,
              hasMeta: !!finalResult.meta,
              keys: Object.keys(finalResult),
            })
            sendEvent('complete', finalResult)
            if (!res.writableEnded) res.end()
            console.log('[Analyze Stream] 响应已结束')
          },
          onError: (error) => {
            console.error('[Analyze Stream] 分析错误:', error.message)
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval)
            }
            sendEvent('error', { message: error.message, analysisLogId })
            if (!res.writableEnded) res.end()
          },
        },
        aiConfig,
        isDemo,
        userId,
        sessionId,
      )
      .catch((error) => {
        console.error('[Analyze Stream] Promise catch 错误:', error)
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
        }
        if (!res.writableEnded) {
          sendEvent('error', { message: error.message, analysisLogId })
          res.end()
        }
      })

    console.log('[Analyze Stream] 分析已启动，等待结果...')
  } catch (e) {
    console.error('[Analyze Stream] 路由处理错误:', e)
    if (!res.writableEnded) {
      res.status(500).json({ code: 500, msg: '分析失败' })
    }
  }
}

router.post('/analyze/stream', analyzeStreamHandler)
router.post('/analyze/incremental/stream', analyzeStreamHandler)

router.post('/analyze/async', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const sourceTaskId = req.body.task_id as string | undefined
  let allSources: Source[]
  if (sourceTaskId) {
    allSources = await getSourceService().listSources(userId, sessionId, sourceTaskId)
  } else {
    allSources = await getSourceService().listSources(userId, sessionId)
  }
  const sourceIds = req.body.sourceIds || allSources.map((s) => s.id)
  const scenarioType = req.body.scenarioType || 'custom'
  const selectedSources = sourceIds
    .map((id: string) => allSources.find((s: Source) => s.id === id))
    .filter(Boolean)

  if (selectedSources.length === 0) {
    return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
  }

  const scenarioKnowledge = await getObservabilityService().getScenarioKnowledge(scenarioType, 10)

  const taskId = await getAnalysisTaskScheduler().createTask({
    sources: selectedSources,
    scenarioType,
    scenarioKnowledge,
    userId,
    sessionId,
    aiConfig: req.body.aiConfig,
    isDemo: req.body.isDemo,
  })

  res.json({
    code: 200,
    data: {
      taskId,
      status: 'queued',
    },
  })
})

router.get('/analyze/status/:taskId', async (req, res) => {
  const { taskId } = req.params

  const taskStatus = await getAnalysisTaskScheduler().getTaskStatus(taskId)

  if (!taskStatus) {
    return res.status(404).json({ code: 404, msg: '任务不存在或已过期' })
  }

  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const riskWeights = await getPreferenceService().getUserRiskWeights(userId, sessionId)

  let resultWithPreferences = taskStatus.result
  if (resultWithPreferences) {
    resultWithPreferences = {
      ...resultWithPreferences,
      preferences: {
        riskWeights,
      },
    }
  }

  res.json({
    code: 200,
    data: {
      ...taskStatus,
      result: resultWithPreferences,
    },
  })
})

router.post('/analyze/resume', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const { analysisLogId, sourceIds, aiConfig, task_id } = req.body

  if (!analysisLogId) {
    return res.status(400).json({ code: 400, msg: '缺少 analysisLogId' })
  }

  let allSources: Source[]
  if (task_id) {
    allSources = await getSourceService().listSources(userId, sessionId, task_id)
  } else {
    allSources = await getSourceService().listSources(userId, sessionId)
  }
  const sources = sourceIds
    ? sourceIds.map((id: string) => allSources.find((s: Source) => s.id === id)).filter(Boolean)
    : allSources

  if (sources.length === 0) {
    return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
  }

  try {
    const result = await getAnalysisCheckpointService().resumeAnalysisFromCheckpoint(
      analysisLogId,
      sources,
      {
        userId,
        sessionId,
        aiConfig,
      },
    )

    res.json({
      code: 200,
      data: {
        ...result,
        meta: {
          ...result.meta,
          resumedFrom: analysisLogId,
          sourceCount: sources.length,
        },
      },
    })
  } catch (e) {
    console.error('Resume analysis error:', e)
    res.status(500).json({ code: 500, msg: `恢复分析失败: ${(e as Error).message}` })
  }
})

router.post('/analyze/step/:index/retry', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const { index } = req.params
  const { analysisLogId, sourceIds, task_id } = req.body

  if (!analysisLogId) {
    return res.status(400).json({ code: 400, msg: '缺少 analysisLogId' })
  }

  const stepIndex = parseInt(index, 10)
  if (Number.isNaN(stepIndex) || stepIndex < 0) {
    return res.status(400).json({ code: 400, msg: '无效的步骤索引' })
  }

  let allSources: Source[]
  if (task_id) {
    allSources = await getSourceService().listSources(userId, sessionId, task_id)
  } else {
    allSources = await getSourceService().listSources(userId, sessionId)
  }
  const sources = sourceIds
    ? sourceIds.map((id: string) => allSources.find((s: Source) => s.id === id)).filter(Boolean)
    : allSources

  try {
    const result = await getAnalysisCheckpointService().retryAnalysisStep(
      analysisLogId,
      stepIndex,
      sources,
      {
        userId,
        sessionId,
      },
    )

    res.json({
      code: 200,
      data: {
        success: result.success,
        stepIndex,
        stepStatus: result.stepStatus,
        checkpoint: result.checkpoint,
      },
    })
  } catch (e) {
    console.error('Retry step error:', e)
    res.status(500).json({ code: 500, msg: `重试步骤失败: ${(e as Error).message}` })
  }
})

router.post('/analyze/step/:index/skip', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const { index } = req.params
  const { analysisLogId } = req.body

  if (!analysisLogId) {
    return res.status(400).json({ code: 400, msg: '缺少 analysisLogId' })
  }

  const stepIndex = parseInt(index, 10)
  if (Number.isNaN(stepIndex) || stepIndex < 0) {
    return res.status(400).json({ code: 400, msg: '无效的步骤索引' })
  }

  try {
    const result = await getAnalysisCheckpointService().skipAnalysisStep(analysisLogId, stepIndex, {
      userId,
      sessionId,
    })

    res.json({
      code: 200,
      data: {
        success: result.success,
        stepIndex,
        checkpoint: result.checkpoint,
      },
    })
  } catch (e) {
    console.error('Skip step error:', e)
    res.status(500).json({ code: 500, msg: `跳过步骤失败: ${(e as Error).message}` })
  }
})

router.get('/analyze/checkpoint/:analysisLogId', async (req, res) => {
  const { analysisLogId } = req.params

  try {
    const checkpoint = await getAnalysisCheckpointService().getAnalysisCheckpoint(analysisLogId)
    if (!checkpoint) {
      return res.status(404).json({ code: 404, msg: 'Checkpoint 不存在' })
    }

    res.json({
      code: 200,
      data: checkpoint,
    })
  } catch (e) {
    console.error('Get checkpoint error:', e)
    res.status(500).json({ code: 500, msg: `获取 checkpoint 失败: ${(e as Error).message}` })
  }
})

router.post('/analyze/incremental', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const { existingResult, newSourceIds, scenarioType, analysisLogId, isDemo, task_id, aiConfig } =
    req.body

  if (!existingResult || !newSourceIds || newSourceIds.length === 0) {
    return res.status(400).json({ code: 400, msg: '缺少已有结果或新材料ID' })
  }

  let allSources: Source[]
  if (task_id) {
    allSources = await getSourceService().listSources(userId, sessionId, task_id)
  } else {
    allSources = await getSourceService().listSources(userId, sessionId)
  }

  const existingSourceIds = existingResult.meta?.sourceIds || []
  const existingSources = existingSourceIds
    .map((id: string) => allSources.find((s: Source) => s.id === id))
    .filter(Boolean)

  const newSources = newSourceIds
    .map((id: string) => allSources.find((s: Source) => s.id === id))
    .filter(Boolean)

  if (newSources.length === 0) {
    return res.status(400).json({ code: 400, msg: '新材料不存在' })
  }

  const scenario = scenarioType || existingResult.scenario?.type || 'custom'
  const startTime = Date.now()

  try {
    const scenarioKnowledge = await getObservabilityService().getScenarioKnowledge(scenario, 10)

    const diffResult = await getIncrementalAnalysisService().performDiffBasedIncrementalAnalysis(
      existingResult as AnalyzeResult,
      existingSources,
      [...existingSources, ...newSources],
      scenario,
      scenarioKnowledge,
      {
        userId,
        sessionId,
        analysisLogId: analysisLogId || null,
        isDemo,
        aiConfig,
      },
    )

    const durationMs = Date.now() - startTime
    const isMock = isMockMode(undefined, isDemo)

    const riskWeights = await getPreferenceService().getUserRiskWeights(userId, sessionId)

    res.json({
      code: 200,
      data: {
        ...diffResult.result,
        meta: {
          ...diffResult.result.meta,
          durationMs,
          isMock,
          isIncremental: !diffResult.isFullRecompute,
          isFullRecompute: diffResult.isFullRecompute,
          affectedSteps: diffResult.affectedSteps,
          recomputedSteps: diffResult.recomputedSteps,
          reusedSteps: diffResult.reusedSteps,
          change: {
            added: diffResult.change.addedSources.map((s: Source) => s.id),
            removed: diffResult.change.removedSources.map((s: Source) => s.id),
            modified: diffResult.change.modifiedSources.map((s: Source) => s.id),
          },
        },
        preferences: {
          riskWeights,
        },
      },
    })
  } catch (e) {
    console.error('Incremental analyze error:', e)
    res.status(500).json({ code: 500, msg: `增量分析失败: ${(e as Error).message}` })
  }
})

router.post('/draft', async (req, res) => {
  const { risk, context } = req.body
  if (!risk) {
    return res.status(400).json({ code: 400, msg: '缺少风险点信息' })
  }
  try {
    const { userId, sessionId } = await getUserIdAndSessionId(req)
    const draftStyle = await getPreferenceService().getUserDraftStyle(userId, sessionId)
    const stylePref = {
      formality: draftStyle.formality,
      friendliness: draftStyle.friendliness,
      conciseness: draftStyle.conciseness,
      preferredTone: draftStyle.preferredTone,
    }
    const draft = await getAnalysisService().generateDraft(risk, context || '', stylePref)
    res.json({ code: 200, data: { draft } })
  } catch (e) {
    console.error('Draft error:', e)
    res.status(500).json({ code: 500, msg: '生成失败' })
  }
})

// 分析缓存统计与控制（热门场景预计算可观测性）
router.get('/analysis/cache/stats', (_req, res) => {
  res.json({ code: 200, data: getAnalysisCache().getAnalysisCacheStats() })
})

router.delete('/analysis/cache', (_req, res) => {
  getAnalysisCache().clearAnalysisCache()
  console.log('[Cache] 已手动清空分析缓存')
  res.json({ code: 200, msg: '缓存已清空' })
})

// 手动触发预热（运维用）
router.post('/analysis/cache/preheat', async (_req, res) => {
  try {
    const result = await getAnalysisService().preheatScenarioPresets()
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('Preheat trigger error:', e)
    res.status(500).json({ code: 500, msg: '预热失败' })
  }
})

export default router
