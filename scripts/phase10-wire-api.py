#!/usr/bin/env python3
"""Phase 10: Replace mock data with database-backed API fetches.
- Add a generic fetcher hook
- Update each dashboard component to fetch from /api/*"""
import os
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# 1. Add a generic API fetcher hook
use_api = """'use client'

import { useEffect, useState, useCallback } from 'react'

type FetchState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Generic data-fetching hook with polling support.
 *
 * @param url API endpoint URL (relative path)
 * @param options.refetchInterval Optional polling interval in ms (0 = disabled)
 * @param options.enabled If false, skip fetching (default: true)
 */
export function useApi<T>(
  url: string | null,
  options: { refetchInterval?: number; enabled?: boolean } = {}
): FetchState<T> {
  const { refetchInterval = 0, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(!!url && enabled)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return
        if (!cancelled) {
          setError(err.message ?? 'Unknown error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    let intervalId: ReturnType<typeof setInterval> | null = null
    if (refetchInterval > 0) {
      intervalId = setInterval(load, refetchInterval)
    }

    return () => {
      cancelled = true
      controller.abort()
      if (intervalId) clearInterval(intervalId)
    }
  }, [url, enabled, refetchInterval, tick])

  return { data, loading, error, refetch }
}
"""
(ROOT / "src/hooks/use-api.ts").write_text(use_api)
commit(
    "feat(hooks): add useApi data-fetching hook with polling\n\n- Generic hook for any API endpoint\n- Supports refetchInterval for live polling (default off)\n- Supports enabled flag to conditionally fetch\n- AbortController for cleanup on unmount or url change\n- Returns { data, loading, error, refetch }",
    ["src/hooks/use-api.ts"],
)

# 2. Update stats cards to fetch from /api/stats/overview
stats_full = """'use client'

import {
  Smartphone,
  Mic,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

type OverviewStats = {
  connectedDevices: { count: number; total: number; offline: number }
  voiceCommandsToday: { count: number; deltaPct: number }
  energyUsageToday: { kwh: number; deltaKwh: number }
  activeAlerts: { critical: number; lastHour: number }
}

function Sparkline({ data, accent }: { data: number[]; accent: string }) {
  const w = 80
  const h = 24
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StatsCards() {
  const { data, loading, error } = useApi<OverviewStats>('/api/stats/overview', {
    refetchInterval: 30000,
  })

  if (loading && !data) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 h-28 animate-pulse" />
        ))}
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Failed to load stats: {error}
      </section>
    )
  }

  if (!data) return null

  const stats = [
    {
      label: 'Connected Devices',
      value: String(data.connectedDevices.count),
      unit: `/ ${data.connectedDevices.total} paired`,
      delta: {
        value: `${data.connectedDevices.offline} offline`,
        trend: 'down' as const,
        positive: false,
      },
      spark: [8, 10, 9, 11, 12, 11, 12],
      icon: Smartphone,
      accent: 'text-emerald-500',
    },
    {
      label: 'Voice Commands Today',
      value: String(data.voiceCommandsToday.count),
      delta: {
        value: `${data.voiceCommandsToday.deltaPct >= 0 ? '+' : ''}${data.voiceCommandsToday.deltaPct}% vs yesterday`,
        trend: (data.voiceCommandsToday.deltaPct >= 0 ? 'up' : 'down') as 'up' | 'down',
        positive: data.voiceCommandsToday.deltaPct >= 0,
      },
      spark: [120, 180, 210, 240, 230, 247, 247],
      icon: Mic,
      accent: 'text-accent',
    },
    {
      label: 'Energy Usage',
      value: data.energyUsageToday.kwh.toFixed(1),
      unit: 'kWh',
      delta: {
        value: `${data.energyUsageToday.deltaKwh >= 0 ? '+' : ''}${data.energyUsageToday.deltaKwh.toFixed(1)} kWh`,
        trend: (data.energyUsageToday.deltaKwh > 0 ? 'up' : 'down') as 'up' | 'down',
        positive: data.energyUsageToday.deltaKwh <= 0,
      },
      spark: [5.1, 4.8, 4.6, 4.9, 4.4, 4.3, 4.2],
      icon: Zap,
      accent: 'text-amber-500',
    },
    {
      label: 'Active Alerts',
      value: String(data.activeAlerts.critical),
      unit: 'critical',
      delta: {
        value: `${data.activeAlerts.lastHour > 0 ? '+' : ''}${data.activeAlerts.lastHour} in last hour`,
        trend: data.activeAlerts.lastHour > 0 ? ('up' as const) : ('down' as const),
        positive: false,
      },
      spark: [0, 1, 1, 0, 1, 2, 2],
      icon: ShieldAlert,
      accent: 'text-destructive',
    },
  ]

  return (
    <section aria-labelledby="stats-heading" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <h2 id="stats-heading" className="sr-only">Key statistics</h2>
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <article key={s.label} className="rounded-lg border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">{s.value}</span>
                  {s.unit && <span className="text-xs text-muted-foreground">{s.unit}</span>}
                </div>
              </div>
              <div className={cn('shrink-0 w-9 h-9 rounded-md bg-muted/50 flex items-center justify-center', s.accent)} aria-hidden="true">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className={cn('flex items-center gap-1 text-[11px]', s.delta.positive ? 'text-emerald-500' : 'text-muted-foreground')}>
                {s.delta.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{s.delta.value}</span>
              </div>
              <div className={s.accent}>
                <Sparkline data={s.spark} accent={s.accent} />
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
"""
(ROOT / "src/components/dashboard/stats-cards.tsx").write_text(stats_full)
commit(
    "feat(dashboard): wire stats cards to /api/stats/overview\n\n- Replaces hardcoded KPI numbers with live API data\n- 30-second polling for near-real-time updates\n- Loading skeleton (4 pulsing cards) while fetching\n- Error state with destructive styling\n- Sparkline data is still static (will be wired later)\n- Delta vs yesterday computed server-side",
    ["src/components/dashboard/stats-cards.tsx"],
)

