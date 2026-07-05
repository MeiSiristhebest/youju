import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

interface ToastContextValue {
  showToast: (
    message: string,
    type?: ToastType,
    options?: { actionLabel?: string; onAction?: () => void; duration?: number },
  ) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'success',
      options?: { actionLabel?: string; onAction?: () => void; duration?: number },
    ) => {
      const id = Math.random().toString(36).substring(2, 9)
      const duration = options?.duration ?? 3000
      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type,
          actionLabel: options?.actionLabel,
          onAction: options?.onAction,
          duration,
        },
      ])
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
      }
      return id
    },
    [],
  )

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[2000] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm animate-[slideIn_0.3s_ease-out]',
              toast.type === 'success' && 'bg-success-bg/95 border-success/30 text-success',
              toast.type === 'error' && 'bg-danger-bg/95 border-danger/30 text-danger',
              toast.type === 'info' && 'bg-accent-bg/95 border-accent/30 text-accent',
            )}
          >
            {toast.type === 'success' && <CheckCircle size={18} strokeWidth={1.5} />}
            {toast.type === 'error' && <AlertCircle size={18} strokeWidth={1.5} />}
            {toast.type === 'info' && <Info size={18} strokeWidth={1.5} />}
            <span className="text-sm font-medium">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  dismissToast(toast.id)
                }}
                className="ml-1 px-2 py-1 text-xs font-semibold rounded hover:bg-black/10 cursor-pointer transition-colors underline underline-offset-2"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="ml-2 p-1 rounded hover:bg-black/10 cursor-pointer transition-colors"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
