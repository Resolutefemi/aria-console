'use client'

import {
  Smartphone,
  Speaker,
  Watch,
  Tablet,
  Headphones,
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
