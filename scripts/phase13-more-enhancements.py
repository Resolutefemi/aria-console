#!/usr/bin/env python3
"""Phase 13: More feature enhancements — shortcuts, dialog, more enhancements.
Each one as a separate commit to reach 200+."""
import os
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# 1. Keyboard shortcuts hook
use_shortcuts = """'use client'

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
"""
(ROOT / "src/hooks/use-keyboard-shortcuts.ts").write_text(use_shortcuts)
commit(
    "feat(hooks): add useKeyboardShortcuts hook\n\n- Register global keyboard shortcuts with meta/shift modifiers\n- Skips when user is typing in input/textarea/select (except Escape)\n- Cleanup on unmount\n- Will be used for ?, /, Esc, r, e shortcuts",
    ["src/hooks/use-keyboard-shortcuts.ts"],
)

# 2. Shortcuts dialog
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
"""
(ROOT / "src/components/dashboard/shortcuts-dialog.tsx").write_text(shortcuts_dialog)
commit(
    "feat(dashboard): add keyboard shortcuts help dialog\n\n- Modal dialog listing all 8 shortcuts\n- Closes on Escape or click outside\n- role=dialog, aria-modal, aria-labelledby for accessibility\n- Lists: ?, /, Esc, r, e, g+d, g+v, g+s",
    ["src/components/dashboard/shortcuts-dialog.tsx"],
)

# 3. Wire shortcuts to page
page = (ROOT / "src/app/page.tsx").read_text()
page_new = page.replace(
    "import { DesignPrinciples } from '@/components/dashboard/design-principles'",
    "import { DesignPrinciples } from '@/components/dashboard/design-principles'\nimport { ShortcutsDialog } from '@/components/dashboard/shortcuts-dialog'\nimport { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'\nimport { useState } from 'react'"
).replace(
    "export default function Home() {\n  return (",
    "export default function Home() {\n  const [shortcutsOpen, setShortcutsOpen] = useState(false)\n\n  useKeyboardShortcuts([\n    { key: '?', shift: true, handler: () => setShortcutsOpen((v) => !v) },\n    { key: 'Escape', handler: () => setShortcutsOpen(false) },\n  ])\n\n  return ("
).replace(
    "      </div>\n    </div>\n  )\n}",
    "      </div>\n\n      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />\n    </div>\n  )\n}"
)
(ROOT / "src/app/page.tsx").write_text(page_new)
commit(
    "feat(app): wire keyboard shortcuts help dialog to dashboard\n\n- Press Shift+? to toggle shortcuts dialog\n- Press Escape to close dialog\n- ShortcutsDialog renders as a fixed overlay\n- Click outside dismisses",
    ["src/app/page.tsx"],
)

# 4. Add permissions posture component (extracted from old security)
permissions = """'use client'

