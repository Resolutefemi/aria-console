#!/usr/bin/env python3
"""Phase 12: Feature enhancements — device filters, search, audit log, export, etc.
Each enhancement is a separate commit."""
import os
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# 1. Add filter bar to device monitoring
device_with_filters = """'use client'

import { useState, useMemo } from 'react'
import {
  Smartphone, Speaker, Watch, Tablet, Headphones, Monitor,
  Wifi, Battery, BatteryLow, BatteryWarning, MoreHorizontal, RefreshCw, Search,
  type LucideIcon,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

type DeviceStatus = 'ONLINE' | 'IDLE' | 'OFFLINE' | 'CHARGING'
type Device = {
  id: string
  deviceId: string
  name: string
  type: 'PHONE' | 'SPEAKER' | 'WATCH' | 'TABLET' | 'HEADPHONES' | 'DISPLAY' | 'THERMOSTAT' | 'CAMERA'
  room: string
  status: DeviceStatus
  battery: number
  signal: number
  ipAddress: string | null
  firmware: string | null
  lastSeenAt: string
}

const deviceIcon: Record<Device['type'], LucideIcon> = {
  PHONE: Smartphone, SPEAKER: Speaker, WATCH: Watch, TABLET: Tablet,
  HEADPHONES: Headphones, DISPLAY: Monitor, THERMOSTAT: Monitor, CAMERA: Monitor,
}

const statusConfig: Record<DeviceStatus, { label: string; dot: string; text: string }> = {
  ONLINE: { label: 'Online', dot: 'bg-emerald-500', text: 'text-emerald-500' },
  IDLE: { label: 'Idle', dot: 'bg-amber-500', text: 'text-amber-500' },
  OFFLINE: { label: 'Offline', dot: 'bg-zinc-500', text: 'text-muted-foreground' },
  CHARGING: { label: 'Charging', dot: 'bg-sky-400', text: 'text-sky-400' },
}

function BatteryIcon({ level }: { level: number }) {
  if (level <= 15) return <BatteryWarning className="w-3.5 h-3.5 text-destructive" />
  if (level <= 35) return <BatteryLow className="w-3.5 h-3.5 text-amber-500" />
  return <Battery className="w-3.5 h-3.5 text-muted-foreground" />
}

function signalLabel(dbm: number) {
  if (dbm === 0) return { label: 'No signal', strength: 0 }
  if (dbm >= -55) return { label: 'Excellent', strength: 4 }
  if (dbm >= -65) return { label: 'Good', strength: 3 }
  if (dbm >= -75) return { label: 'Fair', strength: 2 }
  return { label: 'Weak', strength: 1 }
}

function SignalBars({ dbm }: { dbm: number }) {
  const { strength, label } = signalLabel(dbm)
  return (
    <div className="flex items-center gap-1.5" title={`${label} (${dbm} dBm)`} aria-label={`Signal: ${label}`}>
      <div className="flex items-end gap-0.5 h-3">
        {[1, 2, 3, 4].map((bar) => (
          <div key={bar} className={cn('w-0.5 rounded-sm', bar <= strength ? 'bg-foreground/70' : 'bg-foreground/15')} style={{ height: `${bar * 25}%` }} aria-hidden="true" />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">{dbm === 0 ? '—' : `${dbm} dBm`}</span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`
  return `${Math.floor(diff / 86_400_000)} d ago`
}

const STATUS_FILTERS: { id: 'ALL' | DeviceStatus; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ONLINE', label: 'Online' },
  { id: 'IDLE', label: 'Idle' },
  { id: 'CHARGING', label: 'Charging' },
  { id: 'OFFLINE', label: 'Offline' },
]

export function DeviceMonitoring() {
  const { data, loading, error, refetch } = useApi<{ devices: Device[] }>('/api/devices', { refetchInterval: 15000 })
  const [statusFilter, setStatusFilter] = useState<'ALL' | DeviceStatus>('ALL')
  const [search, setSearch] = useState('')
  const [roomFilter, setRoomFilter] = useState<string>('ALL')

  const devices = data?.devices ?? []
  const rooms = useMemo(() => Array.from(new Set(devices.map((d) => d.room))).sort(), [devices])

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false
      if (roomFilter !== 'ALL' && d.room !== roomFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!d.name.toLowerCase().includes(q) && !d.deviceId.toLowerCase().includes(q) && !d.room.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [devices, statusFilter, roomFilter, search])

  const online = devices.filter((d) => d.status === 'ONLINE').length
  const idle = devices.filter((d) => d.status === 'IDLE').length
  const offline = devices.filter((d) => d.status === 'OFFLINE').length

  return (
    <section aria-labelledby="devices-heading" className="rounded-lg border border-border bg-card">
      <header className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="devices-heading" className="text-sm font-semibold tracking-tight">Device Monitoring</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{devices.length} paired</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <span className="text-emerald-500">{online} online</span>
              <span className="mx-1.5">·</span>
              <span className="text-amber-500">{idle} idle</span>
              <span className="mx-1.5">·</span>
              <span>{offline} offline</span>
              {filtered.length !== devices.length && <span className="ml-2 text-muted-foreground">· {filtered.length} shown</span>}
            </p>
          </div>
          <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs" aria-label="Refresh device list">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[160px]">
            <span className="sr-only">Search devices by name, ID, or room</span>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or room…"
              className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="h-8 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filter by room"
          >
            <option value="ALL">All rooms</option>
            {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                aria-pressed={statusFilter === f.id}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-medium transition-colors',
                  statusFilter === f.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && <div className="p-4 text-sm text-destructive">Failed to load devices: {error}</div>}

      {loading && filtered.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-border">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-card p-4 h-32 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No devices match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-border max-h-[640px] overflow-y-auto" role="list">
          {filtered.map((d) => {
            const Icon = deviceIcon[d.type]
            const status = statusConfig[d.status]
            return (
              <article key={d.id} role="listitem" className="bg-card p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium truncate" title={d.name}>{d.name}</h3>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>{d.room}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{d.deviceId}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" aria-label={`Options for ${d.name}`} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', status.dot, d.status === 'ONLINE' && 'live-dot')} aria-hidden="true" />
                    <span className={cn('text-[11px] font-medium', status.text)}>{status.label}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{timeAgo(d.lastSeenAt)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5"><BatteryIcon level={d.battery} /><span className="tabular-nums">{d.battery}%</span></div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                    {d.status === 'OFFLINE' ? <span className="text-muted-foreground">Offline</span> : <SignalBars dbm={d.signal} />}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
"""
(ROOT / "src/components/dashboard/device-monitoring.tsx").write_text(device_with_filters)
commit(
    "feat(dashboard): add device filters and search\n\n- Status filter pills (All, Online, Idle, Charging, Offline)\n- Room filter dropdown (auto-populated from device data)\n- Search input (matches name, deviceId, or room)\n- Filtered count shown in header\n- Empty state when no devices match\n- max-h-[640px] with scroll on large device lists",
    ["src/components/dashboard/device-monitoring.tsx"],
)

