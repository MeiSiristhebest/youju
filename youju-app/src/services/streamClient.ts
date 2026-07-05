import { useApiLogsStore } from '../stores'
import { parseSseBuffer, type SseEvent } from '../utils/sseParser'
import { authStorage } from './apiClient'

const DEFAULT_TIMEOUT = 120000
const DEFAULT_RETRIES = 2
const RETRY_DELAY = 1000

const isDev = import.meta.env.DEV

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const buildUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  if (path.startsWith('/api')) {
    return `${API_BASE_URL}${path.slice('/api'.length)}`
  }
  return path
}

const isRetriableError = (error: unknown, response?: Response): boolean => {
  if (response) {
    return response.status >= 500 || response.status === 429
  }
  return (
    error instanceof TypeError ||
    (error as Error).message?.includes('fetch') ||
    (error as Error).message?.includes('network')
  )
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const logRequest = (url: string, options: RequestInit) => {
  if (!isDev) return
  const method = options.method || 'GET'
  const body = options.body instanceof FormData ? '[FormData]' : options.body
  console.log(`[Stream Request] ${method} ${url}`, { headers: options.headers, body })
}

const logResponse = (url: string, status: number, duration: number) => {
  if (!isDev) return
  console.log(`[Stream Response] ${url} ${status} (${duration}ms)`)
}

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

export interface StreamFetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  onEvent?: (event: SseEvent) => void
  onOpen?: (response: Response) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
  timeout?: number
  retries?: number
}

export async function streamFetch(url: string, options: StreamFetchOptions = {}): Promise<void> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    onEvent,
    onOpen,
    onError,
    signal: externalSignal,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
  } = options

  const finalUrl = buildUrl(url)
  const startTime = Date.now()

  let requestBody: unknown
  if (body && !(body instanceof FormData)) {
    try {
      requestBody = typeof body === 'string' ? JSON.parse(body) : body
    } catch {
      requestBody = body
    }
  }

  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY * 2 ** (attempt - 1))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const abortSignal = externalSignal ?? controller.signal

    if (externalSignal) {
      const onAbort = () => controller.abort()
      externalSignal.addEventListener('abort', onAbort)
      controller.signal.addEventListener('abort', () => {
        externalSignal.removeEventListener('abort', onAbort)
      })
    }

    try {
      const headers = new Headers(customHeaders)

      const token = authStorage.getToken()
      const sessionId = authStorage.getSessionId()

      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      } else if (sessionId) {
        headers.set('X-Session-Id', sessionId)
      }

      if (!headers.has('Content-Type') && !(body instanceof FormData) && body) {
        headers.set('Content-Type', 'application/json')
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: abortSignal,
      }

      if (body) {
        fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body)
      }

      logRequest(finalUrl, fetchOptions)

      const response = await fetch(finalUrl, fetchOptions)
      clearTimeout(timeoutId)

      const duration = Date.now() - startTime
      logResponse(url, response.status, duration)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.msg || `Stream request failed: ${response.status}`

        recordApiLog(method, url, response.status, duration, requestBody, errorData, errorMessage)

        if (!isRetriableError(null, response) || attempt >= retries) {
          const error = new Error(errorMessage)
          onError?.(error)
          throw error
        }

        continue
      }

      onOpen?.(response)

      const reader = response.body?.getReader()
      if (!reader) {
        const error = new Error('No response body')
        onError?.(error)
        throw error
      }

      const decoder = new TextDecoder()
      let pendingBuffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          pendingBuffer += decoder.decode(value, { stream: true })
          const { events, remaining } = parseSseBuffer(pendingBuffer)
          pendingBuffer = remaining

          for (const event of events) {
            onEvent?.(event)
          }
        }

        recordApiLog(method, url, response.status, duration, requestBody, undefined)
        return
      } finally {
        reader.releaseLock()
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      lastError = error

      if (error instanceof Error && error.name === 'AbortError') {
        const duration = Date.now() - startTime
        recordApiLog(
          method,
          url,
          408,
          duration,
          requestBody,
          undefined,
          externalSignal?.aborted ? '请求已取消' : '请求超时',
        )
        const abortError = new Error(externalSignal?.aborted ? '请求已取消' : '请求超时')
        onError?.(abortError)
        throw abortError
      }

      if (!isRetriableError(error) || attempt >= retries) {
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : '网络错误'
        recordApiLog(method, url, -1, duration, requestBody, undefined, errorMessage)
        const networkError = new Error(errorMessage)
        onError?.(networkError)
        throw networkError
      }

      if (isDev) {
        console.warn(
          `[Stream Retry] ${attempt + 1}/${retries}:`,
          error instanceof Error ? error.message : String(error),
        )
      }
    }
  }

  throw lastError || new Error('Stream request failed')
}
