'use client'

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
