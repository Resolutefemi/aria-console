'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Smartphone, Wifi, Battery, MapPin, Clock, Globe, Lock, Bell,
  Play, Pause, Send, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Command = {
  id: string
  type: string
  payload: any
  status: string
}

type ReportResponse = {
  screenTime: { package: string; name: string; totalMin: number; sessions: number }[]
  totalScreenTimeMin: number
  lastLocation: { latitude: number; longitude: number; address: string | null; recordedAt: string } | null
  webHistory: { id: string; url: string; title: string | null; visitedAt: string }[]
  apps: { id: string; packageName: string; appName: string; category: string; isBlocked: boolean }[]
  sessionCount: number
}

// Simulated apps on the phone
const SIM_APPS = [
  { packageName: 'com.instagram.android', appName: 'Instagram', category: 'Social' },
  { packageName: 'com.whatsapp', appName: 'WhatsApp', category: 'Social' },
  { packageName: 'com.youtube.app', appName: 'YouTube', category: 'Entertainment' },
  { packageName: 'com.tiktok', appName: 'TikTok', category: 'Entertainment' },
  { packageName: 'com.chrome', appName: 'Chrome', category: 'Utilities' },
  { packageName: 'com.spotify', appName: 'Spotify', category: 'Entertainment' },
  { packageName: 'com.gmail', appName: 'Gmail', category: 'Productivity' },
  { packageName: 'com.maps', appName: 'Maps', category: 'Utilities' },
  { packageName: 'com.games.minecraft', appName: 'Minecraft', category: 'Games' },
  { packageName: 'com.netflix', appName: 'Netflix', category: 'Entertainment' },
]

// Lagos coordinates for simulation
const LAGOS = { lat: 6.5244, lon: 3.3792 }

