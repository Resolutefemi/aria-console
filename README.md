# Aria Console

Operations dashboard for a voice-controlled smartphone system. Monitor devices, voice interactions, energy usage, and security alerts from a single web interface designed for both quick triage and deep investigation.

![Aria Console](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan) ![License](https://img.shields.io/badge/license-MIT-green)

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
- **Database**: Supabase (Postgres + Auth + REST) via `@supabase/supabase-js`
- **Charts**: Recharts
- **Icons**: Lucide
- **Animations**: Framer Motion
- **State**: Zustand, TanStack Query patterns via custom `useApi` hook

## Getting started

### Prerequisites

- Node.js 20+ or Bun 1.0+
- A Supabase project (https://supabase.com — the only database, no local DB needed)

### Installation

```bash
# Clone the repo
git clone https://github.com/Resolutefemi/aria-console.git
cd aria-console

# Install dependencies
bun install

# Copy env template and fill in your Supabase project credentials
cp .env.example .env

# Apply the schema to Supabase (Dashboard → SQL Editor → paste → Run)
cat supabase/migrations/0001_full_schema.sql

# Start the dev server
bun run dev
```

Open http://localhost:3000 to view the dashboard.

### Account creation (Supabase Auth)

All sign-up/sign-in goes through Supabase Auth — proxied through the app's own
API routes (`/api/auth/signin`, `/api/auth/signup`, `/api/auth/signout`,
`/api/auth/session`). The browser never talks to `*.supabase.co` directly:
credentials are posted to same-origin routes, and the Supabase session tokens
are stored in an **httpOnly cookie** (`aria_session`) that API routes accept
in place of `Authorization: Bearer` headers. Expired access tokens are
silently refreshed server-side on `/api/auth/session`.

- **First account becomes ADMIN** automatically (console bootstrap) — register via the **Sign Up** tab on `/login`.
- After the first user, self-signups get the `MEMBER` role; admins can create additional operators with a chosen role via `POST /api/users` (which provisions them in Supabase Auth and returns a temporary password).
- Email confirmation uses Supabase's built-in flow. To skip it during development, disable **Confirm email** in *Supabase Dashboard → Authentication → Providers*.

## Database

Everything runs on **Supabase** — Postgres for data, GoTrue for auth, PostgREST for queries:

- **Server API routes** use the secret key (`SUPABASE_SERVICE_ROLE_KEY`) — full access, bypasses RLS.
- **Browser** uses the publishable key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — sessions, realtime, RLS-restricted queries.
- `public.users` is a profile table synced 1:1 with `auth.users` by a trigger (`handle_new_user`) — the first account gets `ADMIN`, later signups follow their user metadata role.

### Applying the schema

One idempotent file: [`supabase/migrations/0001_full_schema.sql`](./supabase/migrations/0001_full_schema.sql) — enums, 13 tables, indexes, `updated_at` triggers, the auth-sync triggers, and non-recursive RLS policies.

1. Open Supabase Dashboard → **SQL Editor** → **New query**
2. Paste the file contents → **Run**
3. (Alternative) `psql "$SUPABASE_CONNECTION_STRING" -f supabase/migrations/0001_full_schema.sql`

See [`supabase/README.md`](./supabase/README.md) for the full deployment guide and RLS policy reference.

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
├── src/
│   ├── app/
│   │   ├── api/            # API routes (devices, voice, energy, security, audit-logs, stats) — all backed by Supabase
│   │   ├── globals.css     # Tailwind theme tokens (warm dark + light)
│   │   ├── layout.tsx      # Root layout with Geist fonts
│   │   └── page.tsx        # Dashboard page
│   ├── components/
│   │   ├── ui/             # 48 shadcn/ui primitives (New York style)
│   │   ├── auth/           # AuthProvider — Supabase Auth session + profile sync
│   │   └── dashboard/      # Feature components (sidebar, top-bar, stats, devices, voice, energy, security, etc.)
│   ├── hooks/
│   │   ├── use-api.ts      # Generic data-fetching hook with polling
│   │   ├── use-keyboard-shortcuts.ts
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   └── lib/
│       ├── supabase.ts     # Supabase client factory (publishable / secret keys)
│       ├── db.ts           # Admin client singleton + row serializer + auth context helper
│       ├── audit.ts        # Audit log writer
│       ├── csv.ts          # CSV export utilities
│       └── utils.ts        # cn() class name merge
├── supabase/
│   ├── README.md           # Supabase deployment guide
│   └── migrations/
│       └── 0001_full_schema.sql  # Canonical schema (tables, RLS, auth triggers)
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
| `bun run db:schema` | Print the canonical Supabase schema file |

## License

MIT © Resolutefemi

## Acknowledgements

- [Next.js](https://nextjs.org/) — React framework
- [shadcn/ui](https://ui.shadcn.com/) — Component library
- [Supabase](https://supabase.com/) — Postgres + Auth + REST (the only database)
- [Recharts](https://recharts.org/) — Charting library
- [Lucide](https://lucide.dev/) — Icon library
