'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle,
  Ear,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { useSpeechSynthesis } from '@/hooks/use-speech'
import { useWakeWord } from '@/hooks/use-wake-word'
import { parseVoiceCommand, buildVoiceResponse } from '@/lib/voice-commands'
import { useAccessibility } from '@/components/accessibility/accessibility-provider'
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
  const [commands, setCommands] = useState<VoiceCommand[]>([])
  const [muted, setMuted] = useState(false)
  const [autoStartTried, setAutoStartTried] = useState(false)
  const commandsEndRef = useRef<HTMLDivElement>(null)
  const { settings } = useAccessibility()

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

  // Text-to-speech
  const { speak, cancel: cancelSpeech, speaking, isSupported: ttsSupported, voices } = useSpeechSynthesis()

  // Use refs to break the circular dependency between handleCommand and wakeWord
  const wakeWordReturnToListeningRef = useRef<() => void>(() => {})
  const wakeWordStartSpeakingRef = useRef<() => void>(() => {})

  // Handle a voice command — parse, respond, speak
  const handleCommand = useCallback((transcript: string) => {
    const trimmed = transcript.trim()
    if (!trimmed) {
      wakeWordReturnToListeningRef.current()
      return
    }

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
      wakeWordStartSpeakingRef.current()
      speak(response, {
        rate: 1,
        pitch: 1,
        onEnd: () => {
          wakeWordReturnToListeningRef.current()
        },
      })
    } else {
      // If muted, still return to listening
      wakeWordReturnToListeningRef.current()
    }

    // Execute real actions (lock, unlock, ring, locate)
    if (device) {
      const fetchCmd = (type: string, payload?: any) =>
        fetch(`/api/device/${device.id}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, payload, sentBy: 'voice' }),
        }).catch(() => {})

      if (action.type === 'LOCK_DEVICE') fetchCmd('LOCK_DEVICE')
      else if (action.type === 'UNLOCK_DEVICE') fetchCmd('UNLOCK_DEVICE')
      else if (action.type === 'RING_DEVICE') fetchCmd('RING_DEVICE')
      else if (action.type === 'LOCATION') fetchCmd('REQUEST_LOCATION')
    }
  }, [devicesData, activity, alertsData, device, muted, ttsSupported, speak])

  // Wake word hook
  const wakeWord = useWakeWord({
    wakeWord: 'hey aria',
    onCommand: handleCommand,
    onWakeWordDetected: () => {
      // Play a subtle confirmation "Yes?"
      if (!muted && ttsSupported) {
        speak('Yes?', { rate: 1.2, pitch: 1.1 })
      }
    },
    onError: (err) => {
      console.error('Wake word error:', err)
    },
  })

  // Sync refs after wakeWord is created
  useEffect(() => {
    wakeWordReturnToListeningRef.current = wakeWord.returnToListening
    wakeWordStartSpeakingRef.current = wakeWord.startSpeaking
  }, [wakeWord.returnToListening, wakeWord.startSpeaking])

  // Auto-scroll to latest command
  useEffect(() => {
    commandsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [commands])

  // Auto-arm wake word if screen reader mode is on (after first user interaction)
  useEffect(() => {
    if (!settings.screenReaderMode || !wakeWord.isSupported || autoStartTried) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoStartTried(true)
  }, [settings.screenReaderMode, wakeWord.isSupported, autoStartTried])

  function toggleArmed() {
    if (!wakeWord.isSupported) return
    if (wakeWord.state === 'inactive') {
      wakeWord.arm()
    } else {
      wakeWord.disarm()
      cancelSpeech()
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
      wakeWord.startSpeaking()
      speak(commands[0].response, {
        onEnd: () => wakeWord.returnToListening(),
      })
    }
  }

  // Wake word is active when state is anything other than 'inactive'
  const isArmed = wakeWord.state !== 'inactive'
  const isListeningWake = wakeWord.state === 'listening-wake'
  const isHearingCommand = wakeWord.state === 'hearing-command'
  const isProcessing = wakeWord.state === 'processing'
  const isSpeaking = wakeWord.state === 'speaking' || speaking

  const stateLabel = {
    'inactive': 'Off',
    'armed': 'Off',
    'listening-wake': 'Listening for "Hey Aria"',
    'hearing-command': 'Listening for command',
    'processing': 'Processing…',
    'speaking': 'Speaking…',
  }[wakeWord.state] || 'Off'

  const stateColor = {
    'inactive': 'bg-muted-foreground',
    'armed': 'bg-muted-foreground',
    'listening-wake': 'bg-emerald-500',
    'hearing-command': 'bg-accent',
    'processing': 'bg-amber-500',
    'speaking': 'bg-sky-400',
  }[wakeWord.state] || 'bg-muted-foreground'

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
                isArmed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
              )}
            >
              <span
                className={cn('w-1.5 h-1.5 rounded-full', stateColor, isArmed && 'live-dot')}
                aria-hidden="true"
              />
              {stateLabel}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Say &ldquo;Hey Aria&rdquo; then your command — works hands-free after one tap
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
            onClick={toggleArmed}
            disabled={!wakeWord.isSupported}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors',
              isArmed
                ? 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90'
                : 'bg-accent text-accent-foreground border-accent hover:bg-accent/90',
              !wakeWord.isSupported && 'opacity-50 cursor-not-allowed'
            )}
            aria-pressed={isArmed}
            aria-label={isArmed ? 'Stop voice assistant' : 'Start voice assistant — enables Hey Aria wake word'}
          >
            {isArmed ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isArmed ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </header>

      {/* Live status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
        <div className="bg-card p-4 md:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground" aria-live="polite">
              {stateLabel}
            </span>
            {isSpeaking && (
              <button
                onClick={() => { cancelSpeech(); wakeWord.returnToListening() }}
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
            {!wakeWord.isSupported ? (
              <div className="text-xs text-muted-foreground text-center px-4">
                <AlertCircle className="w-4 h-4 mx-auto mb-1" />
                Voice recognition requires Chrome, Edge, or Safari.
              </div>
            ) : isListeningWake ? (
              <div className="flex items-center gap-3 w-full px-4">
                <LiveWaveform color="emerald" />
                <span className="text-xs text-muted-foreground truncate">
                  Say &ldquo;Hey Aria&rdquo;…
                </span>
              </div>
            ) : isHearingCommand ? (
              <div className="flex items-center gap-3 w-full px-4">
                <LiveWaveform color="accent" />
                <span className="text-xs text-accent truncate font-medium">
                  {wakeWord.lastTranscript || 'Listening for your command…'}
                </span>
              </div>
            ) : isProcessing ? (
              <div className="flex items-center gap-2 text-amber-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Processing…</span>
              </div>
            ) : isSpeaking ? (
              <div className="flex items-center gap-2 text-sky-400">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="text-xs">Speaking…</span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center px-4">
                <Mic className="w-4 h-4 mx-auto mb-1 opacity-50" />
                Tap &ldquo;Start&rdquo; to enable hands-free voice
              </div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground font-mono">
            Wake word: ✓ · TTS: {ttsSupported ? '✓' : '✗'} · {voices.length} voices
          </div>
        </div>
        <div className="bg-card p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Try saying
            </div>
            <ul className="mt-1.5 space-y-1.5 text-[11px] text-muted-foreground">
              <li><span className="text-accent font-medium">&ldquo;Hey Aria,&rdquo;</span> what&apos;s happening?</li>
              <li><span className="text-accent font-medium">&ldquo;Hey Aria,&rdquo;</span> where is my device?</li>
              <li><span className="text-accent font-medium">&ldquo;Hey Aria,&rdquo;</span> screen time?</li>
              <li><span className="text-accent font-medium">&ldquo;Hey Aria,&rdquo;</span> any alerts?</li>
              <li><span className="text-accent font-medium">&ldquo;Hey Aria,&rdquo;</span> lock the device</li>
              <li><span className="text-accent font-medium">&ldquo;Hey Aria,&rdquo;</span> ring my phone</li>
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

      {/* Conversation log */}
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
            No voice commands yet. Tap &ldquo;Start&rdquo; and say &ldquo;Hey Aria&rdquo;.
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

      {/* Screen reader hint */}
      {settings.screenReaderMode && !isArmed && wakeWord.isSupported && (
        <div className="border-t border-border p-3 bg-accent/5">
          <div className="flex items-center gap-2 text-[11px] text-accent">
            <Ear className="w-3.5 h-3.5" />
            <span>Screen reader mode detected. Tap &ldquo;Start&rdquo; to enable hands-free voice control with &ldquo;Hey Aria&rdquo;.</span>
          </div>
        </div>
      )}
    </section>
  )
}

function LiveWaveform({ color }: { color: 'emerald' | 'accent' }) {
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

  const colorClass = color === 'emerald' ? 'bg-emerald-500' : 'bg-accent'

  return (
    <div className="flex items-center justify-center gap-[2px] h-12" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className={cn('w-[3px] rounded-full transition-[height] duration-100 ease-out', colorClass)}
          style={{ height: `${Math.max(8, h * 100)}%` }}
        />
      ))}
    </div>
  )
}
