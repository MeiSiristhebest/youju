export interface SSEEvent {
  event: string
  data: string
}

export interface SSEResult {
  events: SSEEvent[]
  remaining: string
}

/**
 * 从缓冲区解析完整的 SSE 事件块。
 */
export function parseSSEEvents(buffer: string): SSEResult {
  const events: SSEEvent[] = []
  let current = buffer

  while (true) {
    const eventEndIndex = current.indexOf('\n\n')
    if (eventEndIndex === -1) break

    const eventBlock = current.substring(0, eventEndIndex)
    current = current.substring(eventEndIndex + 2)

    let eventName = 'message'
    const dataLines: string[] = []

    for (const line of eventBlock.split('\n')) {
      if (line.startsWith('event: ')) {
        eventName = line.substring(7).trim()
      } else if (line.startsWith('data: ')) {
        dataLines.push(line.substring(6))
      }
    }

    if (dataLines.length > 0) {
      const data = dataLines.join('\n')
      if (eventName === 'complete') {
        console.log('[SSE Parser] Complete event received, data length:', data.length)
      }
      events.push({ event: eventName, data })
    }
  }

  return { events, remaining: current }
}

/** @deprecated Use parseSSEEvents instead */
export const parseSseBuffer = parseSSEEvents

/** @deprecated Use SSEEvent instead */
export type SseEvent = SSEEvent

/**
 * 安全解析 JSON，失败时返回 null。
 */
export function safeParseJson<T = unknown>(data: string): T | null {
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

/**
 * 从 Response 的 reader 中读取并解析所有 SSE 事件。
 * 支持 AbortSignal 中断。
 */
export async function readSSEStream(
  response: Response,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel()
        break
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { events, remaining } = parseSSEEvents(buffer)
      buffer = remaining
      for (const event of events) {
        onEvent(event)
      }
    }
  } finally {
    reader.releaseLock()
  }
}
