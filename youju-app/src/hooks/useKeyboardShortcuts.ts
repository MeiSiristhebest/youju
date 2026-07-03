import { useCallback, useEffect } from 'react'

export type ModifierKey = 'ctrl' | 'meta' | 'alt' | 'shift'

export interface ShortcutConfig {
  key: string
  modifiers?: readonly ModifierKey[]
  description: string
  group: string
  handler: (e: KeyboardEvent) => void
  enabled?: boolean
  preventDefault?: boolean
}

const isInputFocused = (): boolean => {
  const active = document.activeElement
  if (!active) return false
  const tag = active.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if ((active as HTMLElement).isContentEditable) return true
  return false
}

const matchesModifiers = (e: KeyboardEvent, modifiers?: readonly ModifierKey[]): boolean => {
  if (!modifiers || modifiers.length === 0) {
    return !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey
  }
  const hasCtrl = modifiers.includes('ctrl')
  const hasMeta = modifiers.includes('meta')
  const hasAlt = modifiers.includes('alt')
  const hasShift = modifiers.includes('shift')

  const ctrlOrMeta = hasCtrl || hasMeta
  if (ctrlOrMeta && !(e.ctrlKey || e.metaKey)) return false
  if (!ctrlOrMeta && (e.ctrlKey || e.metaKey)) return false

  if (hasAlt && !e.altKey) return false
  if (!hasAlt && e.altKey) return false

  if (hasShift && !e.shiftKey) return false
  if (!hasShift && e.shiftKey) return false

  return true
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue

        if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) continue

        if (!matchesModifiers(e, shortcut.modifiers)) continue

        const isGlobalShortcut =
          shortcut.modifiers?.some((m) => m === 'ctrl' || m === 'meta') ||
          shortcut.key === 'Escape' ||
          shortcut.key === '?'

        if (!isGlobalShortcut && isInputFocused()) continue

        if (shortcut.preventDefault !== false) {
          e.preventDefault()
        }

        shortcut.handler(e)
        break
      }
    },
    [shortcuts, enabled],
  )

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}
