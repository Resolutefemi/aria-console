'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeTone?: 'default' | 'critical'
}

export function Sidebar() {
  const [active, setActive] = useState('overview')
  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0"
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-16 px-5 border-b border-border">
        <div
          className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-sm"
          aria-hidden="true"
        >
          <span className="font-mono text-sm font-bold text-accent-foreground">A</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Aria Console</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">v 4.2.1</span>
        </div>
      </div>

      {/* Workspace switcher */}
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

      <nav className="flex-1 px-3 py-4" aria-label="Main">
        <p className="text-[11px] text-muted-foreground">Nav items added in next commit</p>
      </nav>
    </aside>
  )
}
