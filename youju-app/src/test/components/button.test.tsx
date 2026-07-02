import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/ui/button'

describe('Button', () => {
  it('应该渲染按钮内容', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByText('点击我')).toBeInTheDocument()
  })

  it('点击按钮应该触发 onClick', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>点击</Button>)
    fireEvent.click(screen.getByText('点击'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled 状态下点击不触发 onClick', () => {
    const handleClick = vi.fn()
    render(
      <Button onClick={handleClick} disabled>
        禁用
      </Button>,
    )
    fireEvent.click(screen.getByText('禁用'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('默认 variant 为 default', () => {
    const { container } = render(<Button>默认</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('bg-primary')
  })

  it('variant=outline 应该应用 outline 样式', () => {
    const { container } = render(<Button variant="outline">Outline</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('border-border')
  })

  it('variant=secondary 应该应用 secondary 样式', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('bg-secondary')
  })

  it('variant=ghost 应该应用 ghost 样式', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).not.toHaveClass('bg-primary')
  })

  it('variant=destructive 应该应用 destructive 样式', () => {
    const { container } = render(<Button variant="destructive">Destructive</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('text-destructive')
  })

  it('variant=link 应该应用 link 样式', () => {
    const { container } = render(<Button variant="link">Link</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('text-primary')
  })

  it('默认 size 为 default', () => {
    const { container } = render(<Button>默认尺寸</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('h-8')
  })

  it('size=xs 应该应用超小尺寸', () => {
    const { container } = render(<Button size="xs">XS</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('h-6')
  })

  it('size=sm 应该应用小尺寸', () => {
    const { container } = render(<Button size="sm">SM</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('h-7')
  })

  it('size=lg 应该应用大尺寸', () => {
    const { container } = render(<Button size="lg">LG</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('h-9')
  })

  it('size=icon 应该应用图标尺寸', () => {
    const { container } = render(<Button size="icon">Icon</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('size-8')
  })

  it('应该支持自定义 className', () => {
    const { container } = render(<Button className="custom-class">自定义</Button>)
    const button = container.firstChild as HTMLElement
    expect(button).toHaveClass('custom-class')
  })

  it('应该传递额外的 props', () => {
    render(
      <Button data-testid="test-btn" aria-label="测试按钮">
        按钮
      </Button>,
    )
    const button = screen.getByTestId('test-btn')
    expect(button).toHaveAttribute('aria-label', '测试按钮')
  })
})
