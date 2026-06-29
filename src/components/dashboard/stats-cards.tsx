'use client'

import {
  Smartphone,
  Mic,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

type Stat = {
  label: string
  value: string
  unit?: string
  delta: { value: string; trend: 'up' | 'down'; positive?: boolean }
  spark: number[]
  icon: React.ComponentType<{ className?: string }>
  accent: string
}

const stats: Stat[] = [
  {
    label: 'Connected Devices',
    value: '12',
    unit: '/ 14 paired',
    delta: { value: '2 offline', trend: 'down', positive: false },
    spark: [8, 10, 9, 11, 12, 11, 12],
    icon: Smartphone,
    accent: 'text-emerald-500',
  },
  {
    label: 'Voice Commands Today',
    value: '247',
    delta: { value: '+18% vs yesterday', trend: 'up', positive: true },
    spark: [120, 180, 210, 240, 230, 247, 247],
    icon: Mic,
    accent: 'text-accent',
  },
  {
    label: 'Energy Usage',
    value: '4.2',
    unit: 'kWh',
    delta: { value: '-0.3 kWh', trend: 'down', positive: true },
    spark: [5.1, 4.8, 4.6, 4.9, 4.4, 4.3, 4.2],
    icon: Zap,
    accent: 'text-amber-500',
  },
  {
    label: 'Active Alerts',
    value: '2',
    unit: 'critical',
    delta: { value: '+1 in last hour', trend: 'up', positive: false },
    spark: [0, 1, 1, 0, 1, 2, 2],
    icon: ShieldAlert,
    accent: 'text-destructive',
  },
]

export function StatsCards() {
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
              <div className={`shrink-0 w-9 h-9 rounded-md bg-muted/50 flex items-center justify-center ${s.accent}`} aria-hidden="true">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
              {s.delta.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{s.delta.value}</span>
            </div>
          </article>
        )
      })}
    </section>
  )
}
