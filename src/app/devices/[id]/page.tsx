'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Smartphone, Battery, Wifi, MapPin, Clock, Globe,
  Lock, Unlock, Bell, MessageSquare, RefreshCw, Loader2,
  Shield, Ban, Timer, Bedtime, Filter, Plus, Trash2, CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { useAuth } from '@/components/auth/auth-provider'
import { useToast } from '@/hooks/use-toast'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'

type Device = {
  id: string
  deviceId: string
  name: string
  type: string
  room: string
  status: string
  battery: number
  signal: number
  ipAddress: string | null
  firmware: string | null
  lastSeenAt: string
  _count?: { screenTimeSessions: number; locationPings: number; webHistory: number; apps: number }
}

type Activity = {
  screenTime: { package: string; name: string; totalMin: number; sessions: number }[]
  totalScreenTimeMin: number
  lastLocation: { latitude: number; longitude: number; address: string | null; recordedAt: string; battery: number | null } | null
  webHistory: { id: string; url: string; title: string | null; category: string | null; visitedAt: string }[]
  apps: { id: string; packageName: string; appName: string; category: string; isBlocked: boolean; dailyLimitMin: number | null }[]
  sessionCount: number
}

type Rule = {
  id: string
  type: string
  config: any
  isActive: boolean
  createdAt: string
}

type Tab = 'overview' | 'apps' | 'screen-time' | 'location' | 'web' | 'rules'

