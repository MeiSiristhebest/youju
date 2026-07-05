import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TypewriterText } from '../../components/workspace/results/TypewriterText'

describe('TypewriterText', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该渲染打字机动效组件，且初始状态下没有完全显示文本', () => {
    render(<TypewriterText text="Hello World" delay={50} />)
    // 初始应该显示打字机的第一个字符或为空（取决于时间片）
    expect(screen.queryByText('Hello World')).not.toBeInTheDocument()
  })

  it('随着时间流逝，文字应该逐步展现', () => {
    render(<TypewriterText text="Hi" delay={100} />)

    act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(screen.getByText('H')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText('Hi')).toBeInTheDocument()
  })
})