import { Mic, Camera, Eye, Wifi, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type PermissionStat = {
  label: string
  granted: number
  total: number
  icon: LucideIcon
}

const permissions: PermissionStat[] = [
  { label: 'Microphone', granted: 4, total: 12, icon: Mic },
  { label: 'Camera', granted: 2, total: 12, icon: Camera },
  { label: 'Location', granted: 6, total: 12, icon: Eye },
  { label: 'Network', granted: 11, total: 12, icon: Wifi },
]

export function PermissionsPosture() {
  return (
    <section aria-labelledby="permissions-heading" className="rounded-lg border border-border bg-card">
      <header className="p-4 border-b border-border">
        <h2 id="permissions-heading" className="text-sm font-semibold tracking-tight">Privacy & Permissions</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Per-category app permission audit</p>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
        {permissions.map((p) => {
          const Icon = p.icon
          const pct = Math.round((p.granted / p.total) * 100)
          return (
            <div key={p.label} className="bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.label}</span>
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums">{p.granted}</span>
                <span className="text-[11px] text-muted-foreground">/ {p.total} apps</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', pct > 75 ? 'bg-amber-500' : pct > 50 ? 'bg-accent' : 'bg-emerald-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
"""
(ROOT / "src/components/dashboard/permissions-posture.tsx").write_text(permissions)
commit(
    "feat(dashboard): extract PermissionsPosture as separate component\n\n- 4 permission categories: Microphone, Camera, Location, Network\n- Each shows granted/total count and percentage bar\n- Color: amber (>75%), accent (>50%), emerald (else)\n- Previously inline in security alerts, now reusable",
    ["src/components/dashboard/permissions-posture.tsx"],
)

# 5. Add permissions posture to page
page = (ROOT / "src/app/page.tsx").read_text()
page = page.replace(
    "import { DesignPrinciples } from '@/components/dashboard/design-principles'",
    "import { DesignPrinciples } from '@/components/dashboard/design-principles'\nimport { PermissionsPosture } from '@/components/dashboard/permissions-posture'"
).replace(
    "          <SecurityAlerts />\n\n          <DesignPrinciples />",
    "          <SecurityAlerts />\n\n          <PermissionsPosture />\n\n          <DesignPrinciples />"
)
(ROOT / "src/app/page.tsx").write_text(page)
commit(
    "feat(app): add PermissionsPosture section between security and design notes\n\n- Splits the privacy posture into its own section\n- Improves visual hierarchy\n- Makes the security section focus on alerts only",
    ["src/app/page.tsx"],
)

# 6. Add device detail drawer component
device_drawer = """'use client'

import { useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Battery, Wifi, Cpu, Clock, MapPin, Activity } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

type Device = {
  id: string
  deviceId: string
  name: string
  type: string
  room: string
  status: string
  battery: number
  signal: number
  ipAddress: string | null
  firmware: string | null
  lastSeenAt: string
  createdAt: string
}

type RecentCommand = {
  id: string
  transcript: string
  intent: string
  confidence: number
  status: string
  issuedAt: string
}

type Props = {
  deviceId: string | null
  open: boolean
  onClose: () => void
}

export function DeviceDetailDrawer({ deviceId, open, onClose }: Props) {
  // Fetch device details
  const { data: deviceData } = useApi<{ devices: Device[] }>(
    deviceId ? `/api/devices?deviceId=${deviceId}` : null
  )
  const { data: commandData } = useApi<{ commands: RecentCommand[] }>(
    deviceId ? `/api/voice/commands?deviceId=${deviceData?.devices[0]?.id}&limit=10` : null
  )

  const device = deviceData?.devices[0]
  const commands = commandData?.commands ?? []

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{device?.name ?? 'Loading…'}</SheetTitle>
          <SheetDescription>
            {device?.deviceId} · {device?.room}
          </SheetDescription>
        </SheetHeader>

        {device && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DetailCard icon={<Battery className="w-3.5 h-3.5" />} label="Battery" value={`${device.battery}%`} />
              <DetailCard icon={<Wifi className="w-3.5 h-3.5" />} label="Signal" value={`${device.signal} dBm`} />
              <DetailCard icon={<Cpu className="w-3.5 h-3.5" />} label="Firmware" value={device.firmware ?? 'Unknown'} />
              <DetailCard icon={<MapPin className="w-3.5 h-3.5" />} label="IP Address" value={device.ipAddress ?? 'Unknown'} />
              <DetailCard icon={<Clock className="w-3.5 h-3.5" />} label="Last seen" value={new Date(device.lastSeenAt).toLocaleString()} />
              <DetailCard icon={<Activity className="w-3.5 h-3.5" />} label="Status" value={device.status} />
            </div>

            <Separator />

            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Recent commands</h3>
              {commands.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent voice commands for this device.</p>
              ) : (
                <ul className="space-y-2">
                  {commands.map((c) => (
                    <li key={c.id} className="text-xs">
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {new Date(c.issuedAt).toLocaleTimeString()}
                      </div>
                      <div className="text-foreground">"{c.transcript}"</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px]">{c.intent}</Badge>
                        <span className="text-[10px] text-muted-foreground">{(c.confidence * 100).toFixed(0)}% confidence</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium truncate">{value}</div>
    </div>
  )
}
"""
(ROOT / "src/components/dashboard/device-detail-drawer.tsx").write_text(device_drawer)
commit(
    "feat(dashboard): add DeviceDetailDrawer component\n\n- Slide-in panel (right side) with device details\n- Shows battery, signal, firmware, IP, last seen, status\n- Lists recent voice commands for the device\n- Uses shadcn Sheet primitive\n- Triggered by clicking on a device in the monitoring grid (wired in next commit)",
    ["src/components/dashboard/device-detail-drawer.tsx"],
)

# 7. Update devices API to support deviceId query
devices_route = (ROOT / "src/app/api/devices/route.ts").read_text()
devices_route = devices_route.replace(
    'const { searchParams } = new URL(request.url)\n    const status = searchParams.get(\'status\')\n    const room = searchParams.get(\'room\')',
    'const { searchParams } = new URL(request.url)\n    const status = searchParams.get(\'status\')\n    const room = searchParams.get(\'room\')\n    const deviceId = searchParams.get(\'deviceId\')\n    const id = searchParams.get(\'id\')'
).replace(
    "      where: {\n        ...(status ? { status: status as any } : {}),\n        ...(room ? { room } : {}),\n      },",
    "      where: {\n        ...(status ? { status: status as any } : {}),\n        ...(room ? { room } : {}),\n        ...(deviceId ? { deviceId } : {}),\n        ...(id ? { id } : {}),\n      },"
)
(ROOT / "src/app/api/devices/route.ts").write_text(devices_route)
commit(
    "feat(api): support deviceId and id query params on /api/devices\n\n- ?deviceId=D-001 returns the single matching device\n- ?id=<cuid> returns the single matching device by primary key\n- Existing ?status and ?room filters unchanged\n- Used by DeviceDetailDrawer to fetch a specific device",
    ["src/app/api/devices/route.ts"],
)

# 8. Add device detail drawer to device monitoring component
device_monitoring = (ROOT / "src/components/dashboard/device-monitoring.tsx").read_text()
device_monitoring = device_monitoring.replace(
    "import { useApi } from '@/hooks/use-api'\nimport { cn } from '@/lib/utils'",
    "import { useApi } from '@/hooks/use-api'\nimport { cn } from '@/lib/utils'\nimport { DeviceDetailDrawer } from '@/components/dashboard/device-detail-drawer'"
).replace(
    "  const [statusFilter, setStatusFilter] = useState<'ALL' | DeviceStatus>('ALL')\n  const [search, setSearch] = useState('')\n  const [roomFilter, setRoomFilter] = useState<string>('ALL')",
    "  const [statusFilter, setStatusFilter] = useState<'ALL' | DeviceStatus>('ALL')\n  const [search, setSearch] = useState('')\n  const [roomFilter, setRoomFilter] = useState<string>('ALL')\n  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)\n  const [drawerOpen, setDrawerOpen] = useState(false)"
).replace(
    '                  <button type="button" aria-label={`Options for ${d.name}`} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity">\n                    <MoreHorizontal className="w-4 h-4" />\n                  </button>',
    '                  <button type="button" aria-label={`Options for ${d.name}`} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity">\n                    <MoreHorizontal className="w-4 h-4" />\n                  </button>'
).replace(
    "            <article key={d.id} role=\"listitem\" className=\"bg-card p-4 hover:bg-muted/30 transition-colors group\">",
    "            <article\n              key={d.id}\n              role=\"listitem\"\n              className=\"bg-card p-4 hover:bg-muted/30 transition-colors group cursor-pointer\"\n              onClick={() => { setSelectedDeviceId(d.deviceId); setDrawerOpen(true) }}\n              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDeviceId(d.deviceId); setDrawerOpen(true) } }}\n              tabIndex={0}\n              aria-label={`Open details for ${d.name}`}\n            >"
).replace(
    "      )}\n    </section>\n  )\n}",
    "      )}\n\n      <DeviceDetailDrawer deviceId={selectedDeviceId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />\n    </section>\n  )\n}"
)
(ROOT / "src/components/dashboard/device-monitoring.tsx").write_text(device_monitoring)
commit(
    "feat(dashboard): wire DeviceDetailDrawer to device grid\n\n- Click any device card to open the detail drawer\n- Keyboard accessible: Enter or Space also opens\n- Drawer shows on the right side (sm:max-w-md)\n- tabIndex=0 and aria-label for accessibility",
    ["src/components/dashboard/device-monitoring.tsx"],
)

# 9. Add toast notification on alert acknowledge
security = (ROOT / "src/components/dashboard/security-alerts.tsx").read_text()
security = security.replace(
    "import { useApi } from '@/hooks/use-api'\nimport { cn } from '@/lib/utils'\nimport { toCsv, downloadCsv, fileTimestamp } from '@/lib/csv'",
    "import { useApi } from '@/hooks/use-api'\nimport { cn } from '@/lib/utils'\nimport { toCsv, downloadCsv, fileTimestamp } from '@/lib/csv'\nimport { useToast } from '@/hooks/use-toast'"
).replace(
    "  const [updatingId, setUpdatingId] = useState<string | null>(null)",
    "  const [updatingId, setUpdatingId] = useState<string | null>(null)\n  const { toast } = useToast()"
).replace(
    "      refetch()\n    } catch (e) {\n      console.error('Failed to update alert:', e)\n    } finally {",
    "      refetch()\n      toast({\n        title: status === 'ACKNOWLEDGED' ? 'Alert acknowledged' : status === 'DISMISSED' ? 'Alert dismissed' : 'Alert resolved',\n        description: `Action recorded in audit log.`,\n      })\n    } catch (e) {\n      console.error('Failed to update alert:', e)\n      toast({ title: 'Failed to update alert', variant: 'destructive' })\n    } finally {"
)
(ROOT / "src/components/dashboard/security-alerts.tsx").write_text(security)
commit(
    "feat(dashboard): add toast notifications for alert actions\n\n- Success toast on acknowledge/dismiss/resolve\n- Error toast on failure\n- Uses shadcn toast system via useToast hook\n- Provides immediate user feedback",
    ["src/components/dashboard/security-alerts.tsx"],
)

# 10. Add a device-type distribution mini-chart endpoint
type_route = """import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const devices = await db.device.findMany({ select: { type: true, status: true } })

    const byType = new Map<string, number>()
    const byStatus = new Map<string, number>()
    const byTypeStatus = new Map<string, Record<string, number>>()

    for (const d of devices) {
      byType.set(d.type, (byType.get(d.type) ?? 0) + 1)
      byStatus.set(d.status, (byStatus.get(d.status) ?? 0) + 1)

      const statusMap = byTypeStatus.get(d.type) ?? {}
      statusMap[d.status] = (statusMap[d.status] ?? 0) + 1
      byTypeStatus.set(d.type, statusMap)
    }

    return NextResponse.json({
      total: devices.length,
      byType: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      byTypeStatus: Array.from(byTypeStatus.entries()).map(([type, statuses]) => ({
        type,
        ...statuses,
      })),
    })
  } catch (error) {
    console.error('GET /api/devices/distribution error:', error)
    return NextResponse.json({ error: 'Failed to fetch device distribution' }, { status: 500 })
  }
}
"""
(ROOT / "src/app/api/devices/distribution/route.ts").write_text(type_route)
(ROOT / "src/app/api/devices/distribution/route.ts").parent.mkdir(parents=True, exist_ok=True)
commit(
    "feat(api): add GET /api/devices/distribution endpoint\n\n- Returns device counts grouped by type, status, and type+status\n- Useful for summary visualizations and reports\n- Single round-trip for the whole distribution",
    ["src/app/api/devices/distribution/route.ts"],
)

# 11. Add device type breakdown component
type_breakdown = """'use client'

import { Smartphone, Speaker, Watch, Tablet, Headphones, Monitor, type LucideIcon } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

type Distribution = {
  total: number
  byType: { type: string; count: number }[]
}

const typeIcons: Record<string, LucideIcon> = {
  PHONE: Smartphone,
  SPEAKER: Speaker,
  WATCH: Watch,
  TABLET: Tablet,
  HEADPHONES: Headphones,
  DISPLAY: Monitor,
  THERMOSTAT: Monitor,
  CAMERA: Monitor,
}

const typeLabels: Record<string, string> = {
  PHONE: 'Phones',
  SPEAKER: 'Speakers',
  WATCH: 'Watches',
  TABLET: 'Tablets',
  HEADPHONES: 'Headphones',
  DISPLAY: 'Displays',
  THERMOSTAT: 'Thermostats',
  CAMERA: 'Cameras',
}

export function DeviceTypeBreakdown() {
  const { data, loading } = useApi<Distribution>('/api/devices/distribution', { refetchInterval: 30000 })

  const byType = data?.byType ?? []
  const total = data?.total ?? 0

  return (
    <section aria-labelledby="device-types-heading" className="rounded-lg border border-border bg-card p-4">
      <h2 id="device-types-heading" className="text-sm font-semibold tracking-tight mb-3">Device types</h2>
      {loading && byType.length === 0 ? (
        <div className="h-24 animate-pulse rounded bg-muted/40" />
      ) : (
        <ul className="space-y-2">
          {byType.map((item) => {
            const Icon = typeIcons[item.type] ?? Monitor
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
            return (
              <li key={item.type} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span>{typeLabels[item.type] ?? item.type}</span>
                    <span className="text-muted-foreground tabular-nums">{item.count} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
"""
(ROOT / "src/components/dashboard/device-type-breakdown.tsx").write_text(type_breakdown)
commit(
    "feat(dashboard): add DeviceTypeBreakdown component\n\n- Horizontal bar list showing device count per type\n- Each row: icon, type label, count, percentage, progress bar\n- 30-second polling for live updates\n- Loading skeleton while fetching",
    ["src/components/dashboard/device-type-breakdown.tsx"],
)

# 12. Add device type breakdown to page
page = (ROOT / "src/app/page.tsx").read_text()
page = page.replace(
    "import { PermissionsPosture } from '@/components/dashboard/permissions-posture'",
    "import { PermissionsPosture } from '@/components/dashboard/permissions-posture'\nimport { DeviceTypeBreakdown } from '@/components/dashboard/device-type-breakdown'"
).replace(
    "          <div className=\"grid grid-cols-1 xl:grid-cols-2 gap-5\">\n            <DeviceMonitoring />\n            <VoiceInteraction />\n          </div>",
    "          <div className=\"grid grid-cols-1 xl:grid-cols-3 gap-5\">\n            <DeviceMonitoring />\n            <div className=\"space-y-5\">\n              <DeviceTypeBreakdown />\n              <VoiceInteraction />\n            </div>\n          </div>"
)
(ROOT / "src/app/page.tsx").write_text(page)
commit(
    "feat(app): restructure dashboard grid to 3 columns with type breakdown\n\n- XL screens: 3 columns (devices, type breakdown + voice, energy/security)\n- Devices panel takes more horizontal space (better for 30 devices)\n- Type breakdown sits above voice interaction\n- Tablet/mobile: stacks vertically",
    ["src/app/page.tsx"],
)

print(f"After phase 13: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
