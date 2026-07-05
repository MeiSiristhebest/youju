import { describe, expect, it } from 'vitest'
import { parseSSEEvents } from '../../lib/sseParser'

describe('parseSSEEvents', () => {
  it('完整事件应被正确解析', () => {
    const buffer = 'event: token\ndata: {"token":"hello"}\n\n'
    const { events, remaining } = parseSSEEvents(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      event: 'token',
      data: '{"token":"hello"}',
    })
    expect(remaining).toBe('')
  })

  it('多个完整事件应返回多个事件', () => {
    const buffer = 'event: token\ndata: {"token":"a"}\n\nevent: token\ndata: {"token":"b"}\n\n'
    const { events, remaining } = parseSSEEvents(buffer)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ event: 'token', data: '{"token":"a"}' })
    expect(events[1]).toEqual({ event: 'token', data: '{"token":"b"}' })
    expect(remaining).toBe('')
  })

  it('不完整事件应返回空事件列表和原样 remaining', () => {
    const buffer = 'event: token\ndata: {"tok'
    const { events, remaining } = parseSSEEvents(buffer)
    expect(events).toHaveLength(0)
    expect(remaining).toBe(buffer)
  })

  it('无 data 行的事件应被忽略', () => {
    const buffer = 'event: ping\n\n'
    const { events, remaining } = parseSSEEvents(buffer)
    expect(events).toHaveLength(0)
    expect(remaining).toBe('')
  })

  it('多行 data 应拼接为以 \\n 分隔的字符串', () => {
    const buffer = 'event: complete\ndata: line1\ndata: line2\n\n'
    const { events, remaining } = parseSSEEvents(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      event: 'complete',
      data: 'line1\nline2',
    })
    expect(remaining).toBe('')
  })

  it('混合完整事件与不完整片段应只返回完整事件', () => {
    const buffer = 'event: token\ndata: {"token":"ok"}\n\nevent: complete\ndata: {"partial":'
    const { events, remaining } = parseSSEEvents(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ event: 'token', data: '{"token":"ok"}' })
    expect(remaining).toBe('event: complete\ndata: {"partial":')
  })

  it('空字符串应返回空结果', () => {
    const { events, remaining } = parseSSEEvents('')
    expect(events).toHaveLength(0)
    expect(remaining).toBe('')
  })

  it('未指定 event 名时应使用默认 message', () => {
    const buffer = 'data: hello\n\n'
    const { events } = parseSSEEvents(buffer)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ event: 'message', data: 'hello' })
  })
})
