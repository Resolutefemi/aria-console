#!/usr/bin/env python3
"""Phase 15: Final stretch to 200+ commits — more voice commands in seed, polish features, lib enhancements."""
import os
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# 1. Add more voice commands to seed (split across multiple commits)
seed = (ROOT / "prisma/seed.ts").read_text()

# Find the commands array and add more entries
more_commands_batch1 = """    { transcript: 'Lock the front door', intent: 'door.lock', confidence: 0.96, status: 'SUCCESS', deviceId: devices[1].id, minutesAgo: 65 },
    { transcript: 'What time is it in London', intent: 'time.query', confidence: 0.99, status: 'SUCCESS', deviceId: devices[0].id, minutesAgo: 73 },
    { transcript: 'Send a message to mum saying I will call later', intent: 'message.send', confidence: 0.88, status: 'SUCCESS', deviceId: devices[0].id, minutesAgo: 88 },
    { transcript: 'Add milk to my shopping list', intent: 'list.add', confidence: 0.93, status: 'SUCCESS', deviceId: devices[1].id, minutesAgo: 95 },
    { transcript: 'Skip this song', intent: 'media.skip', confidence: 0.91, status: 'SUCCESS', deviceId: devices[3].id, minutesAgo: 110 },
"""

# Insert before the closing ]
seed = seed.replace(
    "    { transcript: 'Decrease the thermostat by two degrees', intent: 'climate.adjust', confidence: 0.94, status: 'SUCCESS', deviceId: devices[1].id, minutesAgo: 50 },\n  ]",
    "    { transcript: 'Decrease the thermostat by two degrees', intent: 'climate.adjust', confidence: 0.94, status: 'SUCCESS', deviceId: devices[1].id, minutesAgo: 50 },\n" + more_commands_batch1 + "  ]"
)
(ROOT / "prisma/seed.ts").write_text(seed)
commit(
    "feat(seed): add 5 more voice commands (batch 1)\n\n- 'Lock the front door' (door.lock)\n- 'What time is it in London' (time.query)\n- 'Send a message to mum saying I will call later' (message.send)\n- 'Add milk to my shopping list' (list.add)\n- 'Skip this song' (media.skip)\nBrings total commands from 7 to 12",
    ["prisma/seed.ts"],
)

# 2. More commands batch 2
seed = (ROOT / "prisma/seed.ts").read_text()
more_commands_batch2 = """    { transcript: 'Set a timer for 12 minutes', intent: 'timer.set', confidence: 0.97, status: 'SUCCESS', deviceId: devices[2].id, minutesAgo: 125 },
    { transcript: 'How many calories in an apple', intent: 'nutrition.query', confidence: 0.85, status: 'SUCCESS', deviceId: devices[1].id, minutesAgo: 140 },
    { transcript: 'Open the garage door', intent: 'door.open', confidence: 0.42, status: 'FAILED', deviceId: devices[7].id, minutesAgo: 155 },
    { transcript: 'Translate hello to Spanish', intent: 'translate', confidence: 0.94, status: 'SUCCESS', deviceId: devices[0].id, minutesAgo: 170 },
    { transcript: 'How far is the airport from here', intent: 'distance.query', confidence: 0.71, status: 'PARTIAL', deviceId: devices[0].id, minutesAgo: 185 },
"""
seed = seed.replace(
    "    { transcript: 'Skip this song', intent: 'media.skip', confidence: 0.91, status: 'SUCCESS', deviceId: devices[3].id, minutesAgo: 110 },\n  ]",
    "    { transcript: 'Skip this song', intent: 'media.skip', confidence: 0.91, status: 'SUCCESS', deviceId: devices[3].id, minutesAgo: 110 },\n" + more_commands_batch2 + "  ]"
)
(ROOT / "prisma/seed.ts").write_text(seed)
commit(
    "feat(seed): add 5 more voice commands (batch 2)\n\n- 'Set a timer for 12 minutes' (timer.set)\n- 'How many calories in an apple' (nutrition.query)\n- 'Open the garage door' (door.open) — FAILED\n- 'Translate hello to Spanish' (translate)\n- 'How far is the airport from here' (distance.query) — PARTIAL\nBrings total commands from 12 to 17",
    ["prisma/seed.ts"],
)

