import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Tag } from '../../components/ui/Tag'

describe('Tag', () => {
  it('应该渲染标签内容', () => {
    render(<Tag>测试标签</Tag>)
    expect(screen.getByText('测试标签')).toBeInTheDocument()
  })

  it('默认 variant 为 default', () => {
    const { container } = render(<Tag>默认</Tag>)
    const tag = container.firstChild as HTMLElement
    expect(tag).toHaveClass('border-rule')
    expect(tag).toHaveClass('text-ink-muted')
  })

  it('variant=accent 应该应用 accent 样式', () => {
    const { container } = render(<Tag variant="accent">Accent</Tag>)
    const tag = container.firstChild as HTMLElement
    expect(tag).toHaveClass('border-accent')
    expect(tag).toHaveClass('text-accent')
  })

  it('variant=success 应该应用 success 样式', () => {
    const { container } = render(<Tag variant="success">Success</Tag>)
    const tag = container.firstChild as HTMLElement
    expect(tag).toHaveClass('text-success')
  })

  it('variant=warning 应该应用 warning 样式', () => {
    const { container } = render(<Tag variant="warning">Warning</Tag>)
    const tag = container.firstChild as HTMLElement
    expect(tag).toHaveClass('text-warning')
  })

  it('variant=danger 应该应用 danger 样式', () => {
    const { container } = render(<Tag variant="danger">Danger</Tag>)
    const tag = container.firstChild as HTMLElement
    expect(tag).toHaveClass('text-danger')
  })

  it('应该支持自定义 className', () => {
    const { container } = render(<Tag className="custom-tag">自定义</Tag>)
    const tag = container.firstChild as HTMLElement
    expect(tag).toHaveClass('custom-tag')
  })

  it('应该渲染为 span 元素', () => {
    const { container } = render(<Tag>标签</Tag>)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })

  it('应该包含基础样式类', () => {
    const { container } = render(<Tag>标签</Tag>)
    const tag = container.firstChild as HTMLElement
    expect(tag).toHaveClass('inline-flex')
    expect(tag).toHaveClass('items-center')
    expect(tag).toHaveClass('font-mono')
    expect(tag).toHaveClass('uppercase')
    expect(tag).toHaveClass('border')
  })
})
