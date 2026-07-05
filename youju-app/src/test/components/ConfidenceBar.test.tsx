import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfidenceBar } from '../../components/ui/ConfidenceBar'

describe('ConfidenceBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该渲染置信度条组件且符合 ARIA progressbar 规范', () => {
    render(<ConfidenceBar confidence={75} animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toBeInTheDocument()
    expect(progressbar).toHaveAttribute('aria-valuenow', '75')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('应该显示高置信度标签（>= 80%）', () => {
    render(<ConfidenceBar confidence={90} animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '90')
    expect(screen.getByText('高')).toBeInTheDocument()
  })

  it('应该显示中置信度标签（50% - 79%）', () => {
    render(<ConfidenceBar confidence={60} animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '60')
    expect(screen.getByText('中')).toBeInTheDocument()
  })

  it('应该显示低置信度标签（< 50%）', () => {
    render(<ConfidenceBar confidence={30} animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '30')
    expect(screen.getByText('低')).toBeInTheDocument()
  })

  it('置信度小于 0 时显示 0%', () => {
    render(<ConfidenceBar confidence={-10} animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('置信度大于 100 时显示 100%', () => {
    render(<ConfidenceBar confidence={150} animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('showLabel=false 时不显示标签', () => {
    render(<ConfidenceBar confidence={75} showLabel={false} animated={false} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
    expect(screen.queryByText('中')).not.toBeInTheDocument()
  })

  it('size=sm 时应该包含小尺寸对应的 class 类名', () => {
    render(<ConfidenceBar confidence={75} size="sm" animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar.className).toContain('w-20')
  })

  it('size=lg 时应该包含大尺寸对应的 class 类名', () => {
    render(<ConfidenceBar confidence={75} size="lg" animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar.className).toContain('w-32')
  })

  it('默认 size=md 时应该包含中等尺寸对应的 class 类名', () => {
    render(<ConfidenceBar confidence={75} animated={false} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar.className).toContain('w-28')
  })

  it('animated=true 时应该有动画过渡', () => {
    render(<ConfidenceBar confidence={75} animated={true} />)
    const progressbar = screen.getByRole('progressbar')
    // 初始应为 0
    expect(progressbar).toHaveAttribute('aria-valuenow', '0')
    act(() => {
      vi.advanceTimersByTime(100)
    })
    // 动画运行后变为 75
    expect(progressbar).toHaveAttribute('aria-valuenow', '75')
  })
})
