'use client'

import { useEffect } from 'react'

type Shortcut = {
  key: string
  meta?: boolean
  shift?: boolean
  handler: () => void
}

/**
 * Register global keyboard shortcuts.
 * Skips when the user is typing in an input/textarea/select (except Escape).
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable

      for (const s of shortcuts) {
        if (s.meta && !(e.metaKey || e.ctrlKey)) continue
        if (s.shift && !e.shiftKey) continue
        if (e.key.toLowerCase() !== s.key.toLowerCase()) continue

        if (isTyping && s.key !== 'Escape') continue

        e.preventDefault()
        s.handler()
        break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [shortcuts])
}
