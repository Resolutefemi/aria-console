'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { keys: '?', description: 'Show this help dialog' },
  { keys: '/', description: 'Focus the search input' },
  { keys: 'Esc', description: 'Close dialogs or clear filters' },
  { keys: 'r', description: 'Refresh device list' },
  { keys: 'e', description: 'Export alerts as CSV' },
  { keys: 'g d', description: 'Go to Devices section' },
  { keys: 'g v', description: 'Go to Voice section' },
  { keys: 'g s', description: 'Go to Security section' },
]

export function ShortcutsDialog({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-popover shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="shortcuts-title" className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} aria-label="Close shortcuts dialog" className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="p-2 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between px-2 py-2 rounded hover:bg-muted/50">
              <span className="text-sm">{s.description}</span>
              <kbd className="px-2 py-0.5 rounded border border-border bg-muted text-[11px] font-mono">{s.keys}</kbd>
            </li>
          ))}
        </ul>
        <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
          Tip: shortcuts are disabled while typing in inputs.
        </div>
      </div>
    </div>
  )
}