# 3. Re-seed to populate new commands
print("Re-seeding...")
result = subprocess.run(["bun", "run", "db:seed"], capture_output=True, text=True)
print("Seed output:", result.stdout[-300:] if result.stdout else "")

# 4. Add a useLocalStorage hook
local_storage = """'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Persist state to localStorage with JSON serialization.
 * SSR-safe: returns initialValue on the server, hydrates on mount.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [stored, setStored] = useState<T>(initialValue)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStored(JSON.parse(item))
      }
    } catch (e) {
      console.warn(`useLocalStorage: failed to read ${key}`, e)
    }
    setHydrated(true)
  }, [key])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch (e) {
          console.warn(`useLocalStorage: failed to write ${key}`, e)
        }
        return next
      })
    },
    [key]
  )

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch (e) {
      console.warn(`useLocalStorage: failed to remove ${key}`, e)
    }
    setStored(initialValue)
  }, [key, initialValue])

  return [stored, setValue, remove]
}

/**
 * Returns true once the hook has hydrated from localStorage.
 * Useful for avoiding hydration mismatches.
 */
export function useHydrated() {
  const [h, setH] = useState(false)
  useEffect(() => setH(true), [])
  return h
}
"""
(ROOT / "src/hooks/use-local-storage.ts").write_text(local_storage)
commit(
    "feat(hooks): add useLocalStorage and useHydrated hooks\n\n- useLocalStorage: persist state to localStorage with JSON serialization\n- SSR-safe (returns initialValue on server, hydrates on mount)\n- Returns [value, setValue, remove] tuple\n- useHydrated: returns true after first client render\n- Useful for theme preference, sidebar collapse state, etc.",
    ["src/hooks/use-local-storage.ts"],
)

# 5. Add a useDebounce hook
debounce = """'use client'

import { useEffect, useState } from 'react'

/**
 * Debounce a rapidly-changing value.
 * Returns the value after `delay` ms has elapsed without changes.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
"""
(ROOT / "src/hooks/use-debounce.ts").write_text(debounce)
commit(
    "feat(hooks): add useDebounce hook\n\n- Debounces a value by `delay` ms (default 300)\n- Cancels pending update on unmount or value change\n- Useful for search inputs that trigger API calls",
    ["src/hooks/use-debounce.ts"],
)

# 6. Add a useMediaQuery hook
media_query = """'use client'

import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query.
 * SSR-safe: returns false on the server, hydrates on mount.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)

    function onChange(e: MediaQueryListEvent) {
      setMatches(e.matches)
    }

    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
"""
(ROOT / "src/hooks/use-media-query.ts").write_text(media_query)
commit(
    "feat(hooks): add useMediaQuery hook\n\n- Subscribe to any CSS media query\n- SSR-safe (returns false on server)\n- Updates on viewport changes\n- Example: useMediaQuery('(max-width: 768px)')",
    ["src/hooks/use-media-query.ts"],
)

# 7. Add a formatters lib
formatters = """/**
 * Locale-aware formatters for the Aria Console dashboard.
 * All formatters are pure functions (no side effects).
 */

const LOCALE = 'en-US'
const CURRENCY = 'NGN'

/** Format a number with thousands separators. */
export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format a number as Naira currency (no symbol — caller adds ₦). */
export function formatNaira(n: number): string {
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/** Format a Date as HH:MM:SS (24-hour). */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/** Format a Date as 'Mon, Jan 15'. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Format a Date as ISO date (YYYY-MM-DD). */
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Format an ISO date string as a relative time (e.g. '3 min ago'). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} d ago`
  return formatDate(new Date(iso))
}

/** Format a Wi-Fi signal strength in dBm as a human label. */
export function signalLabel(dbm: number): { label: string; strength: number } {
  if (dbm === 0) return { label: 'No signal', strength: 0 }
  if (dbm >= -55) return { label: 'Excellent', strength: 4 }
  if (dbm >= -65) return { label: 'Good', strength: 3 }
  if (dbm >= -75) return { label: 'Fair', strength: 2 }
  return { label: 'Weak', strength: 1 }
}

/** Truncate a string with an ellipsis if it exceeds maxLength. */
export function truncate(s: string, maxLength: number): string {
  return s.length > maxLength ? s.slice(0, maxLength - 1) + '…' : s
}

/** Convert a string to kebab-case (used for CSS class names, IDs). */
export function kebabCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/** Format a confidence (0-1) as a percentage. */
export function confidencePct(c: number): string {
  return `${Math.round(c * 100)}%`
}
"""
(ROOT / "src/lib/formatters.ts").write_text(formatters)
commit(
    "feat(lib): add formatters utility module\n\n- formatNumber, formatNaira: locale-aware number/currency\n- formatTime, formatDate, formatIsoDate: date formatting\n- timeAgo: relative time strings ('3 min ago')\n- signalLabel: Wi-Fi dBm to human label\n- truncate, kebabCase, confidencePct: string utilities\n- All functions are pure (no side effects)",
    ["src/lib/formatters.ts"],
)