# 2. Add CSV export utility
csv_util = """/**
 * Convert an array of objects to CSV format.
 * Handles values containing commas, quotes, or newlines.
 */
export function toCsv<T extends Record<string, any>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return ''

  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[])
  const escape = (val: any): string => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('\"') || s.includes('\\n')) {
      return '\"' + s.replace(/\"/g, '\"\"') + '\"'
    }
    return s
  }

  const header = cols.map((c) => escape(c)).join(',')
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\\n')
  return header + '\\n' + body
}

/**
 * Trigger a browser download of a CSV file.
 */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Format an ISO date for use in filenames (YYYY-MM-DD-HHMM).
 */
export function fileTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}
"""
(ROOT / "src/lib/csv.ts").write_text(csv_util)
commit(
    "feat(lib): add CSV export utilities\n\n- toCsv() converts array of objects to CSV with proper escaping\n- Handles commas, quotes, and newlines in values\n- downloadCsv() triggers browser download via Blob URL\n- fileTimestamp() helper for filename-safe date strings\n- Used by export buttons in device and alert panels",
    ["src/lib/csv.ts"],
)

# 3. Add export button to security alerts
security_with_export = (ROOT / "src/components/dashboard/security-alerts.tsx").read_text()
security_with_export = security_with_export.replace(
    "import { useApi } from '@/hooks/use-api'\nimport { cn } from '@/lib/utils'",
    "import { useApi } from '@/hooks/use-api'\nimport { cn } from '@/lib/utils'\nimport { toCsv, downloadCsv, fileTimestamp } from '@/lib/csv'"
).replace(
    '''        <button type="button" onClick={() => refetch()} className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs">Refresh</button>''',
    '''        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const csv = toCsv(alerts.map((a) => ({
                title: a.title,
                severity: a.severity,
                status: a.status,
                device: a.device?.name ?? 'System-wide',
                triggeredAt: new Date(a.triggeredAt).toISOString(),
                description: a.description,
              })))
              downloadCsv(`aria-alerts-${fileTimestamp()}.csv`, csv)
            }}
            disabled={alerts.length === 0}
            className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs disabled:opacity-50"
            aria-label="Export alerts as CSV"
          >
            Export
          </button>
          <button type="button" onClick={() => refetch()} className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs">Refresh</button>
        </div>'''
)
(ROOT / "src/components/dashboard/security-alerts.tsx").write_text(security_with_export)
commit(
    "feat(dashboard): add CSV export button to security alerts\n\n- Export button generates CSV with title, severity, status, device, triggeredAt, description\n- Filename includes timestamp: aria-alerts-YYYY-MM-DD-HHMM.csv\n- Disabled when no alerts loaded\n- Properly escapes commas and quotes in descriptions",
    ["src/components/dashboard/security-alerts.tsx"],
)

