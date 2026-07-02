import express from 'express'
import { clearAnalysisCache, getAnalysisCacheStats } from '../../domain/services/analysisCache.js'
import * as analysisService from '../../domain/services/analysisService.js'
import * as analysisTaskManager from '../../domain/services/analysisTaskManager.js'
import * as observabilityService from '../../domain/services/observabilityService.js'
import * as preferenceService from '../../domain/services/preferenceService.js'
import * as sourceService from '../../domain/services/sourceService.js'
import type { AnalyzeResult, Source } from '../../domain/types.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { analyzeRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/zodValidator.js'
import { analyzeSchema } from '../validation/schemas.js'

const router = express.Router()

router.post('/analyze', analyzeRateLimiter, validateBody(analyzeSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const allSources = await sourceService.listSources(userId, sessionId)
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
    const scenarioKnowledge = await observabilityService.getScenarioKnowledge(scenarioType, 10)
    const result = await analysisService.analyzeSources(
      selectedSources,
      scenarioType,
      scenarioKnowledge,
      {
        userId,
        sessionId,
        taskId: null,
        persist: true,
      },
    )

    isMock = !process.env.AI_API_KEY
    const durationMs = Date.now() - startTime

    const riskWeights = await preferenceService.getUserRiskWeights(userId, sessionId)
    const sortedRisks = preferenceService.sortRisksByPreference(result.risks, riskWeights)

    res.json({
      code: 200,
      data: {
        ...result,
        risks: sortedRisks,
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

router.post('/analyze/stream', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const allSources = await sourceService.listSources(userId, sessionId)
  const sourceIds = req.body.sourceIds || allSources.map((s) => s.id)
  const scenarioType = req.body.scenarioType || 'custom'
  const selectedSources = sourceIds
    .map((id: string) => allSources.find((s: Source) => s.id === id))
    .filter(Boolean)

  if (selectedSources.length === 0) {
    return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  const scenarioKnowledge = await observabilityService.getScenarioKnowledge(scenarioType, 10)

  const initialLog = await analysisService.createAnalysisLogEntry({
    userId,
    sessionId,
    scenarioType,
    sourceCount: selectedSources.length,
  })
  const analysisLogId = initialLog.id

  sendEvent('init', { analysisLogId, sourceCount: selectedSources.length })

  analysisService
    .analyzeSourcesStreamWithLog(analysisLogId, selectedSources, scenarioType, scenarioKnowledge, {
      onStepStart: (step) => {
        sendEvent('step_start', {
          stepId: step.id,
          stepName: step.name,
          stepIndex: step.index,
          analysisLogId,
        })
      },
      onStepComplete: (step) => {
        sendEvent('step_complete', {
          stepId: step.id,
          stepName: step.name,
          stepIndex: step.index,
          partialResult: step.output?.data || null,
          analysisLogId,
        })
      },
      onComplete: async (result) => {
        const riskWeights = await preferenceService.getUserRiskWeights(userId, sessionId)
        const sortedRisks = preferenceService.sortRisksByPreference(result.risks, riskWeights)
        const finalResult = {
          ...result,
          risks: sortedRisks,
          meta: {
            ...result.meta,
            isMock: !process.env.AI_API_KEY,
            sourceCount: selectedSources.length,
            sourceIds,
            analysisLogId,
          },
          preferences: {
            riskWeights,
          },
        }
        sendEvent('complete', finalResult)
        res.end()
      },
      onError: (error) => {
        sendEvent('error', { message: error.message, analysisLogId })
        res.end()
      },
    })
    .catch((error) => {
      if (!res.writableEnded) {
        sendEvent('error', { message: error.message, analysisLogId })
        res.end()
      }
    })
})

router.post('/analyze/async', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const allSources = await sourceService.listSources(userId, sessionId)
  const sourceIds = req.body.sourceIds || allSources.map((s) => s.id)
  const scenarioType = req.body.scenarioType || 'custom'
  const selectedSources = sourceIds
    .map((id: string) => allSources.find((s: Source) => s.id === id))
    .filter(Boolean)

  if (selectedSources.length === 0) {
    return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
  }

  const scenarioKnowledge = await observabilityService.getScenarioKnowledge(scenarioType, 10)

  const taskId = await analysisTaskManager.createTask({
    sources: selectedSources,
    scenarioType,
    scenarioKnowledge,
    userId,
    sessionId,
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

  const taskStatus = await analysisTaskManager.getTaskStatus(taskId)

  if (!taskStatus) {
    return res.status(404).json({ code: 404, msg: '任务不存在或已过期' })
  }

  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const riskWeights = await preferenceService.getUserRiskWeights(userId, sessionId)

  let resultWithPreferences = taskStatus.result
  if (resultWithPreferences) {
    const sortedRisks = preferenceService.sortRisksByPreference(
      resultWithPreferences.risks,
      riskWeights,
    )
    resultWithPreferences = {
      ...resultWithPreferences,
      risks: sortedRisks,
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
  const { analysisLogId, sourceIds } = req.body

  if (!analysisLogId) {
    return res.status(400).json({ code: 400, msg: '缺少 analysisLogId' })
  }

  const allSources = await sourceService.listSources(userId, sessionId)
  const sources = sourceIds
    ? sourceIds.map((id: string) => allSources.find((s: Source) => s.id === id)).filter(Boolean)
    : allSources

  if (sources.length === 0) {
    return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
  }

  try {
    const result = await analysisService.resumeAnalysisFromCheckpoint(analysisLogId, sources, {
      userId,
      sessionId,
    })

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
  const { analysisLogId, sourceIds } = req.body

  if (!analysisLogId) {
    return res.status(400).json({ code: 400, msg: '缺少 analysisLogId' })
  }

  const stepIndex = parseInt(index, 10)
  if (Number.isNaN(stepIndex) || stepIndex < 0) {
    return res.status(400).json({ code: 400, msg: '无效的步骤索引' })
  }

  const allSources = await sourceService.listSources(userId, sessionId)
  const sources = sourceIds
    ? sourceIds.map((id: string) => allSources.find((s: Source) => s.id === id)).filter(Boolean)
    : allSources

  try {
    const result = await analysisService.retryAnalysisStep(analysisLogId, stepIndex, sources, {
      userId,
      sessionId,
    })

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
    const result = await analysisService.skipAnalysisStep(analysisLogId, stepIndex, {
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
    const checkpoint = await analysisService.getAnalysisCheckpoint(analysisLogId)
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
  const { existingResult, newSourceIds, scenarioType, analysisLogId } = req.body

  if (!existingResult || !newSourceIds || newSourceIds.length === 0) {
    return res.status(400).json({ code: 400, msg: '缺少已有结果或新材料ID' })
  }

  const allSources = await sourceService.listSources(userId, sessionId)

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
    const scenarioKnowledge = await observabilityService.getScenarioKnowledge(scenario, 10)

    const diffResult = await analysisService.performDiffBasedIncrementalAnalysis(
      existingResult as AnalyzeResult,
      existingSources,
      [...existingSources, ...newSources],
      scenario,
      scenarioKnowledge,
      {
        userId,
        sessionId,
        analysisLogId: analysisLogId || null,
      },
    )

    const durationMs = Date.now() - startTime
    const isMock = !process.env.AI_API_KEY

    const riskWeights = await preferenceService.getUserRiskWeights(userId, sessionId)
    const sortedRisks = preferenceService.sortRisksByPreference(
      diffResult.result.risks,
      riskWeights,
    )

    res.json({
      code: 200,
      data: {
        ...diffResult.result,
        risks: sortedRisks,
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
    const draftStyle = await preferenceService.getUserDraftStyle(userId, sessionId)
    const stylePref = {
      formality: draftStyle.formality,
      friendliness: draftStyle.friendliness,
      conciseness: draftStyle.conciseness,
      preferredTone: draftStyle.preferredTone,
    }
    const draft = await analysisService.generateDraft(risk, context || '', stylePref)
    res.json({ code: 200, data: { draft } })
  } catch (e) {
    console.error('Draft error:', e)
    res.status(500).json({ code: 500, msg: '生成失败' })
  }
})

// 分析缓存统计与控制（热门场景预计算可观测性）
router.get('/analysis/cache/stats', (_req, res) => {
  res.json({ code: 200, data: getAnalysisCacheStats() })
})

router.delete('/analysis/cache', (_req, res) => {
  clearAnalysisCache()
  console.log('[Cache] 已手动清空分析缓存')
  res.json({ code: 200, msg: '缓存已清空' })
})

// 手动触发预热（运维用）
router.post('/analysis/cache/preheat', async (_req, res) => {
  try {
    const result = await analysisService.preheatScenarioPresets()
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('Preheat trigger error:', e)
    res.status(500).json({ code: 500, msg: '预热失败' })
  }
})

export default router
