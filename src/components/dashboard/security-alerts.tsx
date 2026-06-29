'use client'

import {
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  Lock,
  Eye,
  Mic,
  Camera,
  Wifi,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Severity = 'critical' | 'warning' | 'info' | 'success'

type Alert = {
  id: string
  severity: Severity
  title: string
  description: string
  device: string
  time: string
  icon: LucideIcon
}

const alerts: Alert[] = [
  {
    id: 'a1',
    severity: 'critical',
    title: 'Unrecognized voice profile',
    description:
      'An unregistered voice attempted to issue the command “unlock front door”. Access was denied and the event was logged.',
    device: 'Living Room Speaker',
    time: '2 min ago',
    icon: Fingerprint,
  },
  {
    id: 'a2',
    severity: 'critical',
    title: 'Microphone access blocked',
    description:
      'App “QuickWeather” requested background microphone access. Request auto-denied per privacy policy.',
    device: "Ola's iPhone 15 Pro",
    time: '47 min ago',
    icon: Mic,
  },
  {
    id: 'a3',
    severity: 'warning',
    title: 'Unusual location sign-in',
    description:
      'Aria Cloud account accessed from Lekki, Lagos — a new location. If this wasn’t you, review active sessions.',
    device: 'Aria Cloud',
    time: '1 h ago',
    icon: Eye,
  },
  {
    id: 'a4',
    severity: 'warning',
    title: 'Device firmware out of date',
    description:
      'Bedroom Hub is running firmware 3.8.2 — version 4.0.1 patches CVE-2025-31822. Update recommended.',
    device: 'Bedroom Hub',
    time: '3 h ago',
    icon: ShieldAlert,
  },
  {
    id: 'a5',
    severity: 'info',
    title: 'New device paired',
    description:
      'Galaxy Watch6 was successfully paired to your Aria account. Biometric binding completed.',
    device: 'Galaxy Watch6',
    time: 'Yesterday',
    icon: CheckCircle2,
  },
  {
    id: 'a6',
    severity: 'success',
    title: 'Security scan completed',
    description:
      'Weekly security scan finished. No anomalies detected across 12 devices, 47 permissions, and 3 networks.',
    device: 'All devices',
    time: 'Yesterday',
    icon: ShieldCheck,
  },
]

const severityConfig: Record<
  Severity,
  {
    label: string
    icon: LucideIcon
    accent: string
    bg: string
    border: string
    text: string
  }
> = {
  critical: {
    label: 'Critical',
    icon: XCircle,
    accent: 'text-destructive',
    bg: 'bg-destructive/5',
    border: 'border-l-destructive',
    text: 'text-destructive',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    accent: 'text-amber-500',
    bg: 'bg-amber-500/5',
    border: 'border-l-amber-500',
    text: 'text-amber-500',
  },
  info: {
    label: 'Info',
    icon: Info,
    accent: 'text-sky-400',
    bg: 'bg-sky-400/5',
    border: 'border-l-sky-400',
    text: 'text-sky-400',
  },
  success: {
    label: 'Resolved',
    icon: CheckCircle2,
    accent: 'text-emerald-500',
    bg: 'bg-emerald-500/5',
    border: 'border-l-emerald-500',
    text: 'text-emerald-500',
  },
}

const permissions = [
  { label: 'Microphone', granted: 4, total: 12, icon: Mic },
  { label: 'Camera', granted: 2, total: 12, icon: Camera },
  { label: 'Location', granted: 6, total: 12, icon: Eye },
  { label: 'Network', granted: 11, total: 12, icon: Wifi },
]

export function SecurityAlerts() {
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length

  return (
    <section
      aria-labelledby="security-heading"
      className="rounded-lg border border-border bg-card"
    >
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="security-heading"
              className="text-sm font-semibold tracking-tight"
            >
              Security Alerts
            </h2>
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-destructive live-dot"
                  aria-hidden="true"
                />
                {criticalCount} critical
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Real-time monitoring · Privacy-first
          </p>
        </div>
        <button
          type="button"
          className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs"
        >
          Review all
        </button>
      </header>

      {/* Privacy posture summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-b border-border">
        {permissions.map((p) => {
          const Icon = p.icon
          const pct = Math.round((p.granted / p.total) * 100)
          return (
            <div key={p.label} className="bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {p.label}
                </span>
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums">
                  {p.granted}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  / {p.total} apps
                </span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    pct > 75
                      ? 'bg-amber-500'
                      : pct > 50
                        ? 'bg-accent'
                        : 'bg-emerald-500'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Encryption status banner */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-emerald-500/5">
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-xs text-emerald-500 font-medium">
          End-to-end encryption active
        </span>
        <span className="text-[11px] text-muted-foreground ml-auto font-mono">
          AES-256-GCM · TLS 1.3
        </span>
      </div>

      {/* Alert feed */}
      <ul
        className="divide-y divide-border max-h-[440px] overflow-y-auto"
        role="log"
        aria-label="Security alert feed"
        aria-live="polite"
      >
        {alerts.map((a) => {
          const cfg = severityConfig[a.severity]
          const Icon = a.icon
          const SeverityIcon = cfg.icon
          return (
            <li
              key={a.id}
              className={cn(
                'px-4 py-3 border-l-2 hover:bg-muted/30 transition-colors',
                cfg.border
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                    cfg.bg,
                    cfg.accent
                  )}
                  aria-hidden="true"
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-snug">
                      {a.title}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-medium shrink-0',
                        cfg.text
                      )}
                    >
                      <SeverityIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {a.description}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-muted-foreground">
                      {a.device}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {a.time}
                    </span>
                  </div>
                </div>
              </div>
              {(a.severity === 'critical' || a.severity === 'warning') && (
                <div className="mt-2 flex items-center gap-2 pl-10">
                  <button
                    type="button"
                    className="px-2 py-1 rounded border border-border text-[11px] hover:bg-muted transition-colors"
                  >
                    Investigate
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