# 3. Update device monitoring to fetch from /api/devices
device_full = """'use client'

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
"""
(ROOT / "src/components/dashboard/device-monitoring.tsx").write_text(device_full)
commit(
    "feat(dashboard): wire device monitoring to /api/devices\n\n- Replaces hardcoded device array with live API data\n- 15-second polling for status updates\n- Refresh button triggers immediate refetch with spin animation\n- timeAgo() helper for human-readable last-seen timestamps\n- Loading skeleton grid (6 pulsing cards)\n- Error state inline\n- Type strings updated to match Prisma enums (ONLINE, IDLE, etc.)",
    ["src/components/dashboard/device-monitoring.tsx"],
)

# 4. Update voice interaction to fetch from /api/voice/commands
voice_full = """'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Volume2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

type Command = {
  id: string
  transcript: string
  intent: string
  confidence: number
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  issuedAt: string
  device: { name: string; deviceId: string }
}

type VoiceStats = {
  todayCount: number
  avgConfidence: number
  successRate: number
  dailyCounts: { date: string; count: number }[]
}

function statusBadge(s: Command['status']) {
  switch (s) {
    case 'SUCCESS':
      return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Recognized' }
    case 'PARTIAL':
      return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Partial' }
    case 'FAILED':
      return { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' }
  }
}

function Waveform() {
  const [bars, setBars] = useState<number[]>(Array.from({ length: 48 }, () => Math.random()))

  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) =>
        prev.map((_, i) => {
          const t = Date.now() / 200 + i * 0.4
          const base = (Math.sin(t) + 1) / 2
          const noise = Math.random() * 0.4
          return Math.max(0.15, Math.min(1, base * 0.6 + noise))
        })
      )
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center justify-center gap-[2px] h-20" role="img" aria-label="Live voice waveform — listening">
      {bars.map((h, i) => (
        <div key={i} className="w-[3px] rounded-full bg-accent transition-[height] duration-100 ease-out" style={{ height: `${Math.max(8, h * 100)}%` }} aria-hidden="true" />
      ))}
    </div>
  )
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function VoiceInteraction() {
  const [listening, setListening] = useState(true)
  const { data: cmdData, loading } = useApi<{ commands: Command[] }>('/api/voice/commands?limit=20', {
    refetchInterval: 10000,
  })
  const { data: statsData } = useApi<VoiceStats>('/api/voice/stats', {
    refetchInterval: 30000,
  })

  const commands = cmdData?.commands ?? []
  const todayCount = statsData?.todayCount ?? 0
  const avgConfidence = statsData?.avgConfidence ?? 0
  const successRate = statsData?.successRate ?? 0

  return (
    <section aria-labelledby="voice-heading" className="rounded-lg border border-border bg-card flex flex-col">
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="voice-heading" className="text-sm font-semibold tracking-tight">Voice Interaction</h2>
            <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium', listening ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', listening ? 'bg-emerald-500 live-dot' : 'bg-muted-foreground')} aria-hidden="true" />
              {listening ? 'Listening' : 'Paused'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Wake word "Aria" active · {todayCount} commands today</p>
        </div>
        <button type="button" onClick={() => setListening((v) => !v)} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs transition-colors', listening ? 'hover:bg-muted' : 'bg-accent text-accent-foreground border-accent hover:bg-accent/90')} aria-pressed={listening} aria-label={listening ? 'Pause voice listening' : 'Resume voice listening'}>
          {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{listening ? 'Pause' : 'Resume'}</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
        <div className="bg-card p-4 md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Live Input</span>
            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {listening ? <Waveform /> : <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">Microphone muted — click Resume to continue</div>}
          <div className="mt-2 text-[11px] text-muted-foreground font-mono">16 kHz · 1-channel · VAD active</div>
        </div>
        <div className="bg-card p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg confidence</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{(avgConfidence * 100).toFixed(0)}<span className="text-sm text-muted-foreground">%</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Success rate</span>
              <span className="tabular-nums">{successRate}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${successRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Recent commands</span>
          <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground">View full log →</button>
        </div>
        {loading && commands.length === 0 ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted/40" />)}
          </div>
        ) : (
          <ul className="divide-y divide-border max-h-[320px] overflow-y-auto" role="log" aria-label="Recent voice commands">
            {commands.map((c) => {
              const badge = statusBadge(c.status)
              const StatusIcon = badge.icon
              return (
                <li key={c.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums mt-0.5 shrink-0">{timeStr(c.issuedAt)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">"{c.transcript}"</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-mono">{c.device.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">intent: <code className="font-mono text-foreground/70">{c.intent}</code></span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{(c.confidence * 100).toFixed(0)}% confidence</span>
                      </div>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', badge.bg, badge.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
"""
(ROOT / "src/components/dashboard/voice-interaction.tsx").write_text(voice_full)
commit(
    "feat(dashboard): wire voice interaction to /api/voice/* endpoints\n\n- Fetches recent commands from /api/voice/commands?limit=20 (10s polling)\n- Fetches stats from /api/voice/stats (30s polling)\n- timeStr() formats issuedAt as HH:MM:SS\n- Loading skeleton with 3 pulsing rows\n- Waveform animation unchanged (live state)\n- Stats: avg confidence, success rate with progress bar",
    ["src/components/dashboard/voice-interaction.tsx"],
)

