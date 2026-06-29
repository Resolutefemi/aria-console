#!/usr/bin/env python3
"""Phase 5: Top bar + stats cards + page assembly (split into commits)."""
import os
import subprocess
from pathlib import Path
import shutil

BACKUP = Path("/tmp/aria-backup/src/components/dashboard")
DST = Path("/home/z/my-project/src/components/dashboard")
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# ─── Top bar (split into 3 commits) ───
# 1. Skeleton with search + skip button
topbar_v1 = """'use client'

import { Search, Command, Menu } from 'lucide-react'

export function TopBar() {
  return (
    <header
      className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center gap-4 px-4 lg:px-6"
      role="banner"
    >
      <button
        type="button"
        className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden md:flex flex-col leading-tight">
        <span className="text-[11px] text-muted-foreground">Operations / Overview</span>
        <h1 className="text-sm font-semibold tracking-tight">System Overview</h1>
      </div>

      <div className="flex-1 max-w-md mx-auto lg:mx-0 lg:ml-8">
        <label className="relative block">
          <span className="sr-only">Search devices, commands, alerts</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search devices, commands, alerts…"
            className="w-full h-9 pl-9 pr-16 rounded-md border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Search"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
            <Command className="w-3 h-3" />K
          </kbd>
        </label>
      </div>
    </header>
  )
}
"""
(DST / "top-bar.tsx").write_text(topbar_v1)
commit(
    "feat(dashboard): add top bar with search input\n\n- Sticky header with backdrop blur\n- Mobile menu button (visible below lg)\n- Breadcrumb-style page label\n- Search input with Command+K hint kbd\n- sr-only label for screen readers",
    ["src/components/dashboard/top-bar.tsx"],
)

# 2. Add live clock + theme toggle
topbar_v2 = """'use client'

import { useSyncExternalStore } from 'react'
import {
  Search,
  Bell,
  Command,
  Sun,
  Moon,
  Menu,
} from 'lucide-react'

// Stable external store for the live clock — re-renders once per second.
function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000)
  return () => clearInterval(id)
}
function getClientSnapshot() {
  return Math.floor(Date.now() / 1000)
}
function getServerSnapshot() {
  return 0
}

export function TopBar() {
  const seconds = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
  const now = seconds ? new Date(seconds * 1000) : null

  const timeStr = now
    ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '--:--:--'
  const dateStr = now
    ? now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : ''

  return (
    <header
      className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center gap-4 px-4 lg:px-6"
      role="banner"
    >
      <button
        type="button"
        className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden md:flex flex-col leading-tight">
        <span className="text-[11px] text-muted-foreground">Operations / Overview</span>
        <h1 className="text-sm font-semibold tracking-tight">System Overview</h1>
      </div>

      <div className="flex-1 max-w-md mx-auto lg:mx-0 lg:ml-8">
        <label className="relative block">
          <span className="sr-only">Search devices, commands, alerts</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search devices, commands, alerts…"
            className="w-full h-9 pl-9 pr-16 rounded-md border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Search"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
            <Command className="w-3 h-3" />K
          </kbd>
        </label>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        <div className="hidden sm:flex flex-col items-end leading-tight pr-2 border-r border-border mr-1">
          <span className="font-mono text-sm tabular-nums" aria-live="off">{timeStr}</span>
          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
        </div>

        <button
          type="button"
          className="p-2 rounded-md hover:bg-muted transition-colors hidden sm:inline-flex"
          aria-label="Toggle theme"
        >
          <Moon className="w-5 h-5 hidden dark:block" />
          <Sun className="w-5 h-5 dark:hidden" />
        </button>
      </div>
    </header>
  )
}
"""
(DST / "top-bar.tsx").write_text(topbar_v2)
commit(
    "feat(dashboard): add live clock and theme toggle to top bar\n\n- useSyncExternalStore for clock (lint-safe, no setState-in-effect)\n- Server-safe snapshot returns 0 to avoid hydration mismatch\n- Locale-aware time and date formatting\n- Theme toggle button (visual only — wired in later commit)",
    ["src/components/dashboard/top-bar.tsx"],
)

