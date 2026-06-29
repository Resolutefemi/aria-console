'use client'

import { useState } from 'react'
import { ChevronDown, Accessibility, Users, Gauge, FlaskConical, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

type Principle = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  summary: string
  applied: string[]
}

const principles: Principle[] = [
  {
    id: 'usability',
    icon: Gauge,
    label: 'Usability (Nielsen heuristics)',
    summary:
      'Visibility of system status, user control, consistency, error prevention, recognition over recall.',
    applied: [
      'Live status dots and timestamps make system state visible at all times',
      'Every action button has a clear, reversible counterpart (Pause ↔ Resume, Dismiss ↔ Investigate)',
      'Consistent iconography and color semantics across devices, voice, energy, and security panels',
      'Critical actions (e.g. denied voice command) are surfaced inline with context, not hidden in menus',
    ],
  },
  {
    id: 'ucd',
    icon: Users,
    label: 'User-Centered Design',
    summary:
      'Designed around the operator’s primary tasks: monitor, triage, and act — not the underlying data model.',
    applied: [
      'Top-of-page KPI cards surface the four metrics an operator checks first every morning',
      'Alert feed uses severity-ordered left borders so the eye lands on critical events first',
      'All times shown in the user’s locale; currency in Naira reflects the actual deployment region',
      'Voice command log uses natural-language transcripts first, technical metadata second',
    ],
  },
  {
    id: 'accessibility',
    icon: Accessibility,
    label: 'Accessibility (WCAG 2.1 AA)',
    summary:
      'Keyboard-navigable, screen-reader friendly, sufficient color contrast, reduced-motion safe.',
    applied: [
      'Semantic landmarks: header, nav, main, section, article — all labelled with aria-labelledby',
      'All icon-only buttons carry descriptive aria-labels (e.g. “Refresh device list”)',
      'Color is never the sole carrier of meaning: severity also has text labels and an icon',
      'Focus rings are visible (2px ring with offset); interactive elements meet 44px touch targets',
      'Live regions (aria-live="polite") on alert feed and command log announce new entries',
    ],
  },
  {
    id: 'eval',
    icon: Eye,
    label: 'Evaluation',
    summary:
      'Built for heuristic walkthroughs and task-based usability testing with clear success paths.',
    applied: [
      'Each panel has a single primary CTA so task-completion rates are easy to measure',
      'Command log and alert feed have bounded max-heights so scrolling is predictable',
      'Sparklines and small charts are decorative; underlying numbers are always shown as text',
    ],
  },
  {
    id: 'prototype',
    icon: FlaskConical,
    label: 'Prototyping',
    summary:
      'Interactive high-fidelity prototype with stateful controls (Pause/Resume, notifications, refresh).',
    applied: [
      'Voice waveform animates against a speech-like envelope so the listening state is unambiguous',
      'Notification bell opens a real popover; pause button toggles live state',
      'All cards respond to hover/focus with subtle border and background changes for affordance feedback',
    ],
  },
]

export function DesignPrinciples() {
  const [open, setOpen] = useState(false)

  return (
    <section
      aria-labelledby="principles-heading"
      className="rounded-lg border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="principles-content"
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <h2
              id="principles-heading"
              className="text-sm font-semibold tracking-tight"
            >
              Design notes — applied interface principles
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              How this console implements usability, UCD, accessibility, evaluation, and prototyping standards.
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id="principles-content"
          className="border-t border-border p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
        >
          {principles.map((p) => {
            const Icon = p.icon
            return (
              <article
                key={p.id}
                className="rounded-md border border-border bg-background/40 p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-foreground/80" />
                  </div>
                  <h3 className="text-xs font-semibold">{p.label}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                  {p.summary}
                </p>
                <ul className="space-y-1">
                  {p.applied.map((item, i) => (
                    <li
                      key={i}
                      className="text-[11px] leading-relaxed flex gap-1.5"
                    >
                      <span
                        className="text-accent shrink-0 mt-0.5"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
