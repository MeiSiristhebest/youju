import { HttpResponse, http } from 'msw'
import {
  calculateStepDurations,
  generateNonLinearProgress,
  generateTokenStats,
  perturbResult,
  seededRandom,
} from '@/algorithms/analysisSimulator'
import { incrementalEngine } from '@/algorithms/incrementalEngine'
import type { AnalyzeResult, Source } from '@/types'
import { getScenarioResult, getScenarioSources, mockDB } from '../db'

const ANALYSIS_STEPS = [
  { key: 'scenario', name: '场景识别', desc: '理解材料内容，识别场景类型' },
  { key: 'parsing', name: '解析材料', desc: '提取每份材料的关键信息' },
  { key: 'dimensions', name: '维度发现', desc: '自动发现需要比对的重要维度' },
  { key: 'extraction', name: '跨源提取', desc: '从各材料中提取对应维度的值' },
  { key: 'detection', name: '差异检测', desc: '比对冲突、承诺、缺失信息' },
  { key: 'validation', name: '证据校验', desc: '验证每个结论的证据链' },
  { key: 'output', name: '生成报告', desc: '整理分析结果和检查清单' },
]

function encodeSSE(event: string, data: string | object): string {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data)
  return `event: ${event}\ndata: ${dataStr}\n\n`
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function* streamAnalysisEvents(
  sources: Source[],
  scenarioId: string,
  isIncremental: boolean,
  previousResult?: AnalyzeResult,
): AsyncGenerator<string> {
  const startTime = Date.now()
  const seed = startTime + Math.floor(Math.random() * 1000000)

  const totalChars = sources.reduce((sum, s) => sum + (s.content?.length || 0), 0)
  const baseResult = getScenarioResult(scenarioId)

  if (!baseResult) {
    yield encodeSSE('error', { message: `Unknown scenario: ${scenarioId}` })
    return
  }

  const riskCount = baseResult.risks?.length || 5
  const newSourceCount = isIncremental
    ? sources.length - (previousResult?.meta?.sourceCount || 0)
    : 0

  const stepDurations = calculateStepDurations({
    seed,
    sourceCount: sources.length,
    totalChars,
    riskCount,
    isIncremental,
    incrementalNewSourceCount: newSourceCount,
  })

  const totalSteps = ANALYSIS_STEPS.length

  yield encodeSSE('init', {
    analysisId: `ana_${startTime.toString(36)}`,
    totalSteps,
    totalSources: sources.length,
    scenario: scenarioId,
    isIncremental,
  })

  const rand = seededRandom(seed)
  const failStepIndex = rand() < 0.15 ? Math.floor(rand() * 3) + 2 : -1

  for (let i = 0; i < totalSteps; i++) {
    const step = ANALYSIS_STEPS[i]

    yield encodeSSE('step_start', {
      stepIndex: i,
      stepId: step.key,
      stepName: step.name,
      stepDesc: step.desc,
    })

    const progressPoints = generateNonLinearProgress(stepDurations[i], i, seed)

    if (i === failStepIndex) {
      const failPoint = progressPoints[Math.floor(progressPoints.length * 0.6)]
      await delay(failPoint.delay)
      yield encodeSSE('step_error', {
        stepIndex: i,
        stepId: step.key,
        stepName: step.name,
        error: '处理超时，请重试或跳过此步骤',
        recoverable: true,
      })
      return
    }

    for (const point of progressPoints) {
      await delay(point.delay)
      const stepProgress = point.progress / 100
      const overallProgress = (i + stepProgress) / totalSteps

      yield encodeSSE('progress', {
        stepIndex: i,
        stepProgress: point.progress,
        overallProgress: Math.round(overallProgress * 1000) / 10,
        message: step.desc,
      })
    }

    if (i === 2 && baseResult.dimensions) {
      yield encodeSSE('partial_dimensions', {
        dimensions: baseResult.dimensions.slice(0, 3),
      })
    }

    if (i === 4 && baseResult.risks) {
      const partialRisks = baseResult.risks.slice(0, Math.ceil(riskCount * 0.4))
      yield encodeSSE('partial_risks', {
        risks: partialRisks,
        detectedCount: partialRisks.length,
        totalEstimated: riskCount,
      })
    }

    yield encodeSSE('step_complete', {
      stepIndex: i,
      stepId: step.key,
      stepName: step.name,
      durationMs: stepDurations[i],
    })
  }

  let finalResult = perturbResult(baseResult, seed)
  const tokenStats = generateTokenStats(sources, riskCount, seed)

  if (finalResult.debugInfo) {
    finalResult.debugInfo = {
      ...finalResult.debugInfo,
      model: tokenStats.model,
      tokenPrompt: tokenStats.promptTokens,
      tokenCompletion: tokenStats.completionTokens,
      tokenTotal: tokenStats.totalTokens,
      estimatedCost: tokenStats.estimatedCost,
    }
  }

  if (isIncremental && previousResult) {
    const mergedResult = incrementalEngine.mergeResults(previousResult, finalResult)
    const changes = incrementalEngine.compareRisks(previousResult, finalResult)
    const oldSources = getScenarioSources(scenarioId)
    const prediction = incrementalEngine.predictChanges(oldSources, sources, previousResult)
    const accuracy = incrementalEngine.calculatePredictionAccuracy(prediction, changes)

    finalResult = {
      ...mergedResult,
      meta: {
        ...mergedResult.meta,
        durationMs: Date.now() - startTime,
        sourceCount: sources.length,
        model: tokenStats.model,
        isMock: false,
        analysisId: `ana_${startTime.toString(36)}`,
      },
      incrementalMeta: {
        ...mergedResult.incrementalMeta,
        durationMs: Date.now() - startTime,
        previousSourceCount: previousResult.meta?.sourceCount || 0,
        newSourceCount: sources.length,
        prediction: {
          estimatedNewRiskCount: prediction.estimatedNewRiskCount,
          estimatedUpdatedRiskCount: prediction.estimatedUpdatedRiskCount,
          estimatedAffectedDimensions: prediction.estimatedAffectedDimensions,
          accuracy,
        },
      },
    }
  } else {
    finalResult = {
      ...finalResult,
      meta: {
        ...finalResult.meta,
        durationMs: Date.now() - startTime,
        sourceCount: sources.length,
        isIncremental: false,
        model: tokenStats.model,
        isMock: false,
        analysisId: `ana_${startTime.toString(36)}`,
        sourceIds: sources.map((s) => s.id),
      },
    }
  }

  yield encodeSSE('complete', finalResult)
}

