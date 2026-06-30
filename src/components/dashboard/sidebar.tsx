'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Smartphone,
  Mic,
  Zap,
  ShieldCheck,
  Settings,
  HelpCircle,
  ChevronRight,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeTone?: 'default' | 'critical'
}

const bottomItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Docs', icon: HelpCircle },
]

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'security', label: 'Security', icon: ShieldCheck },
]

export function Sidebar() {
  const [active, setActive] = useState('overview')
  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-sm" aria-hidden="true">
          <span className="font-mono text-sm font-bold text-accent-foreground">A</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Aria Console</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">v 4.2.1</span>
        </div>
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border bg-card hover:bg-accent/5 transition-colors text-left"
          aria-label="Switch workspace"
        >
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</div>
            <div className="text-sm font-medium truncate">Personal · Home</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90 shrink-0" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mb-2">Monitor</div>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActive(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-mono',
                        item.badgeTone === 'critical'
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      )}
                      aria-label={`${item.badge} items`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mb-2 mt-6">System</div>
        <ul className="space-y-0.5">
          {bottomItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* System status footer */}
      <div className="border-t border-border p-3 space-y-2">
        <Link
          href="/download"
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/90 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download Companion App
        </Link>

        <div className="rounded-md border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">System</span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot"
                aria-hidden="true"
              />
              <span className="text-[11px] font-medium">Operational</span>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Uptime 14d 6h 22m
          </div>
        </div>
      </div>
    </aside>
  )
}