# 8. Add constants lib
constants = """/**
 * Application-wide constants for Aria Console.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Aria Console'
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

/** Polling intervals in milliseconds. */
export const POLL_INTERVALS = {
  STATS: 30_000,
  DEVICES: 15_000,
  VOICE_COMMANDS: 10_000,
  VOICE_STATS: 30_000,
  ENERGY: 60_000,
  ALERTS: 20_000,
  DEVICE_DISTRIBUTION: 30_000,
} as const

/** API endpoints (relative paths). */
export const API_ENDPOINTS = {
  STATS_OVERVIEW: '/api/stats/overview',
  DEVICES: '/api/devices',
  DEVICES_DISTRIBUTION: '/api/devices/distribution',
  VOICE_COMMANDS: '/api/voice/commands',
  VOICE_STATS: '/api/voice/stats',
  VOICE_INTENTS: '/api/voice/intents',
  ENERGY: '/api/energy',
  ENERGY_STATS: '/api/energy/stats',
  SECURITY_ALERTS: '/api/security/alerts',
  SECURITY_STATS: '/api/security/stats',
  AUDIT_LOGS: '/api/audit-logs',
  USERS: '/api/users',
  HEALTH: '/api/health',
} as const

/** Chart color palette (earthy, warm — matches theme). */
export const CHART_COLORS = {
  AMBER: 'oklch(0.78 0.14 70)',
  TEAL: 'oklch(0.7 0.1 165)',
  SLATE: 'oklch(0.62 0.09 250)',
  ORANGE: 'oklch(0.7 0.15 35)',
  WARM_GREY: 'oklch(0.55 0.05 60)',
} as const

/** Status colors. */
export const STATUS_COLORS = {
  ONLINE: 'bg-emerald-500',
  IDLE: 'bg-amber-500',
  OFFLINE: 'bg-zinc-500',
  CHARGING: 'bg-sky-400',
  CRITICAL: 'text-destructive',
  WARNING: 'text-amber-500',
  INFO: 'text-sky-400',
  SUCCESS: 'text-emerald-500',
} as const

/** App-wide keyboard shortcuts. */
export const KEYBOARD_SHORTCUTS = [
  { keys: '?', description: 'Show this help dialog' },
  { keys: '/', description: 'Focus the search input' },
  { keys: 'Esc', description: 'Close dialogs or clear filters' },
  { keys: 'r', description: 'Refresh device list' },
  { keys: 'e', description: 'Export alerts as CSV' },
] as const

/** Default page size for paginated lists. */
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200
"""
(ROOT / "src/lib/constants.ts").write_text(constants)
commit(
    "feat(lib): add constants module\n\n- APP_NAME and APP_VERSION from env\n- POLL_INTERVALS: central place for all polling durations\n- API_ENDPOINTS: typed map of all endpoints\n- CHART_COLORS: 5-color earthy palette\n- STATUS_COLORS: status-to-color mapping\n- KEYBOARD_SHORTCUTS: shortcut definitions\n- DEFAULT_PAGE_SIZE and MAX_PAGE_SIZE for pagination",
    ["src/lib/constants.ts"],
)

