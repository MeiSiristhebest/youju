import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfidenceBar } from '../../components/ui/ConfidenceBar'

describe('ConfidenceBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该渲染置信度条组件', () => {
    render(<ConfidenceBar confidence={75} animated={false} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('应该显示高置信度标签（>= 80%）', () => {
    render(<ConfidenceBar confidence={90} animated={false} />)
    expect(screen.getByText('高')).toBeInTheDocument()
  })

  it('应该显示中置信度标签（50% - 79%）', () => {
    render(<ConfidenceBar confidence={60} animated={false} />)
    expect(screen.getByText('中')).toBeInTheDocument()
  })

  it('应该显示低置信度标签（< 50%）', () => {
    render(<ConfidenceBar confidence={30} animated={false} />)
    expect(screen.getByText('低')).toBeInTheDocument()
  })

  it('置信度小于 0 时显示 0%', () => {
    render(<ConfidenceBar confidence={-10} animated={false} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('置信度大于 100 时显示 100%', () => {
    render(<ConfidenceBar confidence={150} animated={false} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('showLabel=false 时不显示标签', () => {
    render(<ConfidenceBar confidence={75} showLabel={false} animated={false} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
    expect(screen.queryByText('中')).not.toBeInTheDocument()
  })

  it('size=sm 时应该使用小尺寸', () => {
    const { container } = render(<ConfidenceBar confidence={75} size="sm" animated={false} />)
    const bar = container.querySelector('.w-16')
    expect(bar).toBeInTheDocument()
  })

  it('size=lg 时应该使用大尺寸', () => {
    const { container } = render(<ConfidenceBar confidence={75} size="lg" animated={false} />)
    const bar = container.querySelector('.w-32')
    expect(bar).toBeInTheDocument()
  })

  it('默认 size=md 时应该使用中等尺寸', () => {
    const { container } = render(<ConfidenceBar confidence={75} animated={false} />)
    const bar = container.querySelector('.w-24')
    expect(bar).toBeInTheDocument()
  })

  it('animated=true 时应该有动画效果', () => {
    render(<ConfidenceBar confidence={75} animated={true} />)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('置信度在 0 到 100 之间时显示进度点', () => {
    const { container } = render(<ConfidenceBar confidence={50} animated={false} />)
    const dot = container.querySelector('.animate-pulse')
    expect(dot).toBeInTheDocument()
  })

  it('置信度为 0 时不显示进度点', () => {
    const { container } = render(<ConfidenceBar confidence={0} animated={false} />)
    const dot = container.querySelector('.animate-pulse')
    expect(dot).not.toBeInTheDocument()
  })

  it('置信度为 100 时不显示进度点', () => {
    const { container } = render(<ConfidenceBar confidence={100} animated={false} />)
    const dot = container.querySelector('.animate-pulse')
    expect(dot).not.toBeInTheDocument()
  })
})
