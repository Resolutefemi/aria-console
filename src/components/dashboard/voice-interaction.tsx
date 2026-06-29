'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Volume2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

type Command = {
  id: string
  transcript: string
  intent: string
  confidence: number
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  issuedAt: string
  device: { name: string; deviceId: string }
}

type VoiceStats = {
  todayCount: number
  avgConfidence: number
  successRate: number
  dailyCounts: { date: string; count: number }[]
}

function statusBadge(s: Command['status']) {
  switch (s) {
    case 'SUCCESS':
      return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Recognized' }
    case 'PARTIAL':
      return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Partial' }
    case 'FAILED':
      return { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' }
  }
}

function Waveform() {
  const [bars, setBars] = useState<number[]>(Array.from({ length: 48 }, () => Math.random()))

  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) =>
        prev.map((_, i) => {
          const t = Date.now() / 200 + i * 0.4
          const base = (Math.sin(t) + 1) / 2
          const noise = Math.random() * 0.4
          return Math.max(0.15, Math.min(1, base * 0.6 + noise))
        })
      )
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center justify-center gap-[2px] h-20" role="img" aria-label="Live voice waveform — listening">
      {bars.map((h, i) => (
        <div key={i} className="w-[3px] rounded-full bg-accent transition-[height] duration-100 ease-out" style={{ height: `${Math.max(8, h * 100)}%` }} aria-hidden="true" />
      ))}
    </div>
  )
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function VoiceInteraction() {
  const [listening, setListening] = useState(true)
  const { data: cmdData, loading } = useApi<{ commands: Command[] }>('/api/voice/commands?limit=20', {
    refetchInterval: 10000,
  })
  const { data: statsData } = useApi<VoiceStats>('/api/voice/stats', {
    refetchInterval: 30000,
  })

  const commands = cmdData?.commands ?? []
  const todayCount = statsData?.todayCount ?? 0
  const avgConfidence = statsData?.avgConfidence ?? 0
  const successRate = statsData?.successRate ?? 0

  return (
    <section aria-labelledby="voice-heading" className="rounded-lg border border-border bg-card flex flex-col">
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="voice-heading" className="text-sm font-semibold tracking-tight">Voice Interaction</h2>
            <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium', listening ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', listening ? 'bg-emerald-500 live-dot' : 'bg-muted-foreground')} aria-hidden="true" />
              {listening ? 'Listening' : 'Paused'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Wake word "Aria" active · {todayCount} commands today</p>
        </div>
        <button type="button" onClick={() => setListening((v) => !v)} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs transition-colors', listening ? 'hover:bg-muted' : 'bg-accent text-accent-foreground border-accent hover:bg-accent/90')} aria-pressed={listening} aria-label={listening ? 'Pause voice listening' : 'Resume voice listening'}>
          {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{listening ? 'Pause' : 'Resume'}</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
        <div className="bg-card p-4 md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Live Input</span>
            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {listening ? <Waveform /> : <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">Microphone muted — click Resume to continue</div>}
          <div className="mt-2 text-[11px] text-muted-foreground font-mono">16 kHz · 1-channel · VAD active</div>
        </div>
        <div className="bg-card p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg confidence</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{(avgConfidence * 100).toFixed(0)}<span className="text-sm text-muted-foreground">%</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Success rate</span>
              <span className="tabular-nums">{successRate}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${successRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Recent commands</span>
          <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground">View full log →</button>
        </div>
        {loading && commands.length === 0 ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted/40" />)}
          </div>
        ) : (
          <ul className="divide-y divide-border max-h-[320px] overflow-y-auto" role="log" aria-label="Recent voice commands">
            {commands.map((c) => {
              const badge = statusBadge(c.status)
              const StatusIcon = badge.icon
              return (
                <li key={c.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums mt-0.5 shrink-0">{timeStr(c.issuedAt)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">"{c.transcript}"</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-mono">{c.device.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">intent: <code className="font-mono text-foreground/70">{c.intent}</code></span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{(c.confidence * 100).toFixed(0)}% confidence</span>
                      </div>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', badge.bg, badge.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