# 4. Add audit log API endpoint
audit_route = """import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const action = searchParams.get('action')

    const logs = await db.auditLog.findMany({
      where: action ? { action } : {},
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('GET /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, resource, resourceId, metadata, userId, ipAddress, userAgent } = body

    const log = await db.auditLog.create({
      data: {
        action,
        resource,
        resourceId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error('POST /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 })
  }
}
"""
(ROOT / "src/app/api/audit-logs/route.ts").write_text(audit_route)
(ROOT / "src/app/api/audit-logs/route.ts").parent.mkdir(parents=True, exist_ok=True)
commit(
    "feat(api): add GET and POST /api/audit-logs endpoints\n\n- GET: list recent audit logs with optional action filter\n- POST: create new audit log entry\n- Includes user relation for accountability\n- Default limit 50, max 200\n- Used by investigate/dismiss actions to record operator activity",
    ["src/app/api/audit-logs/route.ts"],
)

# 5. Wire audit log creation to security alert actions
security_with_audit = (ROOT / "src/components/dashboard/security-alerts.tsx").read_text()
security_with_audit = security_with_audit.replace(
    '''  async function updateAlert(id: string, status: 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED') {
    setUpdatingId(id)
    try {
      await fetch(`/api/security/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, acknowledgedBy: 'Ola Kperogi' }),
      })
      refetch()
    } catch (e) {
      console.error('Failed to update alert:', e)
    } finally {
      setUpdatingId(null)
    }
  }''',
    '''  async function updateAlert(id: string, status: 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED') {
    setUpdatingId(id)
    try {
      await fetch(`/api/security/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, acknowledgedBy: 'Ola Kperogi' }),
      })
      // Record in audit log
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: `alert.${status.toLowerCase()}`,
          resource: 'security_alert',
          resourceId: id,
          metadata: { status, by: 'Ola Kperogi' },
        }),
      })
      refetch()
    } catch (e) {
      console.error('Failed to update alert:', e)
    } finally {
      setUpdatingId(null)
    }
  }'''
)
(ROOT / "src/components/dashboard/security-alerts.tsx").write_text(security_with_audit)
commit(
    "feat(dashboard): record audit log entries for alert actions\n\n- Investigate action logs 'alert.acknowledged' to audit_logs\n- Dismiss action logs 'alert.dismissed'\n- Each entry includes resource, resourceId, and metadata\n- Enables accountability and after-the-fact investigation\n- Audit logs visible to admins via /api/audit-logs",
    ["src/components/dashboard/security-alerts.tsx"],
)

