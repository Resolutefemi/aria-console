# Supabase — Aria Console

Everything in Aria Console runs on Supabase: **Postgres** for data, **GoTrue** for
authentication, **PostgREST** for queries. There is no second database.

## Schema

The single canonical schema file is
[`migrations/0001_full_schema.sql`](./migrations/0001_full_schema.sql).
It is **idempotent** (safe to re-run) and contains:

- 10 Postgres enums (`user_role`, `device_type`, `device_status`, `command_status`,
  `alert_severity`, `alert_status`, `pairing_status`, `parental_rule_type`,
  `device_command_type`, `device_command_status`)
- 13 tables: `users`, `devices`, `voice_commands`, `energy_readings`,
  `security_alerts`, `audit_logs`, `device_pairings`, `device_apps`,
  `screen_time_sessions`, `location_pings`, `web_history`, `parental_rules`,
  `device_commands` — with indexes and FK cascade rules
- `updated_at` triggers on mutable tables
- **Auth integration triggers** — `handle_new_user` creates the `public.users`
  profile row whenever an auth user signs up (first account → `ADMIN`, later
  signups follow their user-metadata role or `MEMBER`); `handle_user_updated`
  keeps email/name in sync; profile deletion cascades from `auth.users`
- **Non-recursive RLS** — helper functions `is_admin()` /
  `is_operator_or_higher()` (SECURITY DEFINER) avoid the classic
  "infinite recursion detected in policy" bug

## Applying the schema

**Option A — Dashboard (easiest):** Supabase Dashboard → SQL Editor → paste
the file → Run.

**Option B — psql / any Postgres client:**

```bash
# Direct connection (IPv6 only):
psql "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" \
  -f supabase/migrations/0001_full_schema.sql

# Supavisor session pooler (IPv4 — works everywhere):
psql "postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/0001_full_schema.sql
```

## Environment variables

| Variable | Where to find it | Used by |
|----------|------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | `@supabase/supabase-js` (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → publishable key (`sb_publishable_…`) | Browser client (RLS-restricted) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → secret key (`sb_secret_…`) | Server API routes (bypasses RLS — NEVER expose) |
| `SUPABASE_JWKS_URL` | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` | Optional JWT verification by third parties |

The new-style keys (`sb_publishable_*` / `sb_secret_*`) replace the legacy
`anon` / `service_role` JWTs and work directly with `@supabase/supabase-js`.

## Row Level Security (RLS)

The Next.js API routes use the secret key, which bypasses RLS. These policies
protect direct browser/dashboard access through the REST API:

| Table | Read | Write |
|-------|------|-------|
| `users` | Authenticated | Self-update, admin insert/delete |
| `devices` | Authenticated | Operator+ |
| `voice_commands` | Authenticated | Authenticated (insert) |
| `energy_readings` | Authenticated | Authenticated (insert) |
| `security_alerts` | Authenticated | Operator+ |
| `audit_logs` | Admin only | Authenticated (insert only — append-only) |
| `device_pairings` | Own pairings | Operator+ |
| `device_apps` / `parental_rules` / `device_commands` | Authenticated | Operator+ |
| `screen_time_sessions` / `location_pings` / `web_history` | Authenticated | Authenticated (insert) |

## Auth flow

1. **Sign up** — `/login` → Sign Up tab → `supabase.auth.signUp` (GoTrue).
   The DB trigger creates the profile row instantly.
2. **Sign in** — `supabase.auth.signInWithPassword`; `/api/auth/sync` refreshes
   `last_login_at` and returns the profile with its role.
3. **Admin-created operators** — `POST /api/users` calls
   `auth.admin.createUser` with a chosen role + temporary password.
4. **Sessions** — browser keeps the Supabase session in `localStorage`;
   API routes verify the `Authorization: Bearer` JWT with
   `auth.getUser(token)` and resolve the profile by auth user id.

## Alternative database GUIs

Supabase Studio (Table Editor + SQL Editor) is built in. Desktop clients:
pgAdmin, DBeaver, TablePlus, Postico, or Drizzle Studio.
