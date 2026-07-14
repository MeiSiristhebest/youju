import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export type OverlayPanelType =
  | 'team'
  | 'api-settings'
  | 'api-logs'
  | 'billing'
  | 'model-settings'
  | 'preferences'
  | 'monitor'
  | 'templates'
  | null

interface OverlayPanelProps {
  type: OverlayPanelType
  children: React.ReactNode
  className?: string
  sidebarCollapsed?: boolean
}

export function OverlayPanel({
  type,
  children,
  className,
  sidebarCollapsed = false,
}: OverlayPanelProps) {
  useEffect(() => {
    if (type) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [type])

  if (!type) return null

  const sidebarWidth = sidebarCollapsed ? '48px' : '240px'

  return (
    <div
      className={cn(
        'fixed inset-0 z-[999] bg-paper animate-[fadeIn_0.15s_ease-out] overflow-hidden md:left-[var(--sidebar-width)]',
        className,
      )}
      style={{ ['--sidebar-width' as string]: sidebarWidth }}
    >
      {children}
    </div>
  )
}