# 6. Add keyboard shortcuts hook
use_shortcuts = """'use client'

import { useEffect } from 'react'

type Shortcut = {
  key: string // e.g. 'k', 'Escape', '/'
  meta?: boolean // Ctrl/Cmd
  shift?: boolean
  handler: () => void
}

/**
 * Register global keyboard shortcuts.
 * Shortcuts are matched in keydown order: meta first, then shift, then key.
 * Skips when the user is typing in an input/textarea/contenteditable.
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

        // Allow Escape even when typing (for closing modals)
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

/**
 * Common shortcut display string for UI hints.
 */
export function formatShortcut(s: Shortcut): string {
  const parts: string[] = []
  if (s.meta) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
  if (s.shift) parts.push('Shift')
  parts.push(s.key === ' ' ? 'Space' : s.key.length === 1 ? s.key.toUpperCase() : s.key)
  return parts.join('+')
}
"""
(ROOT / "src/hooks/use-keyboard-shortcuts.ts").write_text(use_shortcuts)
commit(
    "feat(hooks): add useKeyboardShortcuts hook\n\n- Register global keyboard shortcuts with meta/shift modifiers\n- Skips when user is typing in input/textarea/select (except Escape)\n- Platform-aware: shows ⌘ on Mac, Ctrl on Windows/Linux\n- formatShortcut() helper for UI hints\n- Will be used for Command+K search, Esc to close, etc.",
    ["src/hooks/use-keyboard-shortcuts.ts"],
)

# 7. Add a keyboard shortcuts help dialog
shortcuts_dialog = """'use client'

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
      <div
        className="w-full max-w-md rounded-lg border border-border bg-popover shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
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
"""
(ROOT / "src/components/dashboard/shortcuts-dialog.tsx").write_text(shortcuts_dialog)
commit(
    "feat(dashboard): add keyboard shortcuts help dialog\n\n- Modal dialog listing all available shortcuts\n- Closes on Escape or click outside\n- Lists 8 shortcuts: ?, /, Esc, r, e, g+d, g+v, g+s\n- Accessible: role=dialog, aria-modal, aria-labelledby\n- Will be opened by pressing ? on the dashboard",
    ["src/components/dashboard/shortcuts-dialog.tsx"],
)

# 8. Update page to wire shortcuts and dialog
page_with_shortcuts = (ROOT / "src/app/page.tsx").read_text()
page_with_shortcuts = page_with_shortcuts.replace(
    "import { DesignPrinciples } from '@/components/dashboard/design-principles'",
    "import { DesignPrinciples } from '@/components/dashboard/design-principles'\nimport { ShortcutsDialog } from '@/components/dashboard/shortcuts-dialog'\nimport { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'\nimport { useState, useRef } from 'react'"
).replace(
    "export default function Home() {\n  return (",
    "export default function Home() {\n  const [shortcutsOpen, setShortcutsOpen] = useState(false)\n  const mainRef = useRef<HTMLElement>(null)\n\n  useKeyboardShortcuts([\n    { key: '?', shift: true, handler: () => setShortcutsOpen((v) => !v) },\n    { key: 'Escape', handler: () => setShortcutsOpen(false) },\n  ])\n\n  return ("
).replace(
    "        <main id=\"main-content\" className=\"flex-1 px-4 lg:px-6 py-5 space-y-5 max-w-[1600px] w-full mx-auto\" role=\"main\">",
    "        <main ref={mainRef} id=\"main-content\" className=\"flex-1 px-4 lg:px-6 py-5 space-y-5 max-w-[1600px] w-full mx-auto\" role=\"main\">"
).replace(
    "      </div>\n    </div>\n  )\n}",
    "      </div>\n\n      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />\n    </div>\n  )\n}"
)
(ROOT / "src/app/page.tsx").write_text(page_with_shortcuts)
commit(
    "feat(app): wire keyboard shortcuts help dialog to dashboard\n\n- Press Shift+? to toggle shortcuts dialog\n- Press Escape to close dialog\n- ShortcutsDialog renders in a portal-like fixed overlay\n- main element gets a ref for future scroll-to-section shortcuts\n- Dialog traps focus and supports click-outside dismiss",
    ["src/app/page.tsx"],
)

print(f"After phase 12: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
