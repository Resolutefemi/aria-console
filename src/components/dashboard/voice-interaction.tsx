'use client'

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
