'use client'

import { useState } from 'react'
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
      <nav className="flex-1 px-3 py-4" aria-label="Main">
        <p className="text-[11px] text-muted-foreground">Sidebar skeleton — content added in subsequent commits</p>
      </nav>
    </aside>
  )
}