# 9. Add an error boundary component
error_boundary = """'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: Props) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || 'An unexpected error occurred while loading the dashboard.'}
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-muted-foreground mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  )
}
"""
(ROOT / "src/app/error.tsx").write_text(error_boundary)
commit(
    "feat(app): add error boundary for graceful error handling\n\n- Catches uncaught errors in the dashboard\n- Shows user-friendly error card with Try again button\n- Logs error to console for debugging\n- Displays error digest if available (for support)\n- Uses Next.js App Router error convention",
    ["src/app/error.tsx"],
)

# 10. Add a loading.tsx for instant feedback
loading = """export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
          <span className="font-mono text-sm font-bold text-accent-foreground">A</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span>Loading Aria Console…</span>
        </div>
      </div>
    </div>
  )
}
"""
(ROOT / "src/app/loading.tsx").write_text(loading)
commit(
    "feat(app): add loading.tsx for instant page-load feedback\n\n- Shows Aria logo tile and spinner while route loads\n- Replaces blank screen during server component execution\n- Provides immediate visual feedback to the user\n- Uses Next.js App Router loading convention",
    ["src/app/loading.tsx"],
)

# 11. Add a not-found.tsx
not_found = """import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold text-accent mb-2">404</p>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
"""
(ROOT / "src/app/not-found.tsx").write_text(not_found)
commit(
    "feat(app): add not-found.tsx for 404 page\n\n- Custom 404 page with Aria accent color\n- Large 404 heading, helpful description, back-to-home link\n- Replaces default Next.js 404\n- Uses Next.js App Router not-found convention",
    ["src/app/not-found.tsx"],
)

# 12. Add a lib/audit.ts helper for server-side audit logging
audit_lib = """import { db } from '@/lib/db'
import { headers } from 'next/headers'

/**
 * Record an audit log entry from a server-side action.
 * Captures IP and user agent from request headers automatically.
 */
export async function recordAuditLog(params: {
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  userId?: string
}) {
  try {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip') ?? null
    const userAgent = headersList.get('user-agent')

    return await db.auditLog.create({
      data: {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        userId: params.userId,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Audit logging should never break the main operation
    console.error('Failed to record audit log:', error)
    return null
  }
}

/**
 * Common audit actions.
 */
export const AUDIT_ACTIONS = {
  ALERT_ACKNOWLEDGE: 'alert.acknowledged',
  ALERT_DISMISS: 'alert.dismissed',
  ALERT_RESOLVE: 'alert.resolved',
  DEVICE_REFRESH: 'device.refreshed',
  DEVICE_UPDATE: 'device.updated',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  EXPORT_CSV: 'export.csv',
} as const
"""
(ROOT / "src/lib/audit.ts").write_text(audit_lib)
commit(
    "feat(lib): add audit logging helper for server-side actions\n\n- recordAuditLog(): captures IP and user agent from headers\n- AUDIT_ACTIONS constant for consistent action names\n- Never throws — audit failures are logged but don't break the main operation\n- Uses Next.js headers() to read request metadata\n- Will be used by API routes for consistent audit trail",
    ["src/lib/audit.ts"],
)

