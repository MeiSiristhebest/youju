import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnimateIn } from '../../components/ui/AnimateIn'

class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  options: IntersectionObserverInit

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options || {}
  }

  observe(element: Element) {
    const entry = {
      isIntersecting: true,
      target: element,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRatio: 1,
      intersectionRect: element.getBoundingClientRect(),
      rootBounds: null,
      time: 0,
    } as IntersectionObserverEntry
    this.callback([entry], this)
  }

  unobserve() {}

  disconnect() {}

  takeRecords() {
    return []
  }
}

describe('AnimateIn', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  it('应该正确渲染子元素', () => {
    render(<AnimateIn>测试内容</AnimateIn>)
    expect(screen.getByText('测试内容')).toBeInTheDocument()
  })

  it('应该默认渲染为 div', () => {
    const { container } = render(<AnimateIn>内容</AnimateIn>)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('应该支持自定义 as 属性', () => {
    const { container } = render(<AnimateIn as="span">内容</AnimateIn>)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })

  it('应该应用自定义 className', () => {
    const { container } = render(<AnimateIn className="custom-class">内容</AnimateIn>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('进入视口后不透明度应为 1', () => {
    const { container } = render(<AnimateIn>内容</AnimateIn>)
    const element = container.firstChild as HTMLElement
    expect(element.style.opacity).toBe('1')
  })

  it('进入视口后 transform 应为 translateY(0)', () => {
    const { container } = render(<AnimateIn>内容</AnimateIn>)
    const element = container.firstChild as HTMLElement
    expect(element.style.transform).toBe('translateY(0)')
  })

  it('应该有过渡效果样式', () => {
    const { container } = render(<AnimateIn>内容</AnimateIn>)
    const element = container.firstChild as HTMLElement
    expect(element.style.transition).toContain('opacity')
    expect(element.style.transition).toContain('transform')
  })

  it('应该支持自定义 delay', () => {
    const { container } = render(<AnimateIn delay={0.5}>内容</AnimateIn>)
    const element = container.firstChild as HTMLElement
    expect(element.style.transition).toContain('0.5s')
  })

  it('应该支持自定义 duration', () => {
    const { container } = render(<AnimateIn duration={1.5}>内容</AnimateIn>)
    const element = container.firstChild as HTMLElement
    expect(element.style.transition).toContain('1.5s')
  })
})