# 5. Update energy usage to fetch from /api/energy
energy_full = """'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { Zap, TrendingDown, Leaf } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

type EnergyData = {
  hourly: { t: string; kw: number }[]
  byDevice: { id: string; name: string; kwh: number; pct: number }[]
  summary: { totalKwh: number; peakKw: number; peakHour: string; estimatedMonthlyCost: number }
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="text-muted-foreground mb-0.5">{label}:00</div>
      <div className="font-mono tabular-nums">{payload[0].value.toFixed(2)} kW</div>
    </div>
  )
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-medium mb-0.5">{p.name}</div>
      <div className="font-mono tabular-nums text-muted-foreground">{p.kwh.toFixed(2)} kWh · {p.pct}%</div>
    </div>
  )
}

export function EnergyUsage() {
  const { data, loading, error } = useApi<EnergyData>('/api/energy?hours=24', {
    refetchInterval: 60000,
  })

  const hourly = data?.hourly ?? []
  const byDevice = data?.byDevice ?? []
  const summary = data?.summary

  return (
    <section aria-labelledby="energy-heading" className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="energy-heading" className="text-sm font-semibold tracking-tight">Energy Usage</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">Last 24h</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Live consumption · auto-refresh every 60s</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500">
          <Leaf className="w-3 h-3" />
          <span className="font-medium">Live</span>
        </div>
      </header>

      {error && <div className="p-4 text-sm text-destructive">Failed to load energy data: {error}</div>}

      <div className="grid grid-cols-3 gap-px bg-border">
        <div className="bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total today</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{summary ? summary.totalKwh.toFixed(2) : '—'}<span className="text-xs text-muted-foreground ml-1">kWh</span></div>
        </div>
        <div className="bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Peak load</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{summary ? summary.peakKw.toFixed(1) : '—'}<span className="text-xs text-muted-foreground ml-1">{summary ? `kW @ ${summary.peakHour}:00` : 'kW'}</span></div>
        </div>
        <div className="bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. monthly cost</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{summary ? summary.estimatedMonthlyCost.toLocaleString() : '—'}<span className="text-xs text-muted-foreground ml-1">₦</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-px bg-border">
        <div className="bg-card p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hourly consumption</h3>
            <div className="flex items-center gap-1 text-[11px] text-emerald-500">
              <TrendingDown className="w-3 h-3" />
              <span>Aggregated across devices</span>
            </div>
          </div>
          <div className="h-[200px] w-full" role="img" aria-label="Hourly energy consumption area chart">
            {loading && hourly.length === 0 ? (
              <div className="h-full w-full animate-pulse rounded bg-muted/40" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.14 70)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="oklch(0.78 0.14 70)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="oklch(0.3 0.005 60)" vertical={false} />
                  <XAxis dataKey="t" stroke="oklch(0.55 0.008 60)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}:00`} />
                  <YAxis stroke="oklch(0.55 0.008 60)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}kW`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'oklch(0.78 0.14 70)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="kw" stroke="oklch(0.78 0.14 70)" strokeWidth={1.75} fill="url(#energyGrad)" dot={false} activeDot={{ r: 3, fill: 'oklch(0.78 0.14 70)', stroke: 'oklch(0.205 0.006 60)', strokeWidth: 1.5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">By device</h3>
            <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="h-[200px] w-full" role="img" aria-label="Energy consumption by device bar chart">
            {loading && byDevice.length === 0 ? (
              <div className="h-full w-full animate-pulse rounded bg-muted/40" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDevice} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={6}>
                  <CartesianGrid strokeDasharray="2 4" stroke="oklch(0.3 0.005 60)" horizontal={false} />
                  <XAxis type="number" stroke="oklch(0.55 0.008 60)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}kWh`} />
                  <YAxis type="category" dataKey="name" stroke="oklch(0.55 0.008 60)" fontSize={10} tickLine={false} axisLine={false} width={110} tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + '…' : v} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'oklch(0.3 0.005 60 / 0.3)' }} />
                  <Bar dataKey="kwh" radius={[0, 3, 3, 0]}>
                    {byDevice.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? 'oklch(0.78 0.14 70)' : i === 1 ? 'oklch(0.7 0.1 165)' : i === 2 ? 'oklch(0.62 0.09 250)' : i === 3 ? 'oklch(0.7 0.15 35)' : 'oklch(0.55 0.05 60)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
"""
(ROOT / "src/components/dashboard/energy-usage.tsx").write_text(energy_full)
commit(
    "feat(dashboard): wire energy usage to /api/energy\n\n- Fetches 24h of hourly consumption data (60s polling)\n- Per-device breakdown with kWh and percentage\n- Summary: totalKwh, peakKw, peakHour, estimatedMonthlyCost (₦)\n- Loading skeletons for both charts\n- Area chart with gradient fill (amber)\n- Bar chart with 5-color earthy palette",
    ["src/components/dashboard/energy-usage.tsx"],
)

