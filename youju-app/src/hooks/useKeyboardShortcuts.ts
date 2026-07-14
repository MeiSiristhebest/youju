import { useCallback, useEffect, useRef } from 'react'

export type ModifierKey = 'ctrl' | 'meta' | 'alt' | 'shift'

export interface ShortcutConfig {
  key: string
  modifiers?: readonly ModifierKey[]
  description: string
  group: string
  handler: (e: KeyboardEvent) => void
  enabled?: boolean
  preventDefault?: boolean
  isChord?: boolean
  chordPrefix?: string
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
  const chordPrefixRef = useRef<string | null>(null)
  const chordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearChordState = useCallback(() => {
    chordPrefixRef.current = null
    if (chordTimeoutRef.current) {
      clearTimeout(chordTimeoutRef.current)
      chordTimeoutRef.current = null
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      const chordShortcuts = shortcuts.filter((s) => s.isChord && s.chordPrefix)
      const normalShortcuts = shortcuts.filter((s) => !s.isChord)

      if (chordPrefixRef.current) {
        chordShortcuts.forEach((shortcut) => {
          if (
            shortcut.chordPrefix === chordPrefixRef.current &&
            (e.key ?? '').toLowerCase() === shortcut.key.toLowerCase() &&
            matchesModifiers(e, shortcut.modifiers) &&
            shortcut.enabled !== false
          ) {
            if (shortcut.preventDefault !== false) {
              e.preventDefault()
            }
            shortcut.handler(e)
            clearChordState()
          }
        })

        if (!e.defaultPrevented) return

        clearChordState()
      }

      for (const shortcut of normalShortcuts) {
        if (shortcut.enabled === false) continue

        const eventKey = e.key ?? ''
        const shortcutKey = shortcut.key ?? ''
        if (eventKey.toLowerCase() !== shortcutKey.toLowerCase()) continue

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

      const matchingPrefix = chordShortcuts.find(
        (s) => s.chordPrefix === (e.key ?? '').toLowerCase() && !s.modifiers?.length,
      )
      if (matchingPrefix && !isInputFocused()) {
        e.preventDefault()
        chordPrefixRef.current = (e.key ?? '').toLowerCase()
        if (chordTimeoutRef.current) {
          clearTimeout(chordTimeoutRef.current)
        }
        chordTimeoutRef.current = setTimeout(clearChordState, 1500)
      }
    },
    [shortcuts, enabled, clearChordState],
  )

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearChordState()
    }
  }, [handleKeyDown, enabled, clearChordState])
}

export function formatShortcutKeys(shortcut: ShortcutConfig): string[] {
  const parts: string[] = []
  if (shortcut.modifiers) {
    if (shortcut.modifiers.includes('ctrl') || shortcut.modifiers.includes('meta')) {
      parts.push('Ctrl')
    }
    if (shortcut.modifiers.includes('alt')) {
      parts.push('Alt')
    }
    if (shortcut.modifiers.includes('shift')) {
      parts.push('Shift')
    }
  }
  if (shortcut.isChord && shortcut.chordPrefix) {
    parts.push(shortcut.chordPrefix.toUpperCase())
    parts.push(shortcut.key.toUpperCase())
  } else {
    const keyMap: Record<string, string> = {
      enter: 'Enter',
      escape: 'Esc',
      ' ': 'Space',
      arrowup: '↑',
      arrowdown: '↓',
      arrowleft: '←',
      arrowright: '→',
    }
    parts.push(keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase())
  }
  return parts
}
