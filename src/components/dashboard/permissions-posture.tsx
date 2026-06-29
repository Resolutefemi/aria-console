'use client'

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
