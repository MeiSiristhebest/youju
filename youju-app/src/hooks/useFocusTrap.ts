import type { RefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'

// 可聚焦元素的 CSS 选择器
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
]
  .map((selector) => `${selector}:not([hidden]):not([aria-hidden="true"])`)
  .join(',')

interface UseFocusTrapOptions {
  // 是否激活焦点陷阱（通常对应 Modal 的 isOpen 状态）
  active: boolean
  // 关闭回调（用于 Escape 键触发关闭）
  onClose?: () => void
  // 是否在按下 Escape 时关闭，默认为 true
  closeOnEscape?: boolean
}

/**
 * 焦点陷阱 hook，用于 Modal 组件的可访问性增强。
 *
 * 主要能力：
 * 1. 当 Modal 打开时，Tab/Shift+Tab 焦点循环限制在容器内，不会离开 Modal
 * 2. 支持 Escape 键关闭 Modal
 * 3. 打开时自动聚焦到容器内第一个可聚焦元素
 * 4. 关闭时把焦点还原到打开前的触发元素
 *
 * 用法：
 *   const ref = useRef<HTMLDivElement>(null)
 *   useFocusTrap({ ref, active: isOpen, onClose: handleClose })
 *   return <div ref={ref}>...</div>
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  options: UseFocusTrapOptions,
) {
  const { active, onClose, closeOnEscape = true } = options
  // 记录打开前焦点所在的元素，关闭后归还焦点
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // 获取容器内所有可聚焦元素
  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = ref.current
    if (!container) return []
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
      // 进一步过滤掉不可见元素
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
    })
  }, [ref])

  // 打开时记录原焦点、聚焦到首个可聚焦元素；关闭时还原焦点
  useEffect(() => {
    if (!active) return

    // 记录触发元素
    previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null

    // 聚焦到第一个可聚焦元素，延迟一帧以确保 Modal 已挂载
    const rafId = requestAnimationFrame(() => {
      const focusables = getFocusableElements()
      if (focusables.length > 0) {
        focusables[0].focus()
      } else {
        // 没有可聚焦元素时，给容器自身聚焦（容器需要 tabIndex=-1）
        const container = ref.current
        if (container) {
          container.focus()
        }
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      // 关闭时还原焦点到触发元素
      const prev = previouslyFocusedRef.current
      if (prev && typeof prev.focus === 'function') {
        prev.focus()
      }
      previouslyFocusedRef.current = null
    }
  }, [active, getFocusableElements, ref])

  // 监听键盘事件：Tab 循环 & Escape 关闭
  useEffect(() => {
    if (!active) return
    const container = ref.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape 关闭
      if (closeOnEscape && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (onClose) onClose()
        return
      }

      // Tab 循环焦点
      if (event.key === 'Tab') {
        const focusables = getFocusableElements()
        if (focusables.length === 0) {
          // 没有可聚焦元素时，阻止默认 Tab 行为，避免焦点逃逸
          event.preventDefault()
          return
        }

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const activeElement = document.activeElement as HTMLElement | null

        if (event.shiftKey) {
          // Shift + Tab：从第一个跳到最后一个
          if (activeElement === first || !container.contains(activeElement)) {
            event.preventDefault()
            last.focus()
          }
        } else {
          // Tab：从最后一个跳到第一个
          if (activeElement === last || !container.contains(activeElement)) {
            event.preventDefault()
            first.focus()
          }
        }
      }
    }

    // 使用捕获阶段监听，避免被内部 stopPropagation 拦截
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [active, closeOnEscape, getFocusableElements, onClose, ref])
}