export default function DeviceControlPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const { dbUser } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [sendingCmd, setSendingCmd] = useState<string | null>(null)

  const { data: deviceData, loading: deviceLoading } = useApi<{ device: Device }>(
    `/api/devices/${params.id}`
  )
  const { data: activity, loading: activityLoading, refetch: refetchActivity } = useApi<Activity>(
    `/api/device/report?deviceId=${params.id}`,
    { refetchInterval: 15000 }
  )
  const { data: rulesData, refetch: refetchRules } = useApi<{ rules: Rule[] }>(
    `/api/device/${params.id}/rules`
  )

  const device = deviceData?.device

  async function sendCommand(type: string, payload?: any) {
    if (!dbUser) {
      toast({ title: 'Sign in required', variant: 'destructive' })
      return
    }
    setSendingCmd(type)
    try {
      const res = await fetch(`/api/device/${params.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload, sentBy: dbUser.id }),
      })
      if (res.ok) {
        toast({ title: `Command sent: ${type.replace(/_/g, ' ').toLowerCase()}` })
      } else {
        toast({ title: 'Failed to send command', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setSendingCmd(null)
    }
  }

  async function toggleAppBlock(packageName: string, appName: string, currentlyBlocked: boolean) {
    if (!dbUser) return
    try {
      const res = await fetch(`/api/device/${params.id}/apps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName,
          isBlocked: !currentlyBlocked,
          sentBy: dbUser.id,
        }),
      })
      if (res.ok) {
        toast({
          title: currentlyBlocked ? 'App unblocked' : 'App blocked',
          description: appName,
        })
        refetchActivity()
      }
    } catch {
      toast({ title: 'Failed to update app', variant: 'destructive' })
    }
  }

  async function setAppLimit(packageName: string, appName: string, limitMin: number) {
    if (!dbUser) return
    try {
      const res = await fetch(`/api/device/${params.id}/apps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName,
          dailyLimitMin: limitMin,
        }),
      })
      if (res.ok) {
        toast({
          title: 'Time limit set',
          description: `${appName}: ${limitMin} min/day`,
        })
        refetchActivity()
      }
    } catch {
      toast({ title: 'Failed to set limit', variant: 'destructive' })
    }
  }

  if (deviceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold mb-2">Device not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This device doesn&apos;t exist or isn&apos;t paired to your account.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Overview', icon: Smartphone },
    { id: 'apps', label: 'Apps', icon: Shield },
    { id: 'screen-time', label: 'Screen Time', icon: Clock },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'web', label: 'Web History', icon: Globe },
    { id: 'rules', label: 'Rules', icon: Filter },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">{device.name}</h1>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">{device.deviceId}</span>
                  <span>·</span>
                  <span className={cn(
                    'inline-flex items-center gap-1',
                    device.status === 'ONLINE' && 'text-emerald-500',
                    device.status === 'OFFLINE' && 'text-muted-foreground',
                    device.status === 'IDLE' && 'text-amber-500',
                    device.status === 'CHARGING' && 'text-sky-400',
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      device.status === 'ONLINE' && 'bg-emerald-500 live-dot',
                      device.status === 'OFFLINE' && 'bg-zinc-500',
                      device.status === 'IDLE' && 'bg-amber-500',
                      device.status === 'CHARGING' && 'bg-sky-400',
                    )} />
                    {device.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <ActionButton
              icon={Lock}
              label="Lock"
              tone="destructive"
              loading={sendingCmd === 'LOCK_DEVICE'}
              onClick={() => sendCommand('LOCK_DEVICE')}
            />
            <ActionButton
              icon={Unlock}
              label="Unlock"
              loading={sendingCmd === 'UNLOCK_DEVICE'}
              onClick={() => sendCommand('UNLOCK_DEVICE')}
            />
            <ActionButton
              icon={Bell}
              label="Ring"
              loading={sendingCmd === 'RING_DEVICE'}
              onClick={() => sendCommand('RING_DEVICE')}
            />
            <ActionButton
              icon={MapPin}
              label="Locate"
              loading={sendingCmd === 'REQUEST_LOCATION'}
              onClick={() => sendCommand('REQUEST_LOCATION')}
            />
            <ActionButton
              icon={MessageSquare}
              label="Message"
              loading={sendingCmd === 'SEND_MESSAGE'}
              onClick={() => sendCommand('SEND_MESSAGE', { message: 'Please call me back.' })}
            />
            <button
              onClick={() => { refetchActivity(); refetchRules() }}
              className="ml-auto p-2 rounded-md border border-border hover:bg-muted transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', activityLoading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={activeTab === tab.id}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {activeTab === 'overview' && (
          <OverviewTab device={device} activity={activity} loading={activityLoading} />
        )}
        {activeTab === 'apps' && activity && (
          <AppsTab
            apps={activity.apps}
            onToggleBlock={toggleAppBlock}
            onSetLimit={setAppLimit}
          />
        )}
        {activeTab === 'screen-time' && activity && (
          <ScreenTimeTab activity={activity} />
        )}
        {activeTab === 'location' && activity && (
          <LocationTab activity={activity} />
        )}
        {activeTab === 'web' && activity && (
          <WebHistoryTab history={activity.webHistory} />
        )}
        {activeTab === 'rules' && (
          <RulesTab
            rules={rulesData?.rules ?? []}
            deviceId={params.id}
            dbUserId={dbUser?.id}
            onRefresh={refetchRules}
          />
        )}
      </main>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  tone,
  loading,
  onClick,
}: {
  icon: LucideIcon
  label: string
  tone?: 'destructive'
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-colors disabled:opacity-50',
        tone === 'destructive'
          ? 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10'
          : 'border-border hover:bg-muted'
      )}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}

function OverviewTab({ device, activity, loading }: { device: Device; activity: Activity | null; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Battery} label="Battery" value={`${device.battery}%`} sub={device.status === 'CHARGING' ? 'Charging' : undefined} />
        <StatCard icon={Wifi} label="Signal" value={`${device.signal} dBm`} />
        <StatCard icon={Clock} label="Screen time" value={activity ? `${activity.totalScreenTimeMin}m` : '—'} sub={activity ? `${activity.sessionCount} sessions` : undefined} />
        <StatCard icon={Globe} label="Websites" value={activity ? String(activity.webHistory.length) : '—'} sub="today" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Device info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd className="font-medium">{device.type}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Room</dt><dd className="font-medium">{device.room}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">IP Address</dt><dd className="font-mono text-xs">{device.ipAddress ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Firmware</dt><dd className="font-mono text-xs">{device.firmware ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Last seen</dt><dd className="text-xs">{new Date(device.lastSeenAt).toLocaleString()}</dd></div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Last location</h3>
          {activity?.lastLocation ? (
            <div>
              <div className="text-sm font-medium">{activity.lastLocation.address ?? 'Unknown address'}</div>
              <div className="text-[11px] text-muted-foreground font-mono mt-1">
                {activity.lastLocation.latitude.toFixed(4)}, {activity.lastLocation.longitude.toFixed(4)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {new Date(activity.lastLocation.recordedAt).toLocaleString()}
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${activity.lastLocation.latitude}&mlon=${activity.lastLocation.longitude}#map=15/${activity.lastLocation.latitude}/${activity.lastLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-accent hover:underline mt-2 inline-block"
              >
                View on map →
              </a>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No location data yet</div>
          )}
        </div>
      </div>

      {activity && activity.screenTime.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Top apps today</h3>
          <div className="space-y-2">
            {activity.screenTime.slice(0, 5).map((app) => {
              const pct = activity.totalScreenTimeMin > 0 ? (app.totalMin / activity.totalScreenTimeMin) * 100 : 0
              return (
                <div key={app.package} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">{app.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs">
                      <span className="truncate">{app.name}</span>
                      <span className="text-muted-foreground tabular-nums">{app.totalMin}m</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AppsTab({
  apps,
  onToggleBlock,
  onSetLimit,
}: {
  apps: { id: string; packageName: string; appName: string; category: string; isBlocked: boolean; dailyLimitMin: number | null }[]
  onToggleBlock: (pkg: string, name: string, blocked: boolean) => void
  onSetLimit: (pkg: string, name: string, min: number) => void
}) {
  if (apps.length === 0) {
    return <EmptyState icon={Shield} title="No apps found" description="The companion app hasn't reported any installed apps yet." />
  }

  const categories = Array.from(new Set(apps.map((a) => a.category))).sort()

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-1">App Management</h3>
        <p className="text-[11px] text-muted-foreground mb-3">Block apps or set daily time limits. Changes are sent to the device.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-md bg-muted/30">
            <div className="text-muted-foreground">Total apps</div>
            <div className="text-lg font-semibold">{apps.length}</div>
          </div>
          <div className="p-2 rounded-md bg-muted/30">
            <div className="text-muted-foreground">Blocked</div>
            <div className="text-lg font-semibold text-destructive">{apps.filter((a) => a.isBlocked).length}</div>
          </div>
          <div className="p-2 rounded-md bg-muted/30">
            <div className="text-muted-foreground">With limits</div>
            <div className="text-lg font-semibold text-amber-500">{apps.filter((a) => a.dailyLimitMin !== null).length}</div>
          </div>
          <div className="p-2 rounded-md bg-muted/30">
            <div className="text-muted-foreground">Categories</div>
            <div className="text-lg font-semibold">{categories.length}</div>
          </div>
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{cat}</h4>
          <ul className="divide-y divide-border">
            {apps.filter((a) => a.category === cat).map((app) => (
              <li key={app.id} className="py-2.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold">{app.appName[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{app.appName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{app.packageName}</div>
                </div>
                {app.dailyLimitMin && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono">
                    {app.dailyLimitMin}m
                  </span>
                )}
                <button
                  onClick={() => onToggleBlock(app.packageName, app.appName, app.isBlocked)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                    app.isBlocked
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {app.isBlocked ? <><Ban className="w-3 h-3" /> Blocked</> : <><CheckCircle2 className="w-3 h-3" /> Allowed</>}
                </button>
                <select
                  value={app.dailyLimitMin ?? ''}
                  onChange={(e) => e.target.value && onSetLimit(app.packageName, app.appName, parseInt(e.target.value))}
                  className="h-7 px-1 rounded border border-border bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                  aria-label={`Time limit for ${app.appName}`}
                >
                  <option value="">No limit</option>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function ScreenTimeTab({ activity }: { activity: Activity }) {
  const chartData = activity.screenTime.slice(0, 10).map((a) => ({
    name: a.name.length > 8 ? a.name.slice(0, 7) + '…' : a.name,
    minutes: a.totalMin,
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={Clock} label="Total today" value={`${activity.totalScreenTimeMin}m`} />
        <StatCard icon={Smartphone} label="Sessions" value={String(activity.sessionCount)} />
        <StatCard icon={Shield} label="Apps used" value={String(activity.screenTime.length)} />
      </div>

      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Per-app usage</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 40 }}>
                <defs>
                  <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.14 70)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.78 0.14 70)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="oklch(0.3 0.005 60)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.55 0.008 60)" fontSize={10} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke="oklch(0.55 0.008 60)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.205 0.006 60)',
                    border: '1px solid oklch(0.3 0.006 60)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="minutes" stroke="oklch(0.78 0.14 70)" strokeWidth={1.75} fill="url(#screenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Detailed breakdown</h3>
        <ul className="divide-y divide-border">
          {activity.screenTime.map((app) => (
            <li key={app.package} className="py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold">{app.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{app.name}</div>
                <div className="text-[10px] text-muted-foreground">{app.sessions} session{app.sessions === 1 ? '' : 's'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums">{app.totalMin}m</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function LocationTab({ activity }: { activity: Activity }) {
  if (!activity.lastLocation) {
    return <EmptyState icon={MapPin} title="No location data" description="The companion app hasn't reported any location yet." />
  }

  const loc = activity.lastLocation
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <iframe
          title="Device location map"
          width="100%"
          height="300"
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.longitude - 0.01}%2C${loc.latitude - 0.01}%2C${loc.longitude + 0.01}%2C${loc.latitude + 0.01}&layer=mapnik&marker=${loc.latitude}%2C${loc.longitude}`}
          className="border-0"
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Location details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Address</dt><dd className="font-medium text-right">{loc.address ?? 'Unknown'}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Latitude</dt><dd className="font-mono text-xs">{loc.latitude.toFixed(6)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Longitude</dt><dd className="font-mono text-xs">{loc.longitude.toFixed(6)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Recorded</dt><dd className="text-xs">{new Date(loc.recordedAt).toLocaleString()}</dd></div>
          {loc.battery && <div className="flex justify-between"><dt className="text-muted-foreground">Battery</dt><dd className="font-medium">{loc.battery}%</dd></div>}
        </dl>
      </div>
    </div>
  )
}

function WebHistoryTab({ history }: { history: { id: string; url: string; title: string | null; category: string | null; visitedAt: string }[] }) {
  if (history.length === 0) {
    return <EmptyState icon={Globe} title="No web history" description="No websites have been visited on this device." />
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Web history ({history.length})</h3>
        <p className="text-[11px] text-muted-foreground">Last 24 hours</p>
      </div>
      <ul className="divide-y divide-border max-h-[500px] overflow-y-auto">
        {history.map((w) => (
          <li key={w.id} className="p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              <Globe className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{w.title ?? w.url}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">{w.url}</div>
                <div className="flex items-center gap-2 mt-1">
                  {w.category && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{w.category}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{new Date(w.visitedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RulesTab({
  rules,
  deviceId,
  dbUserId,
  onRefresh,
}: {
  rules: Rule[]
  deviceId: string
  dbUserId?: string
  onRefresh: () => void
}) {
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [newRuleType, setNewRuleType] = useState('SCREEN_TIME_LIMIT')
  const [newRuleConfig, setNewRuleConfig] = useState('')

  async function createRule() {
    if (!dbUserId) return
    try {
      let config: any = {}
      if (newRuleType === 'SCREEN_TIME_LIMIT') {
        config = { limitMin: parseInt(newRuleConfig) || 120 }
      } else if (newRuleType === 'BEDTIME') {
        config = { start: newRuleConfig || '22:00', end: '06:00' }
      } else if (newRuleType === 'CONTENT_FILTER') {
        config = { categories: newRuleConfig.split(',').map((s) => s.trim()) }
      }

      const res = await fetch(`/api/device/${deviceId}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newRuleType, config, createdBy: dbUserId }),
      })
      if (res.ok) {
        toast({ title: 'Rule created' })
        setShowAdd(false)
        setNewRuleConfig('')
        onRefresh()
      }
    } catch {
      toast({ title: 'Failed to create rule', variant: 'destructive' })
    }
  }

  async function deleteRule(ruleId: string) {
    try {
      const res = await fetch(`/api/device/${deviceId}/rules?ruleId=${ruleId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Rule deleted' })
        onRefresh()
      }
    } catch {
      toast({ title: 'Failed to delete rule', variant: 'destructive' })
    }
  }

  const ruleIcons: Record<string, LucideIcon> = {
    APP_BLOCK: Ban,
    APP_TIME_LIMIT: Timer,
    SCREEN_TIME_LIMIT: Clock,
    BEDTIME: Bedtime,
    CONTENT_FILTER: Filter,
    LOCATION_GEOFENCE: MapPin,
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Parental Rules</h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/90"
          >
            <Plus className="w-3 h-3" />
            Add rule
          </button>
        </div>

        {showAdd && (
          <div className="mt-3 p-3 rounded-md border border-border bg-muted/30 space-y-2">
            <select
              value={newRuleType}
              onChange={(e) => setNewRuleType(e.target.value)}
              className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs"
            >
              <option value="SCREEN_TIME_LIMIT">Screen time limit</option>
              <option value="BEDTIME">Bedtime</option>
              <option value="CONTENT_FILTER">Content filter</option>
              <option value="LOCATION_GEOFENCE">Location geofence</option>
            </select>
            {newRuleType === 'SCREEN_TIME_LIMIT' && (
              <input
                type="number"
                value={newRuleConfig}
                onChange={(e) => setNewRuleConfig(e.target.value)}
                placeholder="Minutes per day (e.g. 120)"
                className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs"
              />
            )}
            {newRuleType === 'BEDTIME' && (
              <input
                type="text"
                value={newRuleConfig}
                onChange={(e) => setNewRuleConfig(e.target.value)}
                placeholder="Start time (e.g. 22:00)"
                className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs"
              />
            )}
            {newRuleType === 'CONTENT_FILTER' && (
              <input
                type="text"
                value={newRuleConfig}
                onChange={(e) => setNewRuleConfig(e.target.value)}
                placeholder="Categories to block (e.g. Adult, Social, Games)"
                className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs"
              />
            )}
            <button
              onClick={createRule}
              className="w-full h-8 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/90"
            >
              Create rule
            </button>
          </div>
        )}
      </div>

      {rules.length === 0 ? (
        <EmptyState icon={Filter} title="No rules yet" description="Create a rule to limit screen time, set bedtimes, or filter content." />
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => {
            const Icon = ruleIcons[rule.type] ?? Filter
            return (
              <li key={rule.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{rule.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    {JSON.stringify(rule.config)}
                  </div>
                </div>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 rounded text-destructive hover:bg-destructive/10"
                  aria-label="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border bg-card/50 p-8 text-center">
      <Icon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}
