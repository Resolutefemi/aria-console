'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'

type Command = {
  id: string
  time: string
  transcript: string
  device: string
  confidence: number
  status: 'success' | 'partial' | 'failed'
  intent: string
}

function Waveform() {
  const [bars, setBars] = useState(Array.from({ length: 48 }, () => Math.random()))

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
        <div
          key={i}
          className="w-[3px] rounded-full bg-accent transition-[height] duration-100 ease-out"
          style={{ height: `${Math.max(8, h * 100)}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export function VoiceInteraction() {
  return (
    <section aria-labelledby="voice-heading" className="rounded-lg border border-border bg-card flex flex-col">
      <header className="p-4 border-b border-border">
        <h2 id="voice-heading" className="text-sm font-semibold tracking-tight">Voice Interaction</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Waveform and command log added in next commits</p>
      </header>
    </section>
  )
}
