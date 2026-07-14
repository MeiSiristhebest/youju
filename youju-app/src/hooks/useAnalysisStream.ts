import { STREAM_TIMEOUT } from '../config/runtime'
import { isDemoScenario, runDemoAnalysisStream } from '../services/demoAnalysisStream'
import { streamFetch } from '../services/streamClient'
import { useModelConfigStore } from '../stores/useModelConfigStore'
import { useSourceStore } from '../stores/useSourceStore'
import type { AnalyzeResult, Source } from '../types'

const MAX_RETRY_COUNT = 3

const ANALYSIS_STEPS = [
  { key: 'scenario', name: '场景识别', desc: '理解材料内容，识别场景类型' },
  { key: 'parsing', name: '解析材料', desc: '提取每份材料的关键信息' },
  { key: 'dimensions', name: '维度发现', desc: '自动发现需要比对的重要维度' },
  { key: 'extraction', name: '跨源提取', desc: '从各材料中提取对应维度的值' },
  { key: 'detection', name: '差异检测', desc: '比对冲突、承诺、缺失信息' },
  { key: 'validation', name: '证据校验', desc: '验证每个结论的证据链' },
  { key: 'output', name: '生成报告', desc: '整理分析结果和检查清单' },
]

export interface StreamCallbacks {
  onStepStart?: (stepId: string, stepName: string, stepIndex: number) => void
  onStepComplete?: (
    stepId: string,
    stepName: string,
    stepIndex: number,
    partialResult: unknown,
  ) => void
  onStepError?: (stepId: string, stepName: string, stepIndex: number, error: string) => void
  onProgress?: (progress: number, message?: string) => void
}

export async function runDemoAnalysis(
  sources: Source[],
  scenarioType: string,
  callbacks: StreamCallbacks,
  options: {
    abortController: AbortController
    isIncremental: boolean
    previousResult?: AnalyzeResult | null
    setStreaming: (streaming: boolean) => void
  },
): Promise<AnalyzeResult> {
  const { abortController, isIncremental, previousResult, setStreaming } = options
  const { onStepStart, onStepComplete, onProgress } = callbacks

  setStreaming(true)

  const result = await runDemoAnalysisStream(
    sources,
    scenarioType,
    {
      onStepStart: (data) => {
        onStepStart?.(data.stepId, data.stepName, data.stepIndex)
      },
      onStepComplete: (data) => {
        onStepComplete?.(data.stepId, data.stepName, data.stepIndex, (data as any).partialResult)
      },
      onProgress: (progress, message) => {
        onProgress?.(progress, message)
      },
    },
    {
      isIncremental,
      previousResult,
      abortSignal: abortController.signal,
    },
  )

  setStreaming(false)
  return result
}

