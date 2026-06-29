'use client'

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
