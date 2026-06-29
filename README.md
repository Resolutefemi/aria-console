# Aria Console

Operations dashboard for a voice-controlled smartphone system. Monitor devices, voice interactions, energy usage, and security alerts from a single web interface designed for both quick triage and deep investigation.

![Aria Console](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-indigo) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Device Monitoring
- Live device grid with 30 paired devices (phones, speakers, watches, tablets, cameras, thermostats, smart plugs, sensors)
- Real-time status (online, idle, charging, offline)
- Battery level with color-coded icons
- Wi-Fi signal strength in dBm with bar visualization
- Filter by status, room, or free-text search
- Click any device to open a detail drawer with recent voice commands

### Voice Interaction
- Live animated waveform (speech-like envelope)
- Pause/resume listening toggle
- Command log with transcripts, intent codes, confidence scores
- Success/partial/failed status badges
- 30-second stats polling (today's count, average confidence, success rate)

### Energy Usage
- Hourly area chart (last 24 hours, aggregated across all devices)
- Per-device horizontal bar chart with kWh and percentage
- Summary stats: total today, peak load, estimated monthly cost in Naira (₦)
- 60-second auto-refresh

### Security Alerts
- Severity-ordered feed (critical, warning, info, success)
- Investigate/Dismiss actions with audit logging
- CSV export of all alerts
- 20-second polling for new alerts
- End-to-end encryption status banner (AES-256-GCM, TLS 1.3)

### Permissions Posture
- Per-category permission audit (microphone, camera, location, network)
- Granted/total counts with percentage bars
- Color-coded by risk level (amber >75%, accent >50%, emerald else)

### Device Type Breakdown
- Horizontal bar list of device counts per type
- Auto-refreshes every 30 seconds
- Useful for fleet composition analysis

### Keyboard Shortcuts
- Press `Shift + ?` to open the shortcuts help dialog
- `Esc` to close dialogs
- More shortcuts documented in-app

## Tech stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 with shadcn/ui (New York style)
- **Database**: Prisma ORM with SQLite (local) or Supabase Postgres (production)
- **Charts**: Recharts
- **Icons**: Lucide
- **Animations**: Framer Motion
- **State**: Zustand, TanStack Query patterns via custom `useApi` hook

## Getting started

### Prerequisites

- Node.js 20+ or Bun 1.0+
- A Supabase account (optional — SQLite works for local dev)

### Installation

```bash
# Clone the repo
git clone https://github.com/Resolutefemi/aria-console.git
cd aria-console

# Install dependencies
bun install

# Copy env template
cp .env.example .env

# Set up the database (SQLite local)
bun run db:generate
bun run db:push
bun run db:seed

# Start the dev server
bun run dev
```

Open http://localhost:3000 to view the dashboard.

### Default login

The seed script creates one admin user:
- Email: `ola.kperogi@aria.example`
- Role: ADMIN

(No password — auth is not yet implemented. The console runs in single-user mode for demo purposes.)

## Database

### Local development (SQLite)

The default `DATABASE_URL` in `.env` points to `file:./prisma/dev.db`. Prisma auto-creates this file on `db:push`.

### Production (Supabase Postgres)

1. Create a new Supabase project at https://supabase.com
2. Update `.env` with your Supabase credentials:
   ```env
   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.supabase.com:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```
3. Change the Prisma provider from `sqlite` to `postgresql` in `prisma/schema.prisma`
4. Apply the schema: `bun run db:push` or `bun run db:migrate deploy`
5. Run the seed: `bun run db:seed`

### Alternative SQL schema

The `supabase/migrations/` directory contains raw SQL that mirrors the Prisma schema. You can paste these into the Supabase SQL Editor if you prefer not to use Prisma migrations.

See [`supabase/README.md`](./supabase/README.md) for full deployment instructions and RLS policy reference.

### Database GUIs

The Supabase Dashboard has a built-in Studio (Table Editor + SQL Editor). If you prefer a desktop client:

- [pgAdmin](https://www.pgadmin.org/) — Open-source, full-featured
- [DBeaver](https://dbeaver.io/) — Universal database tool, free
- [TablePlus](https://tableplus.com/) — Premium, beautiful UI
- [Postico](https://eggerapps.at/postico/) — Mac-only, simple
- [Prisma Studio](https://www.prisma.io/studio) — Run `bunx prisma studio`
- [Insomnia](https://insomnia.rest/) — API client with Postgres support

## API endpoints

All endpoints return JSON and use standard HTTP status codes.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats/overview` | KPI summary for top cards |
| GET | `/api/devices` | List devices (supports `?status=`, `?room=`, `?deviceId=`, `?id=`) |
| GET | `/api/devices/distribution` | Device counts grouped by type and status |
| GET | `/api/voice/commands` | Recent voice commands (supports `?limit=`, `?deviceId=`, `?status=`) |
| GET | `/api/voice/stats` | Today's command count, confidence, success rate, 7-day sparkline |
| GET | `/api/energy` | Hourly consumption + per-device breakdown (supports `?hours=`) |
| GET | `/api/security/alerts` | Recent alerts (supports `?severity=`, `?status=`, `?limit=`) |
| PATCH | `/api/security/alerts/[id]` | Update alert status (ACKNOWLEDGED, RESOLVED, DISMISSED) |
| GET | `/api/audit-logs` | List audit log entries (supports `?action=`, `?limit=`) |
| POST | `/api/audit-logs` | Create audit log entry |

## Interface design principles

The dashboard applies five interface design principles, documented in an in-app collapsible panel:

1. **Usability** — Nielsen heuristics (visibility of system status, recognition over recall, consistency)
2. **User-Centered Design** — KPIs ordered by morning-triage priority; locale-aware times and currency
3. **Accessibility (WCAG 2.1 AA)** — Semantic landmarks, ARIA labels, visible focus rings, color is never the sole carrier of meaning
4. **Evaluation** — Each panel has one primary CTA for measurable task completion
5. **Prototyping** — Stateful interactions (pause/resume, notifications, refresh) with live waveform

## Project structure

```
.
├── prisma/
│   ├── schema.prisma       # Prisma schema (Device, VoiceCommand, EnergyReading, SecurityAlert, User, AuditLog)
│   └── seed.ts             # Seed script with 30 devices, 7 commands, energy readings, 6 alerts
├── src/
│   ├── app/
│   │   ├── api/            # API routes (devices, voice, energy, security, audit-logs, stats)
│   │   ├── globals.css     # Tailwind theme tokens (warm dark + light)
│   │   ├── layout.tsx      # Root layout with Geist fonts
│   │   └── page.tsx        # Dashboard page
│   ├── components/
│   │   ├── ui/             # 48 shadcn/ui primitives (New York style)
│   │   └── dashboard/      # Feature components (sidebar, top-bar, stats, devices, voice, energy, security, etc.)
│   ├── hooks/
│   │   ├── use-api.ts      # Generic data-fetching hook with polling
│   │   ├── use-keyboard-shortcuts.ts
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   └── lib/
│       ├── db.ts           # Prisma client singleton
│       ├── csv.ts          # CSV export utilities
│       └── utils.ts        # cn() class name merge
├── supabase/
│   ├── README.md           # Supabase deployment guide
│   └── migrations/         # Raw SQL migrations (0001 through 0007)
├── .env.example            # Environment variable template
├── package.json
└── README.md
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push schema to database |
| `bun run db:migrate` | Create and apply migration |
| `bun run db:seed` | Seed database with sample data |
| `bun run db:reset` | Reset database (destructive) |

## License

MIT © Resolutefemi

## Acknowledgements

- [Next.js](https://nextjs.org/) — React framework
- [shadcn/ui](https://ui.shadcn.com/) — Component library
- [Prisma](https://www.prisma.io/) — Type-safe ORM
- [Supabase](https://supabase.com/) — Postgres + Auth + Storage
- [Recharts](https://recharts.org/) — Charting library
- [Lucide](https://lucide.dev/) — Icon library
