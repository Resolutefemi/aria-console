# Deployment Guide — Aria Console

This guide covers deploying Aria Console to production, with a focus on Supabase as the database backend.

## Option A: Vercel + Supabase (recommended)

### 1. Set up Supabase

1. Create a new project at https://supabase.com
2. Wait for provisioning to complete (~2 minutes)
3. Go to **Project Settings → API**:
   - Note the **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - Note the **anon public** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Note the **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`) — keep this secret!
4. Go to **Project Settings → Database**:
   - Note the **Connection string** (pooled, port 6543) → `DATABASE_URL`
   - Note the **Connection string** (direct, port 5432) → `DIRECT_URL`

### 2. Apply the schema

Choose one of:

**Option 1: SQL Editor (easiest)**

Open the Supabase SQL Editor and paste each file from `supabase/migrations/` in order (0001 through 0007). Click Run after each.

**Option 2: Prisma Migrate**

```bash
# Update prisma/schema.prisma: change provider from "sqlite" to "postgresql"
# Set DATABASE_URL and DIRECT_URL in .env
bun run db:migrate deploy
bun run db:seed
```

### 3. Deploy to Vercel

1. Push your repo to GitHub
2. Go to https://vercel.com and import the repo
3. Set environment variables (Project Settings → Environment Variables):

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Pooled Supabase connection string |
   | `DIRECT_URL` | Direct Supabase connection string |
   | `NEXT_PUBLIC_SUPABASE_URL` | https://your-project-ref.supabase.co |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `NEXT_PUBLIC_APP_NAME` | Aria Console |
   | `NEXT_PUBLIC_APP_VERSION` | 4.2.1 |
   | `NODE_ENV` | production |

4. Deploy
5. Visit your Vercel URL — the dashboard should load with seed data

## Option B: Self-hosted (Docker)

### 1. Build the image

```bash
docker build -t aria-console .
```

### 2. Run with environment variables

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e DIRECT_URL="postgresql://..." \
  -e NEXT_PUBLIC_SUPABASE_URL="https://..." \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  -e SUPABASE_SERVICE_ROLE_KEY="..." \
  -e NODE_ENV=production \
  aria-console
```

### 3. Apply schema and seed

```bash
docker exec -it <container_id> bun run db:migrate deploy
docker exec -it <container_id> bun run db:seed
```

## Verifying the deployment

1. Visit `https://your-domain.com/api/health` — should return `{"status":"ok",...}`
2. Visit `https://your-domain.com/` — dashboard should load with 30 devices
3. Click any device card — detail drawer should open
4. Press `Shift + ?` — shortcuts dialog should appear

## Troubleshooting

### Database connection issues

- Ensure `DATABASE_URL` uses port **6543** (pooler) for runtime queries
- Ensure `DIRECT_URL` uses port **5432** (direct) for migrations
- Check that `?pgbouncer=true&connection_limit=1` is appended to `DATABASE_URL`
- Verify your Supabase project is not paused (free tier auto-pauses after inactivity)

### Prisma client errors

- Run `bun run db:generate` after changing the schema
- Delete `.next/` and restart the dev server if you see stale type errors
- Ensure `output` in `prisma/schema.prisma` points to `../node_modules/.prisma/client`

### Hydration errors

- The clock in the top bar uses `useSyncExternalStore` with a server snapshot of 0
- If you see hydration mismatches, ensure you're not using `Date.now()` directly during render

## Environment variable checklist

Before going live, verify you have set:

- [ ] `DATABASE_URL` (pooled Supabase connection)
- [ ] `DIRECT_URL` (direct Supabase connection)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose)
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `NEXT_PUBLIC_APP_VERSION`
- [ ] `NODE_ENV=production`

## Post-deployment tasks

1. **Revoke the seed admin user** or change its email after first login
2. **Set up Supabase Auth** for real user authentication (not yet implemented in this demo)
3. **Configure backup schedule** in Supabase Dashboard → Database → Backups
4. **Set up log drain** in Vercel for production monitoring
5. **Configure custom domain** in Vercel Project Settings → Domains
6. **Enable Vercel Analytics** for traffic insights
