import { useCallback, useRef } from 'react'
import { useToast } from '../components/common/Toast'

interface UseUndoableActionOptions<T> {
  action: (item: T) => void | Promise<void>
  undo: (item: T) => void | Promise<void>
  message: string
  undoLabel?: string
  duration?: number
}

interface UseUndoableActionResult<T> {
  execute: (item: T) => void
  dismiss: () => void
}

export function useUndoableAction<T>(
  options: UseUndoableActionOptions<T>,
): UseUndoableActionResult<T> {
  const { action, undo, message, undoLabel = '撤销', duration = 5 } = options
  const { showToast, dismissToast } = useToast()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastIdRef = useRef<string | null>(null)
  const currentItemRef = useRef<T | null>(null)
  const actionExecutedRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimer()
    if (toastIdRef.current) {
      dismissToast(toastIdRef.current)
      toastIdRef.current = null
    }
    currentItemRef.current = null
    actionExecutedRef.current = false
  }, [clearTimer, dismissToast])

  const execute = useCallback(
    (item: T) => {
      clearTimer()
      currentItemRef.current = item
      actionExecutedRef.current = false

      const handleUndo = async () => {
        clearTimer()
        if (!actionExecutedRef.current) {
          await action(item)
          actionExecutedRef.current = true
        }
        await undo(item)
        currentItemRef.current = null
        toastIdRef.current = null
        actionExecutedRef.current = false
      }

      // 立即执行 action
      action(item)
      actionExecutedRef.current = true

      toastIdRef.current = showToast(message, 'info', {
        actionLabel: undoLabel,
        onAction: handleUndo,
        duration: duration * 1000,
      })

      timerRef.current = setTimeout(() => {
        currentItemRef.current = null
        toastIdRef.current = null
        actionExecutedRef.current = false
      }, duration * 1000)
    },
    [action, undo, message, undoLabel, duration, clearTimer, showToast],
  )

  return { execute, dismiss }
}
