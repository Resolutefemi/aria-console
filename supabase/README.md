# Supabase Schema — Aria Console

This directory contains the SQL schema for deploying Aria Console to Supabase.

## Files

- `migrations/0001_init_and_users.sql` — Extensions, enums, users table
- `migrations/0002_devices.sql` — Devices table with RLS and triggers
- `migrations/0003_voice_commands.sql` — Voice command log
- `migrations/0004_energy_readings.sql` — Per-device energy readings
- `migrations/0005_security_alerts.sql` — Security alerts with jsonb metadata
- `migrations/0006_audit_logs.sql` — Append-only audit trail
- `migrations/0007_seed_data.sql` — Sample data

## Deploying to Supabase

### Option A: SQL Editor (easiest)

1. Open your Supabase project dashboard
2. Go to **SQL Editor** → **New query**
3. Copy and paste each migration file in order (0001 through 0007)
4. Click **Run** for each one

### Option B: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option C: Prisma Migrate

Update your `.env`:

```env
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

Then run:

```bash
# Update prisma/schema.prisma: change provider from "sqlite" to "postgresql"
bun run db:migrate deploy
```

## Environment variables

| Variable | Where to find it | Used by |
|----------|------------------|---------|
| `DATABASE_URL` | Project Settings → Database → Connection string (pooled, port 6543) | Prisma client (runtime queries) |
| `DIRECT_URL` | Project Settings → Database → Connection string (direct, port 5432) | Prisma migrate (schema changes) |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | @supabase/supabase-js (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → Project API keys → anon public | @supabase/supabase-js (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → Project API keys → service_role | Server-side admin operations (NEVER expose) |

## Row Level Security (RLS)

Every table has RLS enabled with the following policies:

| Table | Read | Write |
|-------|------|-------|
| `users` | Anyone | Admin only |
| `devices` | Authenticated | Operator+ |
| `voice_commands` | Authenticated | Authenticated (insert) |
| `energy_readings` | Authenticated | Authenticated (insert) |
| `security_alerts` | Authenticated | Operator+ |
| `audit_logs` | Admin only | Authenticated (insert only — append-only) |

## Alternative database GUIs

If you don't want to use the built-in Supabase Studio, you can use:

- **pgAdmin** — Open-source Postgres admin (https://www.pgadmin.org/)
- **DBeaver** — Universal database tool (https://dbeaver.io/)
- **TablePlus** — Premium GUI for macOS/Windows (https://tableplus.com/)
- **Postico** — Mac-only Postgres client (https://eggerapps.at/postico/)
- **Drizzle Studio** — Works with Drizzle ORM, also reads raw Postgres
- **Prisma Studio** — Comes free with Prisma (run `bunx prisma studio`)
- **Insomnia** — API client that also supports Postgres queries
