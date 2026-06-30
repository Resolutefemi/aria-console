'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type AccessibilitySettings = {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReaderMode: boolean
}

type AccessibilityContextValue = {
  settings: AccessibilitySettings
  toggle: (key: keyof AccessibilitySettings) => void
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReaderMode: false,
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aria-a11y-settings')
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings({ ...defaultSettings, ...JSON.parse(stored) })
      } else {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (prefersReduced) setSettings((s) => ({ ...s, reducedMotion: true }))
      }
    } catch {}
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-high-contrast', settings.highContrast ? 'true' : 'false')
    root.setAttribute('data-large-text', settings.largeText ? 'true' : 'false')
    root.setAttribute('data-reduced-motion', settings.reducedMotion ? 'true' : 'false')
    root.setAttribute('data-screen-reader', settings.screenReaderMode ? 'true' : 'false')
    try {
      localStorage.setItem('aria-a11y-settings', JSON.stringify(settings))
    } catch {}
  }, [settings])

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        toggle: (key) => setSettings((s) => ({ ...s, [key]: !s[key] })),
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
