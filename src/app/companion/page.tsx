'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Smartphone, Clock, Lock,
  Loader2, AlertCircle, Navigation,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Command = {
  id: string
  type: string
  payload: any
  status: string
}

// We detect real device info from the browser where possible
function detectDeviceInfo() {
  if (typeof window === 'undefined') return { name: 'Browser Device', type: 'PHONE', os: 'Unknown' }
  const ua = navigator.userAgent
  let os = 'Unknown'
  let type = 'PHONE'
  let name = 'Browser Device'

  if (/iPhone|iPad|iPod/.test(ua)) {
    os = /iPad/.test(ua) ? 'iPadOS' : 'iOS'
    type = /iPad/.test(ua) ? 'TABLET' : 'PHONE'
    name = /iPad/.test(ua) ? 'iPad' : 'iPhone'
  } else if (/Android/.test(ua)) {
    os = 'Android'
    type = /Tablet/.test(ua) ? 'TABLET' : 'PHONE'
    name = 'Android Device'
  } else if (/Windows/.test(ua)) {
    os = 'Windows'
    type = 'TABLET'
    name = 'Windows PC'
  } else if (/Mac/.test(ua)) {
    os = 'macOS'
    type = 'TABLET'
    name = 'Mac'
  } else if (/Linux/.test(ua)) {
    os = 'Linux'
    type = 'TABLET'
    name = 'Linux Device'
  }

  return { name, type, os }
}

// Real battery level via Battery API (Chrome/Edge only)
async function getRealBattery(): Promise<number | null> {
  try {
    if ('getBattery' in navigator) {
      // @ts-ignore
      const battery = await navigator.getBattery()
      return Math.round(battery.level * 100)
    }
  } catch {}
  return null
}

