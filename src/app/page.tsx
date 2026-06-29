'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { DeviceMonitoring } from '@/components/dashboard/device-monitoring'
import { VoiceInteraction } from '@/components/dashboard/voice-interaction'
import { EnergyUsage } from '@/components/dashboard/energy-usage'
import { SecurityAlerts } from '@/components/dashboard/security-alerts'
import { DesignPrinciples } from '@/components/dashboard/design-principles'
import { PermissionsPosture } from '@/components/dashboard/permissions-posture'
import { ShortcutsDialog } from '@/components/dashboard/shortcuts-dialog'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useAuth } from '@/components/auth/auth-provider'
import { useState } from 'react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const { user, loading } = useAuth()

  const userName = user
    ? (user.user_metadata?.name as string) ||
      (user.email ? user.email.split('@')[0] : 'there')
    : 'there'

  useKeyboardShortcuts([
    { key: '?', shift: true, handler: () => setShortcutsOpen((v) => !v) },
    { key: 'Escape', handler: () => setShortcutsOpen(false) },
  ])

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
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Operations console</p>
              <h1 className="text-xl font-semibold tracking-tight mt-0.5">
                {greeting()}, {loading ? '…' : userName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Here&apos;s what&apos;s happening across your voice-controlled devices.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" aria-hidden="true" />
                Last sync · 14:32:18
              </span>
            </div>
          </div>

          <StatsCards />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <DeviceMonitoring />
            <VoiceInteraction />
          </div>

          <EnergyUsage />

          <SecurityAlerts />

          <PermissionsPosture />

          <DesignPrinciples />

          <footer className="pt-4 pb-2 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-muted-foreground" role="contentinfo">
            <div className="flex items-center gap-3">
              <span className="font-mono">Aria Console v4.2.1</span>
              <span aria-hidden="true">·</span>
              <span>Build 2026.06.29</span>
              <span aria-hidden="true">·</span>
              <span>Region: Lagos (WAT)</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Status</a>
              <a href="#" className="hover:text-foreground transition-colors">Docs</a>
            </div>
          </footer>
        </main>
      </div>

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