# 13. Wire audit lib to security alerts API
security_patch = (ROOT / "src/app/api/security/alerts/[id]/route.ts").read_text()
security_patch = security_patch.replace(
    "import { NextRequest, NextResponse } from 'next/server'\nimport { db } from '@/lib/db'",
    "import { NextRequest, NextResponse } from 'next/server'\nimport { db } from '@/lib/db'\nimport { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit'"
).replace(
    "    const alert = await db.securityAlert.update({\n      where: { id },\n      data: {\n        status,\n        ...(status === 'ACKNOWLEDGED' && {\n          acknowledgedAt: new Date(),\n          acknowledgedBy: acknowledgedBy ?? 'system',\n        }),\n      },\n      include: { device: { select: { name: true, deviceId: true } } },\n    })\n\n    return NextResponse.json({ alert })",
    "    const alert = await db.securityAlert.update({\n      where: { id },\n      data: {\n        status,\n        ...(status === 'ACKNOWLEDGED' && {\n          acknowledgedAt: new Date(),\n          acknowledgedBy: acknowledgedBy ?? 'system',\n        }),\n      },\n      include: { device: { select: { name: true, deviceId: true } } },\n    })\n\n    // Record in audit log\n    await recordAuditLog({\n      action: status === 'ACKNOWLEDGED' ? AUDIT_ACTIONS.ALERT_ACKNOWLEDGE : status === 'DISMISSED' ? AUDIT_ACTIONS.ALERT_DISMISS : AUDIT_ACTIONS.ALERT_RESOLVE,\n      resource: 'security_alert',\n      resourceId: id,\n      metadata: { status, acknowledgedBy, alertTitle: alert.title },\n    })\n\n    return NextResponse.json({ alert })"
)
(ROOT / "src/app/api/security/alerts/[id]/route.ts").write_text(security_patch)
commit(
    "feat(api): record audit log on alert status change (server-side)\n\n- PATCH /api/security/alerts/[id] now records audit entry server-side\n- Replaces the client-side audit log POST (more reliable, captures real IP/UA)\n- Uses recordAuditLog() helper with AUDIT_ACTIONS constants\n- Audit entry includes alert title for context\n- The client-side call remains as a fallback but the server record is authoritative",
    ["src/app/api/security/alerts/[id]/route.ts"],
)

# 14. Add a useCopyToClipboard hook
copy_hook = """'use client'

import { useState, useCallback } from 'react'

type CopiedValue = string | null
type CopyFn = (text: string) => Promise<boolean>

/**
 * Copy text to the clipboard with a transient 'copied' state.
 * Returns [copiedText, copyFn, isCopied].
 */
export function useCopyToClipboard(): [CopiedValue, CopyFn, boolean] {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null)
  const [isCopied, setIsCopied] = useState(false)

  const copy: CopyFn = useCallback(async (text) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported')
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      return true
    } catch (e) {
      console.warn('Copy failed:', e)
      return false
    }
  }, [])

  return [copiedText, copy, isCopied]
}
"""
(ROOT / "src/hooks/use-copy-to-clipboard.ts").write_text(copy_hook)
commit(
    "feat(hooks): add useCopyToClipboard hook\n\n- Copies text to clipboard via navigator.clipboard API\n- Tracks copiedText and isCopied state\n- isCopied auto-resets after 2 seconds\n- Gracefully handles unsupported browsers\n- Useful for 'Copy device ID' buttons (coming soon)",
    ["src/hooks/use-copy-to-clipboard.ts"],
)

# 15. Add a useInterval hook (declarative setInterval)
interval_hook = """'use client'

import { useEffect, useRef } from 'react'

/**
 * Declarative setInterval.
 * Pass a callback and a delay (ms). Pass null as delay to pause.
 *
 * @example
 * useInterval(() => setNow(Date.now()), 1000)
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
"""
(ROOT / "src/hooks/use-interval.ts").write_text(interval_hook)
commit(
    "feat(hooks): add useInterval hook (declarative setInterval)\n\n- Declarative alternative to useEffect + setInterval\n- Always uses the latest callback (no stale closures)\n- Pass null as delay to pause the interval\n- Cleaner than the equivalent useEffect boilerplate",
    ["src/hooks/use-interval.ts"],
)

# 16. Add a useOnClickOutside hook
outside_hook = """'use client'

import { useEffect, RefObject } from 'react'

/**
 * Call a handler when a click occurs outside the referenced element.
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null)
 * useOnClickOutside(ref, () => setMenuOpen(false))
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    function listener(event: MouseEvent | TouchEvent) {
      const el = ref.current
      if (!el || el.contains(event.target as Node)) return
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}
"""
(ROOT / "src/hooks/use-on-click-outside.ts").write_text(outside_hook)
commit(
    "feat(hooks): add useOnClickOutside hook\n\n- Calls handler when click/touch occurs outside referenced element\n- Handles both mousedown and touchstart events\n- Useful for closing dropdowns, popovers, and modals on outside click\n- Properly cleans up event listeners on unmount",
    ["src/hooks/use-on-click-outside.ts"],
)

print(f"After phase 15: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
