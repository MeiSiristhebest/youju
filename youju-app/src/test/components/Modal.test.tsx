import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../components/ui/Modal'

describe('Modal', () => {
  it('isOpen=false 时不渲染', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={false} onClose={onClose}>
        内容
      </Modal>,
    )
    expect(screen.queryByText('内容')).not.toBeInTheDocument()
  })

  it('isOpen=true 时渲染内容', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        模态框内容
      </Modal>,
    )
    expect(screen.getByText('模态框内容')).toBeInTheDocument()
  })

  it('点击关闭按钮应该触发 onClose', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        内容
      </Modal>,
    )
    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hideCloseButton=true 时不显示关闭按钮', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} hideCloseButton={true}>
        内容
      </Modal>,
    )
    expect(screen.queryByText('×')).not.toBeInTheDocument()
  })

  it('点击遮罩层（外部）应该触发 onClose', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        内容
      </Modal>,
    )
    const overlay = document.querySelector('.fixed.inset-0')
    fireEvent.click(overlay!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('点击内容区域不触发 onClose', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div data-testid="content">内容</div>
      </Modal>,
    )
    const content = screen.getByTestId('content')
    fireEvent.click(content)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('应该支持自定义 maxWidth', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} maxWidth="max-w-xl">
        内容
      </Modal>,
    )
    const modalContent = container.querySelector('.max-w-xl')
    expect(modalContent).toBeInTheDocument()
  })
})

describe('ModalHeader', () => {
  it('应该渲染标题', () => {
    render(<ModalHeader title="测试标题" />)
    expect(screen.getByText('测试标题')).toBeInTheDocument()
  })

  it('提供 onClose 时显示关闭按钮', () => {
    const onClose = vi.fn()
    render(<ModalHeader title="测试标题" onClose={onClose} />)
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('不提供 onClose 时不显示关闭按钮', () => {
    render(<ModalHeader title="测试标题" />)
    expect(screen.queryByText('×')).not.toBeInTheDocument()
  })

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<ModalHeader title="测试标题" onClose={onClose} />)
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ModalBody', () => {
  it('应该渲染子内容', () => {
    render(<ModalBody>主体内容</ModalBody>)
    expect(screen.getByText('主体内容')).toBeInTheDocument()
  })
})

describe('ModalFooter', () => {
  it('应该渲染子内容', () => {
    render(<ModalFooter>底部内容</ModalFooter>)
    expect(screen.getByText('底部内容')).toBeInTheDocument()
  })
})
