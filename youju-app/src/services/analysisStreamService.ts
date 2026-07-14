import { parseSseBuffer, safeParseJson } from '../lib/sseParser'
import { storage, storageKeys } from '../lib/storage'
import { useApiLogsStore } from '../stores'
import { useModelConfigStore } from '../stores/useModelConfigStore'
import type { AnalyzeResult } from '../types'

const MAX_RETRY_COUNT = 3
const TIMEOUT_MS = 120000

const recordApiLog = (
  method: string,
  url: string,
  statusCode: number,
  durationMs: number,
  requestBody?: unknown,
  responseBody?: unknown,
  error?: string,
) => {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url
    useApiLogsStore.getState().addLog({
      method: method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      path,
      statusCode,
      durationMs,
      requestBody,
      responseBody,
      error,
    })
  } catch {
    // ignore log errors
  }
}

export interface StreamStepCallbacks {
  onStepStart?: (stepId: string, stepName: string, stepIndex: number) => void
  onStepComplete?: (
    stepId: string,
    stepName: string,
    stepIndex: number,
    partialResult: unknown,
  ) => void
  onProgress?: (progress: number, message?: string) => void
}

export interface StreamConfig {
  url: string
  body: Record<string, unknown>
  headers?: Record<string, string>
  abortController: AbortController
  totalSteps: number
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = storage.getItem(storageKeys.token)
  const sessionId = storage.getItem(storageKeys.sessionId)
  if (token) headers.Authorization = `Bearer ${token}`
  else if (sessionId) headers['X-Session-Id'] = sessionId
  return headers
}

function calculateProgress(stepIndex: number, stepProgress: number, totalSteps: number): number {
  return ((stepIndex + stepProgress / 100) / totalSteps) * 100
}

async function createStreamRequest(config: StreamConfig): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  }

  const response = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(config.body),
    signal: config.abortController.signal,
  })

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.status} ${response.statusText}`)
  }

  return response
}

async function processStreamResponse(
  response: Response,
  callbacks: StreamStepCallbacks & {
    onComplete?: (result: AnalyzeResult) => void
  },
  config: { totalSteps: number; abortController: AbortController; isIncremental?: boolean },
): Promise<AnalyzeResult | null> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let pendingBuffer = ''
  let finalResult: AnalyzeResult | null = null
  let lastProgress = 0
  let totalSteps = config.totalSteps

  let timeoutTimer: ReturnType<typeof setTimeout> | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (timeoutTimer) {
        clearTimeout(timeoutTimer)
        timeoutTimer = setTimeout(() => {
          config.abortController.abort(new Error('Stream timeout'))
        }, TIMEOUT_MS)
      }

      pendingBuffer += decoder.decode(value, { stream: true })
      const { events, remaining } = parseSseBuffer(pendingBuffer)
      pendingBuffer = remaining

      for (const { event, data } of events) {
        const parsed = safeParseJson<Record<string, unknown>>(data)
        if (!parsed) {
          if (event === 'error') throw new Error('Failed to parse error data')
          continue
        }

        switch (event) {
          case 'init':
            totalSteps = (parsed.totalSteps as number) || totalSteps
            break

          case 'step_start': {
            const stepIndex = parsed.stepIndex as number
            const stepId = parsed.stepId as string
            const stepName = parsed.stepName as string
            const progress = calculateProgress(stepIndex, 0, totalSteps)
            lastProgress = progress
            callbacks.onStepStart?.(stepId, stepName, stepIndex)
            callbacks.onProgress?.(progress, `正在${stepName}...`)
            break
          }

          case 'step_progress': {
            const stepIndex = parsed.stepIndex as number
            const stepProgress = (parsed.progress as number) || 0
            const message = parsed.message as string | undefined
            const progress = calculateProgress(stepIndex, stepProgress, totalSteps)
            lastProgress = Math.max(lastProgress, progress)
            callbacks.onProgress?.(lastProgress, message)
            break
          }

          case 'step_complete': {
            const stepIndex = parsed.stepIndex as number
            const stepId = parsed.stepId as string
            const stepName = parsed.stepName as string
            const partialResult = parsed.partialResult
            const progress = calculateProgress(stepIndex + 1, 0, totalSteps)
            lastProgress = progress
            callbacks.onStepComplete?.(stepId, stepName, stepIndex, partialResult)
            callbacks.onProgress?.(progress, `${stepName}完成`)
            break
          }

          case 'complete':
            finalResult = parsed as unknown as AnalyzeResult
            callbacks.onProgress?.(100, '分析完成')
            callbacks.onComplete?.(finalResult)
            break

          case 'error': {
            const errorMsg = (parsed.message as string) || 'Analysis failed'
            throw new Error(errorMsg)
          }

          default:
            break
        }
      }
    }

    return finalResult
  } finally {
    if (timeoutTimer) clearTimeout(timeoutTimer)
    reader.releaseLock()
  }
}

export async function streamAnalyze(
  params: {
    sourceIds: string[]
    scenarioType: string | null
    isIncremental?: boolean
    existingResult?: AnalyzeResult | null
    newSourceIds?: string[]
  } & StreamStepCallbacks,
): Promise<AnalyzeResult> {
  const {
    sourceIds,
    scenarioType,
    isIncremental = false,
    existingResult,
    newSourceIds,
    ...callbacks
  } = params

  const url = isIncremental ? '/api/analyze/incremental/stream' : '/api/analyze/stream'
  const headers = getAuthHeaders()

  const aiConfig = useModelConfigStore.getState().getAIConfig()
  const body: Record<string, unknown> = { sourceIds, scenarioType }
  if (aiConfig) body.aiConfig = aiConfig
  if (isIncremental && existingResult?.meta?.sourceIds) {
    body.existingResult = existingResult
    body.newSourceIds =
      newSourceIds ||
      sourceIds.filter((id) => !(existingResult.meta?.sourceIds as string[]).includes(id))
  }

  const abortController = new AbortController()
  let retryCount = 0
  const startTime = Date.now()

  while (retryCount < MAX_RETRY_COUNT) {
    const attemptStartTime = Date.now()
    try {
      const response = await createStreamRequest({
        url,
        body,
        headers,
        abortController,
        totalSteps: 7,
      })

      const finalResult = await processStreamResponse(response, callbacks, {
        totalSteps: 7,
        abortController,
        isIncremental,
      })

      if (finalResult) {
        const duration = Date.now() - startTime
        recordApiLog('POST', url, response.status, duration, body, finalResult)
        return finalResult
      }

      throw new Error('Stream ended without final result')
    } catch (error) {
      const err = error as Error
      const duration = Date.now() - attemptStartTime

      if (err.name === 'AbortError') {
        recordApiLog('POST', url, 408, duration, body, undefined, '请求已取消')
        throw new Error('分析已取消')
      }

      retryCount++
      if (retryCount >= MAX_RETRY_COUNT) {
        recordApiLog('POST', url, -1, duration, body, undefined, err.message)
        throw err
      }

      const delay = 2 ** retryCount * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error('Analysis failed after maximum retries')
}