export const analysisHandlers = [
  http.post('/api/analyze/stream', async ({ request }) => {
    const body = (await request.json()) as {
      sourceIds: string[]
      scenarioType: string
    }

    const sources = body.sourceIds
      .map((id) => mockDB.getSourceById(id))
      .filter((s): s is Source => !!s)

    if (sources.length === 0) {
      return HttpResponse.json({ error: 'No sources found' }, { status: 400 })
    }

    const scenarioId = body.scenarioType || 'job_offer'
    const stream = streamAnalysisEvents(sources, scenarioId, false)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            controller.enqueue(encoder.encode(event))
          }
        } catch (e) {
          console.error('[Mock] Stream error:', e)
        } finally {
          controller.close()
        }
      },
    })

    return new HttpResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }),

  http.post('/api/analyze/incremental/stream', async ({ request }) => {
    const body = (await request.json()) as {
      sourceIds: string[]
      scenarioType: string
      existingResultId?: string
    }

    const sources = body.sourceIds
      .map((id) => mockDB.getSourceById(id))
      .filter((s): s is Source => !!s)

    if (sources.length === 0) {
      return HttpResponse.json({ error: 'No sources found' }, { status: 400 })
    }

    const scenarioId = body.scenarioType || 'job_offer'
    const previousResult = body.existingResultId
      ? mockDB.getResult(body.existingResultId)
      : undefined

    const stream = streamAnalysisEvents(sources, scenarioId, true, previousResult)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            controller.enqueue(encoder.encode(event))
          }
        } catch (e) {
          console.error('[Mock] Incremental stream error:', e)
        } finally {
          controller.close()
        }
      },
    })

    return new HttpResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }),
]