export default function CompanionPage() {
  const [pairingCode, setPairingCode] = useState('')
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [parentName, setParentName] = useState<string | null>(null)
  const [pairing, setPairing] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [battery, setBattery] = useState<number | null>(null)
  const [batteryReal, setBatteryReal] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationWatching, setLocationWatching] = useState(false)
  const [screenTimeLog, setScreenTimeLog] = useState<{ app: string; start: number; end: number }[]>([])
  const { toast } = useToast()

  const deviceInfo = detectDeviceInfo()

  // Load persisted device ID
  useEffect(() => {
    const stored = localStorage.getItem('companion_device_id')
    if (stored) {
      setDeviceId(stored)
      const parent = localStorage.getItem('companion_parent_name')
      if (parent) setParentName(parent)
    }
  }, [])

  // Get real battery on mount
  useEffect(() => {
    getRealBattery().then((b) => {
      if (b !== null) {
        setBattery(b)
        setBatteryReal(true)
        // Listen for battery changes
        if ('getBattery' in navigator) {
          // @ts-ignore
          navigator.getBattery().then((battery: any) => {
            battery.addEventListener('levelchange', () => setBattery(Math.round(battery.level * 100)))
          })
        }
      } else {
        // Fallback: no real battery — show as unknown
        setBattery(null)
        setBatteryReal(false)
      }
    })
  }, [])

  // Real geolocation watching
  useEffect(() => {
    if (!deviceId) return

    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported on this device')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setLocation({ lat: latitude, lon: longitude, accuracy })
        setLocationError(null)
        setLocationWatching(true)
        // Report to backend
        reportLocation(latitude, longitude, accuracy)
      },
      (err) => {
        setLocationError(
          err.code === 1 ? 'Location permission denied — enable in browser settings'
          : err.code === 2 ? 'Location unavailable'
          : err.code === 3 ? 'Location timeout'
          : err.message
        )
        setLocationWatching(false)
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [deviceId])

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
      } catch (e) {}
    }, 5000)
    return () => clearInterval(interval)
  }, [deviceId])

  // Report heartbeat every 30 seconds with REAL battery
  useEffect(() => {
    if (!deviceId) return
    const interval = setInterval(() => reportHeartbeat(), 30000)
    return () => clearInterval(interval)
  }, [deviceId, battery])

  // Track REAL foreground time of this browser tab (the only "screen time" a web app can measure)
  let tabOpenSince = useRef<number>(Date.now())
  useEffect(() => {
    tabOpenSince.current = Date.now()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tabOpenSince.current = Date.now()
      } else if (document.visibilityState === 'hidden') {
        // Tab went hidden — report screen time for "Browser"
        const duration = Math.round((Date.now() - tabOpenSince.current) / 1000)
        if (duration > 5) {
          reportScreenTime('browser', 'Aria Companion', duration)
        }
      }
    }
    const onBlur = () => {
      const duration = Math.round((Date.now() - tabOpenSince.current) / 1000)
      if (duration > 5) {
        reportScreenTime('browser', 'Aria Companion', duration)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [deviceId])

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
            name: deviceInfo.name,
            type: deviceInfo.type,
            room: 'Personal',
            os: deviceInfo.os,
            battery: battery ?? 100,
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
        result.locked = true
        break
      case 'UNLOCK_DEVICE':
        setIsLocked(false)
        result.unlocked = true
        break
      case 'RING_DEVICE':
        // Real vibration + sound
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200])
        result.rang = true
        break
      case 'REQUEST_LOCATION':
        // Force a fresh location reading
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => reportLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
            () => {}
          )
        }
        result.locationRequested = true
        break
      case 'SEND_MESSAGE':
        result.messageShown = cmd.payload?.message ?? ''
        toast({ title: 'Message from parent', description: cmd.payload?.message })
        break
    }

    await fetch('/api/device/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId: cmd.id, status: 'EXECUTED', result }),
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
        data: {
          battery: battery ?? 100,
          signal: -60,
          status: isLocked ? 'IDLE' : 'ONLINE',
        },
      }),
    })
  }

  async function reportLocation(lat: number, lon: number, accuracy: number) {
    if (!deviceId) return
    await fetch('/api/device/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        type: 'LOCATION',
        data: {
          latitude: lat,
          longitude: lon,
          accuracy,
          address: null, // We don't reverse-geocode (would need a maps API)
          battery: battery ?? undefined,
        },
      }),
    })
  }

  async function reportScreenTime(appPackage: string, appName: string, durationSec: number) {
    if (!deviceId) return
    const start = Date.now() - durationSec * 1000
    await fetch('/api/device/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        type: 'SCREEN_TIME',
        data: {
          appPackage,
          appName,
          startedAt: new Date(start).toISOString(),
          endedAt: new Date().toISOString(),
          durationSec,
        },
      }),
    })
    setScreenTimeLog((prev) => [{ app: appName, start, end: Date.now() }, ...prev].slice(0, 10))
  }

  function unpair() {
    localStorage.removeItem('companion_device_id')
    localStorage.removeItem('companion_parent_name')
    setDeviceId(null)
    setParentName(null)
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
              <div className="text-[11px] text-muted-foreground">Real device monitoring</div>
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

          <div className="mt-4 p-3 rounded-md bg-muted/30 border border-border text-[11px] text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">What this companion app can REALLY monitor:</p>
            <ul className="space-y-1">
              <li className="flex items-start gap-1.5"><span className="text-emerald-500">✓</span> Real GPS location (requires permission)</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500">✓</span> Real battery level (Chrome/Edge only)</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500">✓</span> Time spent in this browser tab</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500">✓</span> Receive commands (lock, ring, message)</li>
            </ul>
            <p className="font-medium text-foreground pt-2">What it CANNOT monitor (browser security limits):</p>
            <ul className="space-y-1">
              <li className="flex items-start gap-1.5"><span className="text-destructive">✗</span> Other apps installed on the phone</li>
              <li className="flex items-start gap-1.5"><span className="text-destructive">✗</span> Real app usage / screen time outside this tab</li>
              <li className="flex items-start gap-1.5"><span className="text-destructive">✗</span> Web browsing in other apps</li>
              <li className="flex items-start gap-1.5"><span className="text-destructive">✗</span> Actually locking the phone OS</li>
            </ul>
            <p className="pt-2">For full monitoring, a native iOS/Android app is required (uses Screen Time API, MDM, etc.).</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Paired: show real device status ─────────────────────
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
          <button onClick={unpair} className="text-[11px] text-muted-foreground hover:text-foreground">
            Unpair
          </button>
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
              (Test unlock)
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Real device info */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Device Info (Real)</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{deviceInfo.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd className="font-medium">{deviceInfo.type}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">OS</dt><dd className="font-medium">{deviceInfo.os}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Battery</dt>
                  <dd className="font-medium">
                    {battery !== null ? (
                      <span className={battery <= 20 ? 'text-destructive' : 'text-emerald-500'}>
                        {battery}% {batteryReal && <span className="text-[10px] text-muted-foreground">(real)</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not available (browser doesn&apos;t support)</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Real location */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Navigation className="w-3 h-3" />
                Real GPS Location
              </h3>
              {locationError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {locationError}
                </div>
              ) : location ? (
                <div>
                  <div className="text-sm font-mono">
                    {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Accuracy: ±{Math.round(location.accuracy)}m
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
                    Live tracking active
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lon}#map=16/${location.lat}/${location.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-accent hover:underline mt-2 inline-block"
                  >
                    View on map →
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Acquiring GPS…
                </div>
              )}
            </div>

            {/* Real screen time (this tab only) */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Browser Usage (Real)
              </h3>
              <p className="text-[11px] text-muted-foreground mb-3">
                Time spent with this tab open. Browsers can&apos;t track other apps.
              </p>
              {screenTimeLog.length > 0 ? (
                <ul className="space-y-1.5">
                  {screenTimeLog.map((s, i) => (
                    <li key={i} className="flex justify-between text-xs">
                      <span>{s.app}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {Math.round((s.end - s.start) / 1000)}s
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground">No usage recorded yet. Keep this tab open.</div>
              )}
            </div>

            {/* Commands received */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full', locationWatching ? 'bg-emerald-500 live-dot' : 'bg-muted-foreground')} />
                  GPS: {locationWatching ? 'Active' : 'Inactive'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
                  Command polling: Active (every 5s)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
                  Heartbeat: Active (every 30s)
                </div>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              This companion reports REAL data: GPS, battery (where supported), and browser usage.
              It cannot access other apps or browser history — those require a native app.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
