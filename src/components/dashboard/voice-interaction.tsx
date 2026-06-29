'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle, Radio,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { useSpeechRecognition, useSpeechSynthesis } from '@/hooks/use-speech'
import { parseVoiceCommand, buildVoiceResponse } from '@/lib/voice-commands'
import { cn } from '@/lib/utils'

type VoiceCommand = {
  id: string
  time: string
  transcript: string
  response: string
  action: string
  status: 'success' | 'unknown' | 'error'
}

type Activity = {
  screenTime: { package: string; name: string; totalMin: number; sessions: number }[]
  totalScreenTimeMin: number
  lastLocation: { latitude: number; longitude: number; address: string | null; recordedAt: string } | null
  sessionCount: number
}

type Alert = {
  id: string
  title: string
  severity: string
  status: string
}

type Device = {
  id: string
  deviceId: string
  name: string
  status: string
  battery: number
}

function timeStr(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function VoiceInteraction() {
  const [enabled, setEnabled] = useState(false)
  const [commands, setCommands] = useState<VoiceCommand[]>([])
  const [interimTranscript, setInterimTranscript] = useState('')
  const [muted, setMuted] = useState(false)
  const [lastDeviceId, setLastDeviceId] = useState<string | null>(null)
  const commandsEndRef = useRef<HTMLDivElement>(null)

  // Fetch real data for voice responses
  const { data: devicesData } = useApi<{ devices: Device[] }>('/api/devices?paired=true&limit=1', {
    refetchInterval: 30000,
  })
  const device = devicesData?.devices?.[0] ?? null

  const { data: activity } = useApi<Activity>(
    device ? `/api/device/report?deviceId=${device.id}` : null,
    { refetchInterval: 15000 }
  )

  const { data: alertsData } = useApi<{ alerts: Alert[] }>('/api/security/alerts?limit=10', {
    refetchInterval: 20000,
  })

  // Speech recognition
  const { state: recState, transcript, isSupported: recSupported, start, stop, reset } = useSpeechRecognition({
    continuous: false,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        handleVoiceCommand(text)
        setInterimTranscript('')
      } else {
        setInterimTranscript(text)
      }
    },
    onError: (err) => {
      if (err !== 'No speech detected') {
        console.error('Speech recognition error:', err)
      }
    },
  })

  // Text-to-speech
  const { speak, cancel: cancelSpeech, speaking, isSupported: ttsSupported, voices } = useSpeechSynthesis()

  // Auto-scroll to latest command
  useEffect(() => {
    commandsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [commands])

  // Wake word detection — listen for "Aria" when enabled
  useEffect(() => {
    if (!enabled || recState === 'listening') return
    // If not currently listening and enabled, keep listening continuously
    const id = setTimeout(() => {
      if (recState === 'idle' && enabled) {
        start()
      }
    }, 500)
    return () => clearTimeout(id)
  }, [enabled, recState, start])

  const handleVoiceCommand = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const action = parseVoiceCommand(trimmed)
    const data = {
      devices: devicesData?.devices ?? [],
      activity,
      alerts: alertsData?.alerts ?? [],
      stats: null,
    }
    const response = buildVoiceResponse(action, data)

    const command: VoiceCommand = {
      id: `${Date.now()}`,
      time: timeStr(new Date()),
      transcript: trimmed,
      response,
      action: action.type,
      status: action.type === 'UNKNOWN' ? 'unknown' : 'success',
    }
    setCommands((prev) => [command, ...prev].slice(0, 20))

    // Speak the response (unless muted)
    if (!muted && ttsSupported) {
      speak(response, { rate: 1, pitch: 1 })
    }

    // Execute real actions (lock, unlock, ring)
    if (device) {
      if (action.type === 'LOCK_DEVICE') {
        fetch(`/api/device/${device.id}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'LOCK_DEVICE', sentBy: 'voice' }),
        }).catch(() => {})
      } else if (action.type === 'UNLOCK_DEVICE') {
        fetch(`/api/device/${device.id}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'UNLOCK_DEVICE', sentBy: 'voice' }),
        }).catch(() => {})
      } else if (action.type === 'RING_DEVICE') {
        fetch(`/api/device/${device.id}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'RING_DEVICE', sentBy: 'voice' }),
        }).catch(() => {})
      } else if (action.type === 'LOCATION') {
        fetch(`/api/device/${device.id}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'REQUEST_LOCATION', sentBy: 'voice' }),
        }).catch(() => {})
      }
    }
  }, [devicesData, activity, alertsData, device, muted, ttsSupported, speak])

  function toggleListening() {
    if (!recSupported) return
    if (enabled) {
      setEnabled(false)
      stop()
      cancelSpeech()
    } else {
      setEnabled(true)
      reset()
      start()
    }
  }

  function toggleMute() {
    if (!muted) {
      cancelSpeech()
    }
    setMuted(!muted)
  }

  function speakLastResponse() {
    if (commands.length > 0 && ttsSupported) {
      speak(commands[0].response)
    }
  }

  const isListening = recState === 'listening'
  const isProcessing = recState === 'processing' || speaking

  return (
    <section
      aria-labelledby="voice-heading"
      className="rounded-lg border border-border bg-card flex flex-col"
    >
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="voice-heading" className="text-sm font-semibold tracking-tight">
              Voice Assistant
            </h2>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium',
                enabled
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  enabled ? 'bg-emerald-500 live-dot' : 'bg-muted-foreground'
                )}
                aria-hidden="true"
              />
              {enabled ? (isListening ? 'Listening' : 'Active') : 'Off'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Say &ldquo;Aria, what&apos;s happening?&rdquo; or tap the mic to ask
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleMute}
            disabled={!ttsSupported}
            className={cn(
              'p-1.5 rounded-md border border-border transition-colors',
              muted ? 'bg-destructive/10 text-destructive' : 'hover:bg-muted',
              !ttsSupported && 'opacity-50 cursor-not-allowed'
            )}
            aria-label={muted ? 'Unmute voice responses' : 'Mute voice responses'}
            aria-pressed={muted}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={toggleListening}
            disabled={!recSupported}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors',
              enabled
                ? 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90'
                : 'bg-accent text-accent-foreground border-accent hover:bg-accent/90',
              !recSupported && 'opacity-50 cursor-not-allowed'
            )}
            aria-pressed={enabled}
            aria-label={enabled ? 'Stop voice listening' : 'Start voice listening'}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{enabled ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </header>

      {/* Live waveform / status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
        <div className="bg-card p-4 md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {isListening ? 'Listening…' : speaking ? 'Speaking…' : 'Tap mic to ask'}
            </span>
            {speaking && (
              <button
                onClick={() => cancelSpeech()}
                className="text-[10px] text-muted-foreground hover:text-foreground"
                aria-label="Stop speaking"
              >
                Stop
              </button>
            )}
          </div>
          <div
            className="h-20 flex items-center justify-center rounded-md bg-muted/30 border border-border"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isListening ? (
              <div className="flex items-center gap-2">
                <LiveWaveform />
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {interimTranscript || 'Listening…'}
                </span>
              </div>
            ) : speaking ? (
              <div className="flex items-center gap-2 text-accent">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="text-xs">Speaking…</span>
              </div>
            ) : !recSupported ? (
              <div className="text-xs text-muted-foreground text-center px-4">
                <AlertCircle className="w-4 h-4 mx-auto mb-1" />
                Voice recognition not supported in this browser. Use Chrome, Edge, or Safari.
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center px-4">
                <Mic className="w-4 h-4 mx-auto mb-1 opacity-50" />
                Tap &ldquo;Start&rdquo; to enable voice commands
              </div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground font-mono">
            Recognition: {recSupported ? '✓' : '✗'} · TTS: {ttsSupported ? '✓' : '✗'} · {voices.length} voices
          </div>
        </div>
        <div className="bg-card p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Try saying
            </div>
            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              <li>&ldquo;What&apos;s happening?&rdquo;</li>
              <li>&ldquo;Where is my device?&rdquo;</li>
              <li>&ldquo;Screen time?&rdquo;</li>
              <li>&ldquo;Any alerts?&rdquo;</li>
              <li>&ldquo;Lock the device&rdquo;</li>
              <li>&ldquo;Ring my phone&rdquo;</li>
            </ul>
          </div>
          {commands.length > 0 && (
            <button
              onClick={speakLastResponse}
              disabled={!ttsSupported}
              className="text-[11px] text-accent hover:underline disabled:opacity-50"
            >
              ↻ Repeat last response
            </button>
          )}
        </div>
      </div>

      {/* Command log */}
      <div className="border-t border-border">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Conversation ({commands.length})
          </span>
          {commands.length > 0 && (
            <button
              onClick={() => setCommands([])}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        {commands.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No voice commands yet. Tap &ldquo;Start&rdquo; and say something.
          </div>
        ) : (
          <ul
            className="divide-y divide-border max-h-[280px] overflow-y-auto"
            role="log"
            aria-label="Voice command history"
            aria-live="polite"
          >
            {commands.map((c) => (
              <li key={c.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums mt-0.5 shrink-0">
                    {c.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug font-medium">
                      &ldquo;{c.transcript}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      <Volume2 className="w-3 h-3 inline mr-1" />
                      {c.response}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
                      c.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : c.status === 'unknown'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-destructive/10 text-destructive'
                    )}
                  >
                    {c.action}
                  </span>
                </div>
              </li>
            ))}
            <div ref={commandsEndRef} />
          </ul>
        )}
      </div>
    </section>
  )
}

function LiveWaveform() {
  const [bars, setBars] = useState<number[]>(Array.from({ length: 32 }, () => Math.random()))

  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) =>
        prev.map((_, i) => {
          const t = Date.now() / 150 + i * 0.5
          const base = (Math.sin(t) + 1) / 2
          const noise = Math.random() * 0.5
          return Math.max(0.15, Math.min(1, base * 0.6 + noise))
        })
      )
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center justify-center gap-[2px] h-12" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-accent transition-[height] duration-100 ease-out"
          style={{ height: `${Math.max(8, h * 100)}%` }}
        />
      ))}
    </div>
  )
}
