'use client'

import { useState, useMemo } from 'react'
import {
  Smartphone, Speaker, Watch, Tablet, Headphones, Monitor,
  Wifi, Battery, BatteryLow, BatteryWarning, MoreHorizontal, RefreshCw, Search,
  type LucideIcon,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'
import { DeviceDetailDrawer } from '@/components/dashboard/device-detail-drawer'

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
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
              <article
              key={d.id}
              role="listitem"
              className="bg-card p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
              onClick={() => { setSelectedDeviceId(d.deviceId); setDrawerOpen(true) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDeviceId(d.deviceId); setDrawerOpen(true) } }}
              tabIndex={0}
              aria-label={`Open details for ${d.name}`}
            >
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

      <DeviceDetailDrawer deviceId={selectedDeviceId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </section>
  )
}
