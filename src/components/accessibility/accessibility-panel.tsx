'use client'

import { useState } from 'react'
import { Accessibility, X, Contrast, Type, Zap, Ear } from 'lucide-react'
import { useAccessibility } from '@/components/accessibility/accessibility-provider'
import { cn } from '@/lib/utils'

export function AccessibilityPanel() {
  const [open, setOpen] = useState(false)
  const { settings, toggle } = useAccessibility()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        aria-label="Open accessibility settings"
      >
        <Accessibility className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-popover shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 id="a11y-title" className="text-sm font-semibold flex items-center gap-2">
                <Accessibility className="w-4 h-4" />
                Accessibility
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close accessibility settings"
                className="p-1 rounded hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <ToggleRow
                icon={<Contrast className="w-4 h-4" />}
                label="High contrast"
                description="Black background, white text, thick borders"
                checked={settings.highContrast}
                onChange={() => toggle('highContrast')}
              />
              <ToggleRow
                icon={<Type className="w-4 h-4" />}
                label="Large text"
                description="Increases base font size throughout the app"
                checked={settings.largeText}
                onChange={() => toggle('largeText')}
              />
              <ToggleRow
                icon={<Zap className="w-4 h-4" />}
                label="Reduced motion"
                description="Disables animations and live indicators"
                checked={settings.reducedMotion}
                onChange={() => toggle('reducedMotion')}
              />
              <ToggleRow
                icon={<Ear className="w-4 h-4" />}
                label="Screen reader mode"
                description="Hides decorative elements, enhances semantic content"
                checked={settings.screenReaderMode}
                onChange={() => toggle('screenReaderMode')}
              />
            </div>

            <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
              Settings are saved on this device. Use the voice assistant for hands-free operation.
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border border-border bg-card">
      <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors shrink-0',
          checked ? 'bg-accent' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </button>
    </div>
  )
}
