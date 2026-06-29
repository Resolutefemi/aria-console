'use client'

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
