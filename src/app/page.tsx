'use client'

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
