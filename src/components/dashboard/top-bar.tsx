'use client'

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