export default function CompanionPage() {
  const [pairingCode, setPairingCode] = useState('')
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [parentName, setParentName] = useState<string | null>(null)
  const [pairing, setPairing] = useState(false)
  const [activeApp, setActiveApp] = useState<typeof SIM_APPS[0] | null>(null)
  const [sessionStart, setSessionStart] = useState<number | null>(null)
  const [battery, setBattery] = useState(87)
  const [isLocked, setIsLocked] = useState(false)
  const { toast } = useToast()

  // Load persisted device ID
  useEffect(() => {
    const stored = localStorage.getItem('companion_device_id')
    if (stored) {
      setDeviceId(stored)
      const parent = localStorage.getItem('companion_parent_name')
      if (parent) setParentName(parent)
    }
  }, [])

  // Poll for commands every 5 seconds
  useEffect(() => {
    if (!deviceId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/device/commands?deviceId=${deviceId}`)
        if (!res.ok) return
        const { commands } = await res.json()
        for (const cmd of commands as Command[]) {
          await handleCommand(cmd)
        }
      } catch (e) {
        // ignore
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [deviceId])

  // Report heartbeat every 30 seconds
  useEffect(() => {
    if (!deviceId) return
    const interval = setInterval(() => {
      reportHeartbeat()
    }, 30000)
    return () => clearInterval(interval)
  }, [deviceId, battery])

  // Simulate location updates every 2 minutes
  useEffect(() => {
    if (!deviceId) return
    const interval = setInterval(() => {
      reportLocation()
    }, 120000)
    return () => clearInterval(interval)
  }, [deviceId])

  // Drain battery slowly
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery((b) => Math.max(1, b - 1))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  async function handlePairing(e: React.FormEvent) {
    e.preventDefault()
    if (!pairingCode || pairingCode.length !== 6) {
      toast({ title: 'Enter the 6-digit code', variant: 'destructive' })
      return
    }
    setPairing(true)
    try {
      const res = await fetch('/api/pairing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortCode: pairingCode,
          deviceInfo: {
            name: 'My iPhone (Companion)',
            type: 'PHONE',
            room: 'Personal',
            os: 'iOS 17.4',
            battery,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Pairing failed', description: data.error, variant: 'destructive' })
      } else {
        setDeviceId(data.deviceId)
        setParentName(data.parentName)
        localStorage.setItem('companion_device_id', data.deviceId)
        localStorage.setItem('companion_parent_name', data.parentName)
        toast({ title: 'Paired successfully', description: `Linked to ${data.parentName}'s account` })
        // Send initial app list
        await fetch('/api/device/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: data.deviceId,
            type: 'APP_LIST',
            data: { apps: SIM_APPS },
          }),
        })
        // Send initial location
        await reportLocation(data.deviceId)
      }
    } catch (e) {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setPairing(false)
    }
  }

  async function handleCommand(cmd: Command) {
    toast({ title: `Command received: ${cmd.type.replace(/_/g, ' ')}` })
    let result: any = { executedAt: new Date().toISOString() }

    switch (cmd.type) {
      case 'LOCK_DEVICE':
        setIsLocked(true)
        setActiveApp(null)
        result.locked = true
        break
      case 'UNLOCK_DEVICE':
        setIsLocked(false)
        result.unlocked = true
        break
      case 'RING_DEVICE':
        result.rang = true
        break
      case 'REQUEST_LOCATION':
        await reportLocation()
        result.locationSent = true
        break
      case 'SEND_MESSAGE':
        result.messageShown = cmd.payload?.message ?? ''
        break
    }

    // Report execution
    await fetch('/api/device/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandId: cmd.id,
        status: 'EXECUTED',
        result,
      }),
    })
  }

  async function reportHeartbeat() {
    if (!deviceId) return
    await fetch('/api/device/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        type: 'HEARTBEAT',
        data: { battery, signal: -58, status: isLocked ? 'IDLE' : 'ONLINE' },
      }),
    })
  }

  async function reportLocation(id = deviceId) {
    if (!id) return
    // Simulate slight movement around Lagos
    const lat = LAGOS.lat + (Math.random() - 0.5) * 0.01
    const lon = LAGOS.lon + (Math.random() - 0.5) * 0.01
    await fetch('/api/device/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: id,
        type: 'LOCATION',
        data: {
          latitude: lat,
          longitude: lon,
          accuracy: 15,
          address: 'Lagos, Nigeria',
          battery,
        },
      }),
    })
  }

  function openApp(app: typeof SIM_APPS[0]) {
    if (isLocked) {
      toast({ title: 'Device is locked', description: 'Parent has locked this device', variant: 'destructive' })
      return
    }
    // End previous session
    if (activeApp && sessionStart) {
      reportScreenTime(activeApp, sessionStart)
    }
    setActiveApp(app)
    setSessionStart(Date.now())
  }

  async function closeApp() {
    if (activeApp && sessionStart) {
      await reportScreenTime(activeApp, sessionStart)
    }
    setActiveApp(null)
    setSessionStart(null)
  }

  async function reportScreenTime(app: typeof SIM_APPS[0], start: number) {
    if (!deviceId) return
    const end = Date.now()
    const durationSec = Math.round((end - start) / 1000)
    await fetch('/api/device/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        type: 'SCREEN_TIME',
        data: {
          appPackage: app.packageName,
          appName: app.appName,
          startedAt: new Date(start).toISOString(),
          endedAt: new Date(end).toISOString(),
          durationSec,
        },
      }),
    })
  }

  async function visitWebsite(url: string) {
    if (!deviceId || isLocked) return
    await fetch('/api/device/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        type: 'WEB_HISTORY',
        data: {
          url,
          title: url.replace(/^https?:\/\//, '').split('/')[0],
          category: 'General',
        },
      }),
    })
    toast({ title: 'Visited', description: url })
  }

  function unpair() {
    localStorage.removeItem('companion_device_id')
    localStorage.removeItem('companion_parent_name')
    setDeviceId(null)
    setParentName(null)
    setActiveApp(null)
  }

  // ─── Not paired: show pairing form ────────────────────────
  if (!deviceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-6 justify-center">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-sm">
              <Smartphone className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <div className="text-base font-semibold">Aria Companion</div>
              <div className="text-[11px] text-muted-foreground">Device monitoring app</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h1 className="text-lg font-semibold mb-1">Pair your device</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the 6-digit code from your parent&apos;s dashboard.
            </p>
            <form onSubmit={handlePairing} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={pairing}
                className="w-full h-10 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
              >
                {pairing ? 'Pairing…' : 'Pair Device'}
              </button>
            </form>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-4">
            This simulates the companion app that would run on a child&apos;s phone.
            In production, this would be a native iOS/Android app.
          </p>
        </div>
      </div>
    )
  }

  // ─── Paired: show phone simulator ─────────────────────────
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">Aria Companion</div>
              <div className="text-[10px] text-muted-foreground">Linked to {parentName}&apos;s account</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 rounded border border-border">
              <Battery className={cn('w-3.5 h-3.5', battery <= 20 ? 'text-destructive' : 'text-emerald-500')} />
              <span className="tabular-nums">{battery}%</span>
            </div>
            <button onClick={unpair} className="text-[11px] text-muted-foreground hover:text-foreground">
              Unpair
            </button>
          </div>
        </div>

        {/* Locked state */}
        {isLocked ? (
          <div className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-8 text-center">
            <Lock className="w-12 h-12 mx-auto mb-3 text-destructive" />
            <h2 className="text-lg font-semibold mb-1">Device Locked</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your parent has locked this device. Please contact them.
            </p>
            <button
              onClick={() => setIsLocked(false)}
              className="text-xs text-muted-foreground underline"
            >
              (Simulate unlock for demo)
            </button>
          </div>
        ) : activeApp ? (
          /* Active app view */
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center">
                  <span className="text-xs font-bold">{activeApp.appName[0]}</span>
                </div>
                <div>
                  <div className="text-sm font-medium">{activeApp.appName}</div>
                  <div className="text-[10px] text-muted-foreground">{activeApp.category}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <SessionTimer start={sessionStart ?? Date.now()} />
              </div>
            </div>
            <div className="p-8 min-h-[300px] flex flex-col items-center justify-center">
              <div className="text-4xl mb-3">{activeApp.appName[0]}</div>
              <p className="text-sm text-muted-foreground mb-4">Using {activeApp.appName}</p>
              <p className="text-[11px] text-muted-foreground text-center max-w-[240px]">
                This session is being reported to your parent&apos;s dashboard in real time.
              </p>
            </div>
            <div className="p-3 border-t border-border">
              <button
                onClick={closeApp}
                className="w-full h-9 rounded-md border border-border hover:bg-muted text-sm"
              >
                Close App
              </button>
            </div>
          </div>
        ) : (
          /* Home screen with apps */
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Apps</h2>
            <div className="grid grid-cols-4 gap-3">
              {SIM_APPS.map((app) => (
                <button
                  key={app.packageName}
                  onClick={() => openApp(app)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                    <span className="text-lg font-bold">{app.appName[0]}</span>
                  </div>
                  <span className="text-[10px] text-center truncate w-full">{app.appName}</span>
                </button>
              ))}
            </div>

            <h2 className="text-sm font-semibold mt-6 mb-2">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => visitWebsite('https://www.google.com')}
                className="w-full flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted text-xs"
              >
                <Globe className="w-3.5 h-3.5" />
                Visit google.com
              </button>
              <button
                onClick={() => visitWebsite('https://www.wikipedia.org')}
                className="w-full flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted text-xs"
              >
                <Globe className="w-3.5 h-3.5" />
                Visit wikipedia.org
              </button>
              <button
                onClick={() => reportLocation()}
                className="w-full flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted text-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                Send location now
              </button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Reporting to {parentName}&apos;s dashboard • Heartbeat every 30s • Location every 2min
        </p>
      </div>
    </div>
  )
}

function SessionTimer({ start }: { start: number }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [start])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return (
    <span className="tabular-nums">
      {m}:{s.toString().padStart(2, '0')}
    </span>
  )
}
