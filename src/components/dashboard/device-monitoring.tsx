'use client'

import {
  Smartphone,
  Speaker,
  Watch,
  Tablet,
  Headphones,
  Battery,
  BatteryLow,
  BatteryWarning,
  type LucideIcon,
} from 'lucide-react'

type DeviceStatus = 'online' | 'idle' | 'offline' | 'charging'

type Device = {
  id: string
  name: string
  type: 'phone' | 'speaker' | 'watch' | 'tablet' | 'headphones'
  room: string
  status: DeviceStatus
  battery: number
  signal: number
  lastSeen: string
  ip: string
}

const deviceIcon: Record<Device['type'], LucideIcon> = {
  phone: Smartphone,
  speaker: Speaker,
  watch: Watch,
  tablet: Tablet,
  headphones: Headphones,
}

const statusConfig: Record<DeviceStatus, { label: string; dot: string; text: string }> = {
  online: { label: 'Online', dot: 'bg-emerald-500', text: 'text-emerald-500' },
  idle: { label: 'Idle', dot: 'bg-amber-500', text: 'text-amber-500' },
  offline: { label: 'Offline', dot: 'bg-zinc-500', text: 'text-muted-foreground' },
  charging: { label: 'Charging', dot: 'bg-sky-400', text: 'text-sky-400' },
}

function BatteryIcon({ level }: { level: number }) {
  if (level <= 15) {
    return <BatteryWarning className="w-3.5 h-3.5 text-destructive" />
  }
  if (level <= 35) {
    return <BatteryLow className="w-3.5 h-3.5 text-amber-500" />
  }
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
          <div
            key={bar}
            className={`w-0.5 rounded-sm ${bar <= strength ? 'bg-foreground/70' : 'bg-foreground/15'}`}
            style={{ height: `${bar * 25}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">{dbm === 0 ? '—' : `${dbm} dBm`}</span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function DeviceMonitoring() {
  return (
    <section aria-labelledby="devices-heading" className="rounded-lg border border-border bg-card">
      <header className="p-4 border-b border-border">
        <h2 id="devices-heading" className="text-sm font-semibold tracking-tight">Device Monitoring</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Device grid will be added in next commit</p>
      </header>
    </section>
  )
}
