'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Bell,
  Command,
  Sun,
  Moon,
  Menu,
  LogOut,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

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

        <NotificationsBell />

        <UserMenu />
      </div>
    </header>
  )
}

function UserMenu() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (loading) {
    return (
      <div className="w-9 h-9 rounded-full bg-muted animate-pulse" aria-label="Loading user" />
    )
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => router.push('/login')}
        className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/90 transition-colors"
      >
        Sign In
      </button>
    )
  }

  // Derive display name and initials from Supabase user
  const name =
    (user.user_metadata?.name as string) ||
    (user.email ? user.email.split('@')[0] : 'User')
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-muted transition-colors"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <div
          className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center text-[11px] font-semibold text-accent-foreground"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-xs font-medium">{name}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{user.email}</span>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg p-1 z-50"
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <div className="text-xs font-medium truncate">{name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); router.push('/login') }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={async () => { setOpen(false); await signOut(); router.push('/login') }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left text-destructive"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const notifications = [
    { t: 'Critical: Unrecognized voice profile', s: '2m ago', c: 'text-destructive' },
    { t: 'Device "Kitchen Display" went offline', s: '18m ago', c: 'text-amber-500' },
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
