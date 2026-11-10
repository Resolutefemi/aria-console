# Deployment Guide — Aria Console

This guide covers deploying Aria Console to production, with Supabase as the
only database (Postgres + Auth + REST — there is no local/second database).

## Option A: Vercel + Supabase (recommended)

### 1. Set up Supabase

1. Create a new project at https://supabase.com
2. Wait for provisioning to complete (~2 minutes)
3. Go to **Project Settings → API**:
   - Note the **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - Note the **publishable** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `sb_publishable_…`)
   - Note the **secret** key (`SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_…`) — keep this secret!
4. No connection strings needed for runtime — the app talks to Supabase over
   HTTPS (PostgREST/GoTrue). Connection strings are only useful for psql/migrations.

### 2. Apply the schema

Open the Supabase **SQL Editor**, paste the whole
`supabase/migrations/0001_full_schema.sql` file and click **Run** (it is
idempotent). Or with psql:

```bash
psql "postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/0001_full_schema.sql
```

### 3. Deploy to Vercel

1. Push your repo to GitHub
2. Go to https://vercel.com and import the repo
3. Set environment variables (Project Settings → Environment Variables — see
   `.env.vercel` for the template):

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | https://your-project-ref.supabase.co |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key (`sb_publishable_…`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret key (`sb_secret_…`) |
   | `NEXT_PUBLIC_APP_NAME` | Aria Console |
   | `NEXT_PUBLIC_APP_VERSION` | 4.2.1 |

4. Deploy
5. Visit your Vercel URL → open `/login` → **Sign Up** to create the first
   (ADMIN) account

## Option B: Self-hosted (Docker)

### 1. Build the image

```bash
docker build -t aria-console .
```

### 2. Run with environment variables

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://..." \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..." \
  -e SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
  -e NODE_ENV=production \
  aria-console
```

### 3. Apply the schema

Apply `supabase/migrations/0001_full_schema.sql` to your Supabase project
(SQL Editor or psql) — the container itself needs no database access.

## Verifying the deployment

1. Visit `https://your-domain.com/api/health` — should return
   `{"status":"ok","database":"connected (supabase)",...}`
2. Visit `https://your-domain.com/login` — Sign Up creates the first ADMIN
   account (or disable email confirmation first for instant signups)
3. Pair a device via the companion app (`/companion`) — it appears on the
   dashboard after pairing
4. Press `Shift + ?` — shortcuts dialog should appear

## Troubleshooting

### Auth issues

- **"Email address invalid"** — Supabase rejects `.test`/fake domains; use a
  real address or disable email confirmation in *Authentication → Providers*.
- **Signup works but sign-in says invalid credentials** — the email
  confirmation is still pending; confirm via the email link or turn off
  "Confirm email".
- **First user is MEMBER, not ADMIN** — the ADMIN bootstrap applies to the
  very first `auth.users` row; promote later users in SQL:
  `update users set role = 'ADMIN' where email = '…';`

### Database/API issues

- `api/health` returning `degraded` — check `SUPABASE_SERVICE_ROLE_KEY` and
  `NEXT_PUBLIC_SUPABASE_URL` in the environment.
- Missing rows in the browser but visible in Supabase Studio — RLS: direct
  REST reads need authenticated JWTs; the dashboard's own calls go through
  the server API routes.

### Hydration errors

- The clock in the top bar uses `useSyncExternalStore` with a server snapshot of 0
- If you see hydration mismatches, ensure you're not using `Date.now()` directly during render