export async function streamAnalyze(
  params: StreamCallbacks & {
    sourceIds: string[]
    scenarioType: string | null
    abortController?: AbortController
    isIncremental?: boolean
    existingResult?: AnalyzeResult | null
    setStreaming: (streaming: boolean) => void
    setStreamError: (error: string | null) => void
    setResult: (result: AnalyzeResult) => void
  },
): Promise<AnalyzeResult> {
  const {
    sourceIds,
    scenarioType,
    onStepStart,
    onStepComplete,
    onStepError,
    onProgress,
    abortController = new AbortController(),
    isIncremental = false,
    existingResult,
    setStreaming,
    setStreamError,
    setResult,
  } = params

  const url = isIncremental ? '/api/analyze/incremental/stream' : '/api/analyze/stream'

  let lastProgress = 0
  let totalSteps = ANALYSIS_STEPS.length
  let finalResult: AnalyzeResult | null = null
  let streamError: Error | null = null

  const log = (
    level: 'info' | 'warn' | 'error',
    message: string,
    details?: Record<string, any>,
  ) => {
    const prefix = isIncremental ? '[Incremental Stream]' : '[Analyze Stream]'
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    logFn(`${prefix} ${message}`, details || '')
  }

  const aiConfig = useModelConfigStore.getState().getAIConfig()
  const isDemo = sourceIds.every((id) => id.startsWith('demo_'))
  const currentTaskId = useSourceStore.getState().currentTaskId
  const body: Record<string, any> = { sourceIds, scenarioType, aiConfig, isDemo }
  if (currentTaskId) {
    body.task_id = currentTaskId
  }
  if (isIncremental && existingResult?.meta?.sourceIds) {
    body.existingResult = existingResult
    const existingIds = existingResult.meta.sourceIds as string[]
    body.newSourceIds = sourceIds.filter((id) => !existingIds.includes(id))
  }

  log('info', `Creating request to ${url}`, {
    bodySize: JSON.stringify(body).length,
    hasAiConfig: !!aiConfig,
    isDemo,
  })

  setStreaming(true)
  setStreamError(null)

  try {
    await streamFetch(url, {
      method: 'POST',
      body,
      signal: abortController.signal,
      timeout: STREAM_TIMEOUT,
      retries: MAX_RETRY_COUNT - 1,
      onEvent: (event) => {
        try {
          const parsed = JSON.parse(event.data)
          switch (event.event) {
            case 'init':
              totalSteps = parsed.totalSteps || ANALYSIS_STEPS.length
              log('info', 'Stream initialized', {
                totalSteps,
              })
              break

            case 'step_start': {
              log('info', 'Step started', {
                stepId: parsed.stepId,
                stepName: parsed.stepName,
                stepIndex: parsed.stepIndex,
              })
              onStepStart?.(parsed.stepId, parsed.stepName, parsed.stepIndex)
              const stepStartProgress = (parsed.stepIndex / totalSteps) * 100
              lastProgress = stepStartProgress
              onProgress?.(stepStartProgress, `正在${parsed.stepName}...`)
              break
            }

            case 'step_progress': {
              const stepProgress = ((parsed.stepIndex + parsed.progress / 100) / totalSteps) * 100
              lastProgress = Math.max(lastProgress, stepProgress)
              onProgress?.(lastProgress, parsed.message)
              break
            }

            case 'step_complete': {
              log('info', 'Step completed', {
                stepId: parsed.stepId,
                stepName: parsed.stepName,
                stepIndex: parsed.stepIndex,
              })
              onStepComplete?.(
                parsed.stepId,
                parsed.stepName,
                parsed.stepIndex,
                parsed.partialResult,
              )
              const stepCompleteProgress = ((parsed.stepIndex + 1) / totalSteps) * 100
              lastProgress = stepCompleteProgress
              onProgress?.(stepCompleteProgress, `${parsed.stepName}完成`)
              break
            }

            case 'step_error': {
              log('error', 'Step error', {
                stepId: parsed.stepId,
                stepName: parsed.stepName,
                stepIndex: parsed.stepIndex,
                error: parsed.error,
              })
              onStepError?.(parsed.stepId, parsed.stepName, parsed.stepIndex, parsed.error)
              break
            }

            case 'complete':
              log('info', 'Analysis complete event received', {
                hasSummary: !!parsed.summary,
                riskCount: parsed.risks?.length || 0,
                hasChecklist: !!parsed.checklist,
                hasMeta: !!parsed.meta,
                rawKeys: parsed ? Object.keys(parsed) : [],
              })
              finalResult = parsed as unknown as AnalyzeResult
              log('info', 'Analysis complete')
              onProgress?.(100, '分析完成')
              break

            case 'error': {
              const errorMsg = parsed.message || 'Analysis failed'
              log('error', 'Analysis error', {
                code: parsed.code,
                message: errorMsg,
              })
              streamError = new Error(errorMsg)
              break
            }

            default:
              log('warn', 'Unknown event type', { event: event.event })
          }
        } catch (e) {
          if (event.event === 'error') {
            streamError = e as Error
          }
          log('warn', 'Failed to parse event data', {
            event: event.event,
            error: (e as Error).message,
          })
        }
      },
      onError: (error) => {
        streamError = error
      },
    })

    if (streamError) {
      throw streamError
    }

    if (finalResult) {
      log('info', 'Analysis successful')
      setResult(finalResult)
      setStreaming(false)
      return finalResult
    }

    throw new Error('Stream ended without final result')
  } catch (error) {
    const err = error as Error
    log('error', `Stream error: ${err.message}`)

    if (err.message === '请求已取消' || err.name === 'AbortError') {
      log('info', 'Stream aborted')
      setStreaming(false)
      throw new Error('分析已取消')
    }

    setStreamError(err.message)
    setStreaming(false)
    throw err
  } finally {
    setStreaming(false)
  }
}

export { ANALYSIS_STEPS, isDemoScenario }