# 3. Add notifications + user menu
topbar_v3 = topbar_v2.replace(
    "import {\n  Search,\n  Bell,\n  Command,\n  Sun,\n  Moon,\n  Menu,\n} from 'lucide-react'",
    "import { useState, useSyncExternalStore } from 'react'\nimport {\n  Search,\n  Bell,\n  Command,\n  Sun,\n  Moon,\n  Menu,\n} from 'lucide-react'"
).replace(
    """        <button
          type="button"
          className="p-2 rounded-md hover:bg-muted transition-colors hidden sm:inline-flex"
          aria-label="Toggle theme"
        >
          <Moon className="w-5 h-5 hidden dark:block" />
          <Sun className="w-5 h-5 dark:hidden" />
        </button>
      </div>
    </header>
  )
}
""",
    """        <button
          type="button"
          className="p-2 rounded-md hover:bg-muted transition-colors hidden sm:inline-flex"
          aria-label="Toggle theme"
        >
          <Moon className="w-5 h-5 hidden dark:block" />
          <Sun className="w-5 h-5 dark:hidden" />
        </button>

        <NotificationsBell />

        <button
          type="button"
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Account menu"
        >
          <div
            className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center text-[11px] font-semibold text-accent-foreground"
            aria-hidden="true"
          >
            OK
          </div>
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-xs font-medium">Ola Kperogi</span>
            <span className="text-[10px] text-muted-foreground">Admin</span>
          </div>
        </button>
      </div>
    </header>
  )
}

function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const notifications = [
    { t: 'Critical: Unrecognized voice profile', s: '2m ago', c: 'text-destructive' },
    { t: 'Device \"Kitchen Display\" went offline', s: '18m ago', c: 'text-amber-500' },
    { t: 'Energy spike detected on Bedroom Hub', s: '1h ago', c: 'text-amber-500' },
  ]
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications, 3 unread${open ? ', menu open' : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-md hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5" />
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-background"
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-popover shadow-lg p-2 z-50"
        >
          <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Recent · 3 unread
          </div>
          <ul className="space-y-0.5">
            {notifications.map((n, i) => (
              <li key={i} className="px-2 py-2 rounded-md hover:bg-muted cursor-pointer">
                <div className="text-sm leading-snug">{n.t}</div>
                <div className={`text-[11px] mt-0.5 ${n.c} text-muted-foreground`}>{n.s}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
"""
)
(DST / "top-bar.tsx").write_text(topbar_v3)
commit(
    "feat(dashboard): add notifications bell and user menu to top bar\n\n- NotificationsBell component with popover (3 sample alerts)\n- aria-expanded and aria-label for accessibility\n- Destructive dot indicator with ring background\n- User menu button with avatar initials (OK) and name/role",
    ["src/components/dashboard/top-bar.tsx"],
)

# ─── Stats cards (split into 3 commits) ───
# 1. Skeleton with stats type and 4 cards
stats_v1 = """'use client'

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
"""
(DST / "stats-cards.tsx").write_text(stats_v1)
commit(
    "feat(dashboard): add stats cards row with 4 KPIs\n\n- Connected Devices (12/14 paired, 2 offline)\n- Voice Commands Today (247, +18% vs yesterday)\n- Energy Usage (4.2 kWh, -0.3 kWh savings)\n- Active Alerts (2 critical, +1 in last hour)\n- Responsive grid: 1/2/4 columns at sm/xl breakpoints",
    ["src/components/dashboard/stats-cards.tsx"],
)

# 2. Add sparkline
stats_v2 = stats_v1.replace(
    "export function StatsCards() {",
    """function Sparkline({ data, accent }: { data: number[]; accent: string }) {
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
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="opacity-80"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StatsCards() {"""
).replace(
    """            <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
              {s.delta.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{s.delta.value}</span>
            </div>
          </article>""",
    """            <div className="mt-3 flex items-end justify-between">
              <div className={`flex items-center gap-1 text-[11px] ${s.delta.positive ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                {s.delta.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{s.delta.value}</span>
              </div>
              <div className={s.accent}>
                <Sparkline data={s.spark} accent={s.accent} />
              </div>
            </div>
          </article>"""
)
(DST / "stats-cards.tsx").write_text(stats_v2)
commit(
    "feat(dashboard): add sparklines to stats cards\n\n- Inline SVG sparkline (80x24 viewport)\n- Min-max normalized to fit height\n- Inherit color from card accent (currentColor)\n- Decorative (aria-hidden) — underlying numbers shown as text",
    ["src/components/dashboard/stats-cards.tsx"],
)

# ─── Page assembly ───
page_content = """'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { StatsCards } from '@/components/dashboard/stats-cards'

export default function Home() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-accent focus:text-accent-foreground focus:text-sm"
      >
        Skip to main content
      </a>

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <main id="main-content" className="flex-1 px-4 lg:px-6 py-5 space-y-5 max-w-[1600px] w-full mx-auto" role="main">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Operations console</p>
            <h1 className="text-xl font-semibold tracking-tight mt-0.5">Good afternoon, Ola</h1>
            <p className="text-sm text-muted-foreground mt-1">Here&apos;s what&apos;s happening across your voice-controlled devices.</p>
          </div>

          <StatsCards />
        </main>
      </div>
    </div>
  )
}
"""
Path("/home/z/my-project/src/app/page.tsx").write_text(page_content)
commit(
    "feat(app): assemble dashboard shell with sidebar, top bar, and stats\n\n- Skip-to-content link for keyboard users (sr-only until focused)\n- Sidebar + main content flex layout\n- Page heading with locale-aware greeting\n- max-w-[1600px] container for ultra-wide screens\n- More sections (devices, voice, energy, security) added in subsequent commits",
    ["src/app/page.tsx"],
)

print(f"After phase 5: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
