'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Smartphone, Clock, MapPin, Globe, Lock, Unlock, Bell, Plus,
  Loader2, RefreshCw, AlertCircle,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth/auth-provider'
import { cn } from '@/lib/utils'

type Activity = {
  screenTime: { package: string; name: string; totalMin: number; sessions: number }[]
  totalScreenTimeMin: number
  lastLocation: { latitude: number; longitude: number; address: string | null; recordedAt: string } | null
  webHistory: { id: string; url: string; title: string | null; visitedAt: string }[]
  apps: { id: string; packageName: string; appName: string; category: string; isBlocked: boolean }[]
  sessionCount: number
}

type Device = {
  id: string
  deviceId: string
  name: string
  status: string
  battery: number
}

function formatMin(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}m`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function DeviceActivity({ device }: { device: Device }) {
  const router = useRouter()
  const { toast } = useToast()
  const { dbUser } = useAuth()
  const [sendingCmd, setSendingCmd] = useState<string | null>(null)

  const { data, loading, error, refetch } = useApi<Activity>(
    `/api/device/report?deviceId=${device.id}`,
    { refetchInterval: 15000 }
  )

  async function sendCommand(type: string, payload?: any) {
    if (!dbUser) {
      toast({ title: 'Sign in required', description: 'You must be signed in to send commands', variant: 'destructive' })
      return
    }
    setSendingCmd(type)
    try {
      const res = await fetch(`/api/device/${device.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload, sentBy: dbUser.id }),
      })
      if (res.ok) {
        toast({ title: `Command sent: ${type.replace(/_/g, ' ').toLowerCase()}` })
      } else {
        toast({ title: 'Failed to send command', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setSendingCmd(null)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight truncate">{device.name}</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              {device.deviceId}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Real-time activity • auto-refresh 15s
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push('/pair')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pair new</span>
          </button>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors"
            aria-label="Refresh activity"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 p-3 border-b border-border bg-muted/20">
        <button
          onClick={() => sendCommand('LOCK_DEVICE')}
          disabled={sendingCmd !== null}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-[11px] font-medium hover:bg-destructive/10 disabled:opacity-50"
        >
          {sendingCmd === 'LOCK_DEVICE' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
          Lock
        </button>
        <button
          onClick={() => sendCommand('UNLOCK_DEVICE')}
          disabled={sendingCmd !== null}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium hover:bg-muted disabled:opacity-50"
        >
          {sendingCmd === 'UNLOCK_DEVICE' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
          Unlock
        </button>
        <button
          onClick={() => sendCommand('RING_DEVICE')}
          disabled={sendingCmd !== null}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium hover:bg-muted disabled:opacity-50"
        >
          {sendingCmd === 'RING_DEVICE' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
          Ring
        </button>
        <button
          onClick={() => sendCommand('REQUEST_LOCATION')}
          disabled={sendingCmd !== null}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium hover:bg-muted disabled:opacity-50"
        >
          {sendingCmd === 'REQUEST_LOCATION' ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
          Locate
        </button>
        <button
          onClick={() => sendCommand('SEND_MESSAGE', { message: 'Time for dinner!' })}
          disabled={sendingCmd !== null}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium hover:bg-muted disabled:opacity-50"
        >
          {sendingCmd === 'SEND_MESSAGE' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
          Message
        </button>
      </div>

      {error && (
        <div className="p-4 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Failed to load activity: {error}
        </div>
      )}

      {loading && !data ? (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Loading activity…</p>
        </div>
      ) : !data ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No activity data yet. Pair a device to see real-time usage.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
          {/* Screen time summary */}
          <div className="bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Screen time (24h)
              </h3>
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {formatMin(data.totalScreenTimeMin)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {data.sessionCount} sessions
            </div>
            {data.screenTime.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {data.screenTime.slice(0, 5).map((app) => (
                  <div key={app.package} className="flex items-center justify-between text-xs">
                    <span className="truncate">{app.name}</span>
                    <span className="text-muted-foreground tabular-nums ml-2">{formatMin(app.totalMin)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                Last location
              </h3>
            </div>
            {data.lastLocation ? (
              <>
                <div className="text-sm font-medium">
                  {data.lastLocation.address ?? 'Unknown address'}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-1">
                  {data.lastLocation.latitude.toFixed(4)}, {data.lastLocation.longitude.toFixed(4)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {timeAgo(data.lastLocation.recordedAt)}
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${data.lastLocation.latitude}&mlon=${data.lastLocation.longitude}#map=15/${data.lastLocation.latitude}/${data.lastLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-accent hover:underline mt-2 inline-block"
                >
                  View on map →
                </a>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">No location data yet</div>
            )}
          </div>

          {/* Web history */}
          <div className="bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                Web history (24h)
              </h3>
            </div>
            {data.webHistory.length > 0 ? (
              <ul className="space-y-1.5 max-h-[180px] overflow-y-auto">
                {data.webHistory.slice(0, 8).map((w) => (
                  <li key={w.id} className="text-xs">
                    <div className="font-medium truncate">{w.title ?? w.url}</div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(w.visitedAt)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">No web history yet</div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
