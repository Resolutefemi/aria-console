'use client'

import { useState } from 'react'
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
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'
import { toCsv, downloadCsv, fileTimestamp } from '@/lib/csv'

type Severity = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS'

type Alert = {
  id: string
  title: string
  description: string
  severity: Severity
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
  triggeredAt: string
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  device: { name: string; deviceId: string } | null
}

const severityConfig: Record<Severity, { label: string; icon: LucideIcon; accent: string; bg: string; border: string; text: string }> = {
  CRITICAL: { label: 'Critical', icon: XCircle, accent: 'text-destructive', bg: 'bg-destructive/5', border: 'border-l-destructive', text: 'text-destructive' },
  WARNING: { label: 'Warning', icon: AlertTriangle, accent: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-l-amber-500', text: 'text-amber-500' },
  INFO: { label: 'Info', icon: Info, accent: 'text-sky-400', bg: 'bg-sky-400/5', border: 'border-l-sky-400', text: 'text-sky-400' },
  SUCCESS: { label: 'Resolved', icon: CheckCircle2, accent: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-l-emerald-500', text: 'text-emerald-500' },
}

const alertIcon: Record<string, LucideIcon> = {
  'Unrecognized voice profile': Fingerprint,
  'Microphone access blocked': Mic,
  'Unusual location sign-in': Eye,
  'Device firmware out of date': ShieldAlert,
  'New device paired': CheckCircle2,
  'Security scan completed': ShieldCheck,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`
  return `${Math.floor(diff / 86_400_000)} d ago`
}

export function SecurityAlerts() {
  const { data, loading, error, refetch } = useApi<{ alerts: Alert[] }>('/api/security/alerts?limit=20', {
    refetchInterval: 20000,
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const alerts = data?.alerts ?? []
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length

  async function updateAlert(id: string, status: 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED') {
    setUpdatingId(id)
    try {
      await fetch(`/api/security/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, acknowledgedBy: 'Ola Kperogi' }),
      })
      // Record in audit log
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: `alert.${status.toLowerCase()}`,
          resource: 'security_alert',
          resourceId: id,
          metadata: { status, by: 'Ola Kperogi' },
        }),
      })
      refetch()
    } catch (e) {
      console.error('Failed to update alert:', e)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section aria-labelledby="security-heading" className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="security-heading" className="text-sm font-semibold tracking-tight">Security Alerts</h2>
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive live-dot" aria-hidden="true" />
                {criticalCount} critical
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Real-time monitoring · Privacy-first</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const csv = toCsv(alerts.map((a) => ({
                title: a.title,
                severity: a.severity,
                status: a.status,
                device: a.device?.name ?? 'System-wide',
                triggeredAt: new Date(a.triggeredAt).toISOString(),
                description: a.description,
              })))
              downloadCsv(`aria-alerts-${fileTimestamp()}.csv`, csv)
            }}
            disabled={alerts.length === 0}
            className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs disabled:opacity-50"
            aria-label="Export alerts as CSV"
          >
            Export
          </button>
          <button type="button" onClick={() => refetch()} className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-xs">Refresh</button>
        </div>
      </header>

      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-emerald-500/5">
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-xs text-emerald-500 font-medium">End-to-end encryption active</span>
        <span className="text-[11px] text-muted-foreground ml-auto font-mono">AES-256-GCM · TLS 1.3</span>
      </div>

      {error && <div className="p-4 text-sm text-destructive">Failed to load alerts: {error}</div>}

      {loading && alerts.length === 0 ? (
        <div className="p-4 space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded bg-muted/40" />)}
        </div>
      ) : (
        <ul className="divide-y divide-border max-h-[440px] overflow-y-auto" role="log" aria-label="Security alert feed" aria-live="polite">
          {alerts.map((a) => {
            const cfg = severityConfig[a.severity]
            const Icon = alertIcon[a.title] ?? ShieldAlert
            const SeverityIcon = cfg.icon
            const isActionable = a.status === 'OPEN' && (a.severity === 'CRITICAL' || a.severity === 'WARNING')
            return (
              <li key={a.id} className={cn('px-4 py-3 border-l-2 hover:bg-muted/30 transition-colors', cfg.border)}>
                <div className="flex items-start gap-3">
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', cfg.bg, cfg.accent)} aria-hidden="true">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-snug">{a.title}</h3>
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium shrink-0', cfg.text)}>
                        <SeverityIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{a.description}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-muted-foreground">{a.device?.name ?? 'System-wide'}</span>
                      <span className="text-muted-foreground tabular-nums">{timeAgo(a.triggeredAt)}</span>
                    </div>
                    {a.acknowledgedAt && (
                      <div className="mt-1 text-[10px] text-muted-foreground italic">
                        Acknowledged by {a.acknowledgedBy ?? 'system'} · {timeAgo(a.acknowledgedAt)}
                      </div>
                    )}
                  </div>
                </div>
                {isActionable && (
                  <div className="mt-2 flex items-center gap-2 pl-10">
                    <button
                      type="button"
                      onClick={() => updateAlert(a.id, 'ACKNOWLEDGED')}
                      disabled={updatingId === a.id}
                      className="px-2 py-1 rounded border border-border text-[11px] hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {updatingId === a.id ? 'Updating…' : 'Investigate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAlert(a.id, 'DISMISSED')}
                      disabled={updatingId === a.id}
                      className="px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
