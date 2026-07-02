import type { KeyboardEvent } from 'react'
import { useCallback, useState } from 'react'

// 键盘导航支持的方向
export type NavigationOrientation = 'vertical' | 'horizontal'

interface UseKeyboardNavigationOptions<T> {
  // 列表数据，用于计算长度和取值
  items: T[]
  // 初始选中索引，默认 -1 表示无选中
  defaultIndex?: number
  // 方向：vertical 上下箭头，horizontal 左右箭头，默认 vertical
  orientation?: NavigationOrientation
  // 选中变化时的回调
  onSelect?: (index: number, item: T) => void
  // 激活（Enter/Space）时的回调
  onActivate?: (index: number, item: T) => void
}

interface UseKeyboardNavigationReturn<_T> {
  // 当前激活的索引
  activeIndex: number
  // 设置激活索引
  setActiveIndex: (index: number) => void
  // 绑定到列表容器元素的 keydown 处理函数
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

/**
 * 列表键盘导航 hook。
 *
 * 提供以下能力：
 * 1. 上/下箭头（vertical）或 左/右箭头（horizontal）切换选中项
 * 2. Enter / Space 激活当前项
 * 3. Home / End 跳到首尾
 * 4. 可配置 onSelect / onActivate 回调
 *
 * 用法：
 *   const { activeIndex, handleKeyDown } = useKeyboardNavigation({
 *     items: risks,
 *     onSelect: (i) => setSelected(risks[i]),
 *     onActivate: (i) => openDetail(risks[i]),
 *   })
 *   return <ul onKeyDown={handleKeyDown}>...</ul>
 */
export function useKeyboardNavigation<T>(
  options: UseKeyboardNavigationOptions<T>,
): UseKeyboardNavigationReturn<T> {
  const { items, defaultIndex = -1, orientation = 'vertical', onSelect, onActivate } = options
  const [activeIndex, setActiveIndexState] = useState<number>(defaultIndex)

  const setActiveIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(-1, Math.min(index, items.length - 1))
      setActiveIndexState(clamped)
      if (clamped >= 0 && onSelect) {
        onSelect(clamped, items[clamped])
      }
    },
    [items, onSelect],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (items.length === 0) return

      const isVertical = orientation === 'vertical'
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight'
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft'

      switch (event.key) {
        case nextKey: {
          event.preventDefault()
          const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0
          setActiveIndex(next)
          break
        }
        case prevKey: {
          event.preventDefault()
          const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1
          setActiveIndex(prev)
          break
        }
        case 'Home': {
          event.preventDefault()
          setActiveIndex(0)
          break
        }
        case 'End': {
          event.preventDefault()
          setActiveIndex(items.length - 1)
          break
        }
        case 'Enter':
        case ' ': {
          if (activeIndex >= 0) {
            event.preventDefault()
            if (onActivate) onActivate(activeIndex, items[activeIndex])
          }
          break
        }
        default:
          break
      }
    },
    [activeIndex, items, onActivate, orientation, setActiveIndex],
  )

  return { activeIndex, setActiveIndex, handleKeyDown }
}
