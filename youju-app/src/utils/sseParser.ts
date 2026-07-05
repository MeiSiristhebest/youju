export interface SseEvent {
  event: string
  data: string
}

export function parseSseBuffer(buffer: string): {
  events: SseEvent[]
  remaining: string
} {
  const events: SseEvent[] = []
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
      events.push({ event: eventName, data: dataLines.join('\n') })
    }
  }

  return { events, remaining: current }
}

export function safeParseJson<T = unknown>(data: string): T | null {
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}
