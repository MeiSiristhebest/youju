import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string
  hideCloseButton?: boolean
  // 是否允许通过点击背景遮罩关闭，默认为 true（保持向后兼容）
  closeOnOverlayClick?: boolean
  // 是否允许通过 Escape 键关闭，默认为 true
  closeOnEscape?: boolean
  // 可访问性标题文本，无障碍阅读器会读出该标题
  // 如果未提供且 ModalHeader 被渲染，aria-labelledby 会指向标题元素
  ariaLabel?: string
}

// Modal 与 ModalHeader 之间共享标题 id 的上下文
interface ModalTitleContextValue {
  // 由 Modal 生成的 id，用于 aria-labelledby 指向
  titleId: string
  // ModalHeader 挂载时通知 Modal 已有标题元素，返回注销函数
  registerTitle: () => () => void
}

const ModalTitleContext = createContext<ModalTitleContextValue | null>(null)

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  hideCloseButton = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
}: ModalProps) {
  // 生成唯一 id，供 aria-labelledby 指向 ModalHeader 的标题
  const titleId = useId()
  // 是否已经有 ModalHeader 渲染过标题，决定是否输出 aria-labelledby
  const [hasTitle, setHasTitle] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // ModalHeader 注册/注销自身，确保只在有标题时才输出 aria-labelledby
  const registerTitle = useCallback(() => {
    setHasTitle(true)
    return () => setHasTitle(false)
  }, [])

  // 启用焦点陷阱：Tab 循环、Escape 关闭、首元素聚焦、关闭还原焦点
  useFocusTrap(containerRef, {
    active: isOpen,
    onClose,
    closeOnEscape,
  })

  if (!isOpen) return null

  // 优先级：ariaLabel > aria-labelledby（仅在 ModalHeader 已渲染时输出）
  const labelledBy = ariaLabel ? undefined : hasTitle ? titleId : undefined

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        // 仅当点击的是遮罩自身（而非冒泡上来的子元素）时才关闭
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose()
      }}
    >
      <ModalTitleContext.Provider value={{ titleId, registerTitle }}>
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className={`relative bg-paper border border-rule rounded-2xl w-full ${maxWidth} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col outline-none`}
        >
          {children}
          {!hideCloseButton && (
            <button
              type="button"
              className="absolute top-4 right-4 w-8 h-8 bg-transparent border-none text-ink-faint text-xl cursor-pointer rounded-lg grid place-items-center hover:bg-paper-dark hover:text-ink"
              onClick={onClose}
              aria-label="关闭"
            >
              ×
            </button>
          )}
        </div>
      </ModalTitleContext.Provider>
    </div>
  )
}

interface ModalHeaderProps {
  title: string
  onClose?: () => void
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  // 通过 Context 拿到 Modal 生成的 titleId，让 aria-labelledby 正确指向标题
  const ctx = useContext(ModalTitleContext)
  const titleId = ctx?.titleId
  const registerTitle = ctx?.registerTitle

  // 挂载时通知 Modal 已有标题元素，卸载时取消注册
  useEffect(() => {
    if (!registerTitle) return
    const cleanup = registerTitle()
    return cleanup
  }, [registerTitle])

  return (
    <div className="px-6 py-4 border-b border-rule flex justify-between items-center shrink-0">
      <h3 id={titleId} className="text-base font-semibold text-ink font-display">
        {title}
      </h3>
      {onClose && (
        <button
          type="button"
          className="w-8 h-8 bg-transparent border-none text-ink-faint text-xl cursor-pointer rounded-lg grid place-items-center hover:bg-paper-dark hover:text-ink"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>
      )}
    </div>
  )
}

interface ModalBodyProps {
  children: ReactNode
}

export function ModalBody({ children }: ModalBodyProps) {
  return <div className="p-6 overflow-y-auto flex-1">{children}</div>
}

interface ModalFooterProps {
  children: ReactNode
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div className="px-6 py-4 border-t border-rule flex justify-end gap-3 shrink-0">{children}</div>
  )
}
