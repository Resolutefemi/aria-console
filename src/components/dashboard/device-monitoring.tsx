'use client'

import {
  Smartphone,
  Speaker,
  Watch,
  Tablet,
  Headphones,
  Wifi,
  Battery,
  BatteryLow,
  BatteryWarning,
  MoreHorizontal,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DeviceStatus = 'online' | 'idle' | 'offline' | 'charging'

type Device = {
  id: string
  name: string
  type: 'phone' | 'speaker' | 'watch' | 'tablet' | 'headphones'
  room: string
  status: DeviceStatus
  battery: number
  signal: number // dBm
  lastSeen: string
  ip: string
}

const devices: Device[] = [
  {
    id: 'D-001',
    name: 'Ola\'s iPhone 15 Pro',
    type: 'phone',
    room: 'Personal',
    status: 'online',
    battery: 87,
    signal: -58,
    lastSeen: 'now',
    ip: '10.0.1.24',
  },
  {
    id: 'D-002',
    name: 'Living Room Speaker',
    type: 'speaker',
    room: 'Living Room',
    status: 'online',
    battery: 100,
    signal: -42,
    lastSeen: 'now',
    ip: '10.0.1.51',
  },
  {
    id: 'D-003',
    name: 'Kitchen Display',
    type: 'tablet',
    room: 'Kitchen',
    status: 'idle',
    battery: 64,
    signal: -71,
    lastSeen: '3 min ago',
    ip: '10.0.1.62',
  },
  {
    id: 'D-004',
    name: 'Bedroom Hub',
    type: 'speaker',
    room: 'Bedroom',
    status: 'charging',
    battery: 42,
    signal: -55,
    lastSeen: 'now',
    ip: '10.0.1.73',
  },
  {
    id: 'D-005',
    name: 'Galaxy Watch6',
    type: 'watch',
    room: 'Personal',
    status: 'online',
    battery: 73,
    signal: -67,
    lastSeen: '1 min ago',
    ip: '10.0.1.88',
  },
  {
    id: 'D-006',
    name: 'AirPods Pro',
    type: 'headphones',
    room: 'Personal',
    status: 'online',
    battery: 28,
    signal: -49,
    lastSeen: 'now',
    ip: '10.0.1.91',
  },
  {
    id: 'D-007',
    name: 'Office iPad',
    type: 'tablet',
    room: 'Office',
    status: 'offline',
    battery: 12,
    signal: 0,
    lastSeen: '2 h ago',
    ip: '10.0.1.104',
  },
  {
    id: 'D-008',
    name: 'Garage Speaker',
    type: 'speaker',
    room: 'Garage',
    status: 'idle',
    battery: 91,
    signal: -84,
    lastSeen: '18 min ago',
    ip: '10.0.1.112',
  },
]

const deviceIcon: Record<Device['type'], LucideIcon> = {
  phone: Smartphone,
  speaker: Speaker,
  watch: Watch,
  tablet: Tablet,
  headphones: Headphones,
}

const statusConfig: Record<
  DeviceStatus,
  { label: string; dot: string; text: string }
> = {
  online: {
    label: 'Online',
    dot: 'bg-emerald-500',
    text: 'text-emerald-500',
  },
  idle: {
    label: 'Idle',
    dot: 'bg-amber-500',
    text: 'text-amber-500',
  },
  offline: {
    label: 'Offline',
    dot: 'bg-zinc-500',
    text: 'text-muted-foreground',
  },
  charging: {
    label: 'Charging',
    dot: 'bg-sky-400',
    text: 'text-sky-400',
  },
}

function BatteryIcon({ level }: { level: number }) {
  if (level <= 15)
    return <BatteryWarning className="w-3.5 h-3.5 text-destructive" />
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
    <div
      className="flex items-center gap-1.5"
      title={`${label} (${dbm} dBm)`}
      aria-label={`Signal: ${label}`}
    >
      <div className="flex items-end gap-0.5 h-3">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={cn(
              'w-0.5 rounded-sm',
              bar <= strength ? 'bg-foreground/70' : 'bg-foreground/15'
            )}
            style={{ height: `${bar * 25}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {dbm === 0 ? '—' : `${dbm} dBm`}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function DeviceMonitoring() {
  const online = devices.filter((d) => d.status === 'online').length
  const idle = devices.filter((d) => d.status === 'idle').length
  const offline = devices.filter((d) => d.status === 'offline').length

  return (
    <section
      aria-labelledby="devices-heading"
      className="rounded-lg border border-border bg-card"
    >
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              id="devices-heading"
              className="text-sm font-semibold tracking-tight"
            >
              Device Monitoring
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              {devices.length} paired
            </span>
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
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs"
            aria-label="Refresh device list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs"
          >
            View all
          </button>
        </div>
      </header>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-border"
        role="list"
      >
        {devices.map((d) => {
          const Icon = deviceIcon[d.type]
          const status = statusConfig[d.status]
          return (
            <article
              key={d.id}
              role="listitem"
              className="bg-card p-4 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-medium truncate"
                      title={d.name}
                    >
                      {d.name}
                    </h3>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span>{d.room}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{d.id}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Options for ${d.name}`}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      status.dot,
                      d.status === 'online' && 'live-dot'
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      status.text
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {d.lastSeen}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <BatteryIcon level={d.battery} />
                  <span className="tabular-nums">{d.battery}%</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                  {d.status === 'offline' ? (
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
    </section>
  )
}
