'use client'

import {
  Smartphone,
  Speaker,
  Watch,
  Tablet,
  Headphones,
  Display,
  Wifi,
  Battery,
  BatteryLow,
  BatteryWarning,
  MoreHorizontal,
  RefreshCw,
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
  _count?: { voiceCommands: number; energyReadings: number; securityAlerts: number }
}

const deviceIcon: Record<Device['type'], LucideIcon> = {
  PHONE: Smartphone,
  SPEAKER: Speaker,
  WATCH: Watch,
  TABLET: Tablet,
  HEADPHONES: Headphones,
  DISPLAY: Display,
  THERMOSTAT: Smartphone, // placeholder
  CAMERA: Smartphone, // placeholder
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

export function DeviceMonitoring() {
  const { data, loading, error, refetch } = useApi<{ devices: Device[] }>('/api/devices', {
    refetchInterval: 15000,
  })

  const devices = data?.devices ?? []
  const online = devices.filter((d) => d.status === 'ONLINE').length
  const idle = devices.filter((d) => d.status === 'IDLE').length
  const offline = devices.filter((d) => d.status === 'OFFLINE').length

  return (
    <section aria-labelledby="devices-heading" className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
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
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs" aria-label="Refresh device list">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 text-sm text-destructive">Failed to load devices: {error}</div>
      )}

      {loading && devices.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-border">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card p-4 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-border" role="list">
          {devices.map((d) => {
            const Icon = deviceIcon[d.type]
            const status = statusConfig[d.status]
            return (
              <article key={d.id} role="listitem" className="bg-card p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
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
                  <div className="flex items-center gap-1.5">
                    <BatteryIcon level={d.battery} />
                    <span className="tabular-nums">{d.battery}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                    {d.status === 'OFFLINE' ? (
                      <span className="text-muted-foreground">Offline</span>
                    ) : (
                      <SignalBars dbm={d.signal} />
                    )}
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