# 6. Update security alerts to fetch from /api/security/alerts
security_full = """'use client'

import { useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  Lock,
  Eye,
  Mic,
  Camera,
  Wifi,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

type Severity = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS'

type Alert = {
  id: string
  title: string
  description: string
  severity: Severity
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
  triggeredAt: string
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  device: { name: string; deviceId: string } | null
}

const severityConfig: Record<Severity, { label: string; icon: LucideIcon; accent: string; bg: string; border: string; text: string }> = {
  CRITICAL: { label: 'Critical', icon: XCircle, accent: 'text-destructive', bg: 'bg-destructive/5', border: 'border-l-destructive', text: 'text-destructive' },
  WARNING: { label: 'Warning', icon: AlertTriangle, accent: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-l-amber-500', text: 'text-amber-500' },
  INFO: { label: 'Info', icon: Info, accent: 'text-sky-400', bg: 'bg-sky-400/5', border: 'border-l-sky-400', text: 'text-sky-400' },
  SUCCESS: { label: 'Resolved', icon: CheckCircle2, accent: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-l-emerald-500', text: 'text-emerald-500' },
}

const alertIcon: Record<string, LucideIcon> = {
  'Unrecognized voice profile': Fingerprint,
  'Microphone access blocked': Mic,
  'Unusual location sign-in': Eye,
  'Device firmware out of date': ShieldAlert,
  'New device paired': CheckCircle2,
  'Security scan completed': ShieldCheck,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`
  return `${Math.floor(diff / 86_400_000)} d ago`
}

export function SecurityAlerts() {
  const { data, loading, error, refetch } = useApi<{ alerts: Alert[] }>('/api/security/alerts?limit=20', {
    refetchInterval: 20000,
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const alerts = data?.alerts ?? []
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length

  async function updateAlert(id: string, status: 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED') {
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
  }

  return (
    <section aria-labelledby="security-heading" className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="security-heading" className="text-sm font-semibold tracking-tight">Security Alerts</h2>
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive live-dot" aria-hidden="true" />
                {criticalCount} critical
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Real-time monitoring · Privacy-first</p>
        </div>
        <button type="button" onClick={() => refetch()} className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs">Refresh</button>
      </header>

      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-emerald-500/5">
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-xs text-emerald-500 font-medium">End-to-end encryption active</span>
        <span className="text-[11px] text-muted-foreground ml-auto font-mono">AES-256-GCM · TLS 1.3</span>
      </div>

      {error && <div className="p-4 text-sm text-destructive">Failed to load alerts: {error}</div>}

      {loading && alerts.length === 0 ? (
        <div className="p-4 space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded bg-muted/40" />)}
        </div>
      ) : (
        <ul className="divide-y divide-border max-h-[440px] overflow-y-auto" role="log" aria-label="Security alert feed" aria-live="polite">
          {alerts.map((a) => {
            const cfg = severityConfig[a.severity]
            const Icon = alertIcon[a.title] ?? ShieldAlert
            const SeverityIcon = cfg.icon
            const isActionable = a.status === 'OPEN' && (a.severity === 'CRITICAL' || a.severity === 'WARNING')
            return (
              <li key={a.id} className={cn('px-4 py-3 border-l-2 hover:bg-muted/30 transition-colors', cfg.border)}>
                <div className="flex items-start gap-3">
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', cfg.bg, cfg.accent)} aria-hidden="true">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-snug">{a.title}</h3>
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium shrink-0', cfg.text)}>
                        <SeverityIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{a.description}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-muted-foreground">{a.device?.name ?? 'System-wide'}</span>
                      <span className="text-muted-foreground tabular-nums">{timeAgo(a.triggeredAt)}</span>
                    </div>
                    {a.acknowledgedAt && (
                      <div className="mt-1 text-[10px] text-muted-foreground italic">
                        Acknowledged by {a.acknowledgedBy ?? 'system'} · {timeAgo(a.acknowledgedAt)}
                      </div>
                    )}
                  </div>
                </div>
                {isActionable && (
                  <div className="mt-2 flex items-center gap-2 pl-10">
                    <button
                      type="button"
                      onClick={() => updateAlert(a.id, 'ACKNOWLEDGED')}
                      disabled={updatingId === a.id}
                      className="px-2 py-1 rounded border border-border text-[11px] hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {updatingId === a.id ? 'Updating…' : 'Investigate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAlert(a.id, 'DISMISSED')}
                      disabled={updatingId === a.id}
                      className="px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
"""
(ROOT / "src/components/dashboard/security-alerts.tsx").write_text(security_full)
commit(
    "feat(dashboard): wire security alerts to /api/security/alerts with actions\n\n- Fetches alerts from /api/security/alerts?limit=20 (20s polling)\n- Investigate button PATCHes alert to ACKNOWLEDGED status\n- Dismiss button PATCHes to DISMISSED status\n- Records acknowledgedBy and acknowledgedAt on acknowledge\n- Shows acknowledgment info when present\n- Loading skeleton (4 pulsing rows)\n- Severity-ordered with colored left borders\n- Permission posture grid removed (will be added back as separate component)",
    ["src/components/dashboard/security-alerts.tsx"],
)

print(f"After phase 10: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
