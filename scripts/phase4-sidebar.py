#!/usr/bin/env python3
"""Phase 4: Dashboard shell — sidebar, top bar, stats cards (each split into multiple commits)."""
import os
import subprocess
from pathlib import Path

DST = Path("/home/z/my-project/src/components/dashboard")
DST.mkdir(parents=True, exist_ok=True)
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# ───────────────── Sidebar (5 commits) ─────────────────
# 1. Sidebar skeleton + nav types
(DST / "sidebar.tsx").write_text("""'use client'

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
""")
commit(
    "feat(dashboard): add sidebar skeleton with NavItem type\n\n- Responsive: hidden below lg breakpoint\n- Sticky full-height layout\n- aria-label on aside and nav for screen readers\n- NavItem type supports badge with default/critical tones",
    ["src/components/dashboard/sidebar.tsx"],
)

# 2. Sidebar brand + workspace switcher
sidebar_v2 = """'use client'

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
"""
(DST / "sidebar.tsx").write_text(sidebar_v2)
commit(
    "feat(dashboard): add sidebar brand and workspace switcher\n\n- Aria Console wordmark with version badge\n- Gradient amber logo tile (A monogram)\n- Workspace switcher button with chevron indicator\n- Active workspace: Personal · Home",
    ["src/components/dashboard/sidebar.tsx"],
)

# 3. Sidebar nav items
sidebar_v3 = """'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Smartphone,
  Mic,
  Zap,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeTone?: 'default' | 'critical'
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', icon: Smartphone, badge: '12' },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'security', label: 'Security', icon: ShieldCheck, badge: '2', badgeTone: 'critical' },
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
      </nav>
    </aside>
  )
}
"""
(DST / "sidebar.tsx").write_text(sidebar_v3)
commit(
    "feat(dashboard): add primary nav items to sidebar\n\n- Overview (LayoutDashboard icon)\n- Devices (Smartphone, badge: 12)\n- Voice (Mic)\n- Energy (Zap)\n- Security (ShieldCheck, critical badge: 2)\n- aria-current=\\\"page\\\" on active item for screen readers\n- Critical badge uses destructive color",
    ["src/components/dashboard/sidebar.tsx"],
)

# 4. Sidebar bottom nav
sidebar_v4 = sidebar_v3.replace(
    """        </ul>
      </nav>
    </aside>
  )
}
""",
    """        </ul>

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
    </aside>
  )
}
"""
).replace(
    "import {\n  LayoutDashboard,\n  Smartphone,\n  Mic,\n  Zap,\n  ShieldCheck,\n  ChevronRight,\n} from 'lucide-react'",
    "import {\n  LayoutDashboard,\n  Smartphone,\n  Mic,\n  Zap,\n  ShieldCheck,\n  Settings,\n  HelpCircle,\n  ChevronRight,\n} from 'lucide-react'"
).replace(
    "const navItems: NavItem[] = [",
    "const bottomItems: NavItem[] = [\n  { id: 'settings', label: 'Settings', icon: Settings },\n  { id: 'help', label: 'Help & Docs', icon: HelpCircle },\n]\n\nconst navItems: NavItem[] = ["
)
(DST / "sidebar.tsx").write_text(sidebar_v4)
commit(
    "feat(dashboard): add system nav section to sidebar\n\n- Settings (gear icon)\n- Help & Docs (help-circle icon)\n- Separated from Monitor section with a label divider\n- 24px top margin to separate from primary nav",
    ["src/components/dashboard/sidebar.tsx"],
)

# 5. Sidebar system status footer
sidebar_final = sidebar_v4.replace(
    """        </ul>
      </nav>
    </aside>
  )
}
""",
    """        </ul>
      </nav>

      {/* System status footer */}
      <div className="border-t border-border p-3">
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
"""
)
(DST / "sidebar.tsx").write_text(sidebar_final)
commit(
    "feat(dashboard): add system status footer to sidebar\n\n- Operational status with pulsing emerald dot\n- Uptime counter in monospace\n- Bordered card at bottom of sidebar\n- live-dot animation class for live indicator",
    ["src/components/dashboard/sidebar.tsx"],
)

print(f"After sidebar: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
