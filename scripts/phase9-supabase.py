#!/usr/bin/env python3
"""Phase 9: Supabase SQL schema (one commit per table) + Prisma migration."""
import os
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
SUPABASE = ROOT / "supabase"
MIGRATIONS = SUPABASE / "migrations"
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# ─── Supabase schema (split per table) ─────────────
SUPABASE.mkdir(exist_ok=True)
MIGRATIONS.mkdir(exist_ok=True)

# 1. Initial migration header with extensions and users table
sql_v1 = """-- ─────────────────────────────────────────────────────────────────────
-- Aria Console — Supabase Postgres schema
-- ─────────────────────────────────────────────────────────────────────
-- This SQL mirrors the Prisma schema and can be applied directly to a
-- Supabase project via the SQL Editor (https://supabase.com/dashboard).
--
-- To connect Prisma to Supabase in production:
--   1. Set DATABASE_URL to the pooled connection string (port 6543)
--   2. Set DIRECT_URL to the direct connection (port 5432)
--   3. Run `bun run db:migrate deploy` to apply migrations
--
-- Required extensions (enabled by default on Supabase):
--   - uuid-ossp (for uuid_generate_v4())
--   - pgcrypto (for gen_random_uuid())
-- ─────────────────────────────────────────────────────────────────────

-- Required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('ADMIN', 'OPERATOR', 'MEMBER', 'VIEWER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_type as enum ('PHONE', 'SPEAKER', 'WATCH', 'TABLET', 'HEADPHONES', 'DISPLAY', 'THERMOSTAT', 'CAMERA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_status as enum ('ONLINE', 'IDLE', 'OFFLINE', 'CHARGING');
exception when duplicate_object then null; end $$;

do $$ begin
  create type command_status as enum ('SUCCESS', 'PARTIAL', 'FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_severity as enum ('CRITICAL', 'WARNING', 'INFO', 'SUCCESS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_status as enum ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
exception when duplicate_object then null; end $$;

-- ─── users table ────────────────────────────────────────────────────
create table if not exists users (
  id text primary key default gen_random_uuid()::text,
  email text unique not null,
  name text not null,
  role user_role not null default 'MEMBER',
  avatar_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table users is 'Console operators with role-based access';
comment on column users.email is 'Unique operator email';
comment on column users.role is 'ADMIN | OPERATOR | MEMBER | VIEWER';

-- Enable Row Level Security
alter table users enable row level security;

-- Policy: anyone can read users (for display names), only admins can write
create policy "Users are viewable by everyone" on users for select using (true);
create policy "Users can be modified by admins" on users for all using (
  exists (select 1 from users u where u.id = auth.uid()::text and u.role = 'ADMIN')
);
"""
(MIGRATIONS / "0001_init_and_users.sql").write_text(sql_v1)
commit(
    "feat(supabase): add init migration with extensions, enums, and users table\n\n- Enables uuid-ossp and pgcrypto extensions\n- Creates 6 enum types (user_role, device_type, device_status, command_status, alert_severity, alert_status)\n- Creates users table with RLS enabled\n- Policies: anyone can read, only admins can write\n- Uses do $$ blocks for idempotent enum creation",
    ["supabase/migrations/0001_init_and_users.sql"],
)

# 2. Devices table
sql_v2 = """-- ─── devices table ───────────────────────────────────────────────────
create table if not exists devices (
  id text primary key default gen_random_uuid()::text,
  device_id text unique not null,
  name text not null,
  type device_type not null,
  room text not null,
  status device_status not null default 'ONLINE',
  battery integer not null default 100 check (battery >= 0 and battery <= 100),
  signal integer not null default -60,
  ip_address text,
  firmware text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table devices is 'Paired devices in the voice-controlled smartphone system';
comment on column devices.device_id is 'Human-readable ID like D-001';
comment on column devices.battery is 'Battery level 0-100';
comment on column devices.signal is 'Wi-Fi signal strength in dBm';

-- Indexes for common query patterns
create index if not exists idx_devices_status on devices (status);
create index if not exists idx_devices_room on devices (room);
create index if not exists idx_devices_last_seen on devices (last_seen_at desc);

-- Enable RLS
alter table devices enable row level security;

-- Policies: authenticated users can read; only operators+ can write
create policy "Devices are viewable by authenticated users" on devices for select using (auth.role() = 'authenticated');
create policy "Devices can be modified by operators" on devices for all using (
  exists (
    select 1 from users u
    where u.id = auth.uid()::text
    and u.role in ('ADMIN', 'OPERATOR')
  )
);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_devices_updated_at
  before update on devices
  for each row execute function update_updated_at();
"""
(MIGRATIONS / "0002_devices.sql").write_text(sql_v2)
commit(
    "feat(supabase): add devices table with indexes, RLS, and update trigger\n\n- devices table with check constraint on battery (0-100)\n- Indexes on status, room, last_seen_at for query performance\n- RLS: authenticated users can read, operators+ can write\n- update_updated_at() trigger function for automatic updated_at\n- Comments on table and key columns",
    ["supabase/migrations/0002_devices.sql"],
)

# 3. Voice commands table
sql_v3 = """-- ─── voice_commands table ────────────────────────────────────────────
create table if not exists voice_commands (
  id text primary key default gen_random_uuid()::text,
  transcript text not null,
  intent text not null,
  confidence real not null check (confidence >= 0 and confidence <= 1),
  status command_status not null default 'SUCCESS',
  device_id text not null references devices (id) on delete cascade,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table voice_commands is 'Voice commands issued to devices';
comment on column voice_commands.confidence is 'Recognition confidence 0.0 to 1.0';
comment on column voice_commands.intent is 'Categorized intent like lights.on, alarm.set';

create index if not exists idx_voice_commands_device on voice_commands (device_id);
create index if not exists idx_voice_commands_issued on voice_commands (issued_at desc);
create index if not exists idx_voice_commands_status on voice_commands (status);

alter table voice_commands enable row level security;

create policy "Voice commands viewable by authenticated users" on voice_commands for select using (auth.role() = 'authenticated');
create policy "Voice commands insertable by authenticated users" on voice_commands for insert with check (auth.role() = 'authenticated');
"""
(MIGRATIONS / "0003_voice_commands.sql").write_text(sql_v3)
commit(
    "feat(supabase): add voice_commands table with device FK and indexes\n\n- voice_commands table with FK to devices (cascade delete)\n- Check constraint on confidence (0.0 to 1.0)\n- Indexes on device_id, issued_at, status\n- RLS: authenticated users can read and insert",
    ["supabase/migrations/0003_voice_commands.sql"],
)

# 4. Energy readings table
sql_v4 = """-- ─── energy_readings table ───────────────────────────────────────────
create table if not exists energy_readings (
  id text primary key default gen_random_uuid()::text,
  device_id text not null references devices (id) on delete cascade,
  kilowatts real not null check (kilowatts >= 0),
  watt_hours real not null check (watt_hours >= 0),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table energy_readings is 'Per-device energy consumption readings';
comment on column energy_readings.kilowatts is 'Instantaneous power in kW';
comment on column energy_readings.watt_hours is 'Energy consumed in this interval (Wh)';

create index if not exists idx_energy_device on energy_readings (device_id);
create index if not exists idx_energy_recorded on energy_readings (recorded_at desc);

-- Composite index for time-range queries per device
create index if not exists idx_energy_device_recorded on energy_readings (device_id, recorded_at desc);

alter table energy_readings enable row level security;

create policy "Energy readings viewable by authenticated users" on energy_readings for select using (auth.role() = 'authenticated');
create policy "Energy readings insertable by authenticated users" on energy_readings for insert with check (auth.role() = 'authenticated');
"""
(MIGRATIONS / "0004_energy_readings.sql").write_text(sql_v4)
commit(
    "feat(supabase): add energy_readings table with composite index\n\n- energy_readings table with FK to devices (cascade delete)\n- Check constraints: kilowatts >= 0, watt_hours >= 0\n- Indexes on device_id, recorded_at, plus composite (device_id, recorded_at)\n- Composite index optimizes per-device time-range queries\n- RLS: authenticated users can read and insert",
    ["supabase/migrations/0004_energy_readings.sql"],
)

# 5. Security alerts table
sql_v5 = """-- ─── security_alerts table ──────────────────────────────────────────
create table if not exists security_alerts (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text not null,
  severity alert_severity not null default 'INFO',
  status alert_status not null default 'OPEN',
  device_id text references devices (id) on delete set null,
  metadata jsonb,
  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table security_alerts is 'Security events requiring operator attention';
comment on column security_alerts.metadata is 'JSON-encoded additional context';
comment on column security_alerts.acknowledged_by is 'User ID of acknowledger';

create index if not exists idx_alerts_severity on security_alerts (severity);
create index if not exists idx_alerts_status on security_alerts (status);
create index if not exists idx_alerts_triggered on security_alerts (triggered_at desc);

-- Composite index for "open critical alerts" queries
create index if not exists idx_alerts_severity_status on security_alerts (severity, status);

alter table security_alerts enable row level security;

create policy "Alerts viewable by authenticated users" on security_alerts for select using (auth.role() = 'authenticated');
create policy "Alerts manageable by operators" on security_alerts for all using (
  exists (
    select 1 from users u
    where u.id = auth.uid()::text
    and u.role in ('ADMIN', 'OPERATOR')
  )
);

-- Trigger for updated_at
create trigger trg_security_alerts_updated_at
  before update on security_alerts
  for each row execute function update_updated_at();
"""
(MIGRATIONS / "0005_security_alerts.sql").write_text(sql_v5)
commit(
    "feat(supabase): add security_alerts table with jsonb metadata and RLS\n\n- security_alerts table with optional FK to devices (set null on delete)\n- jsonb metadata column (Postgres-native JSON, unlike SQLite)\n- Composite index on (severity, status) for open-critical queries\n- RLS: authenticated users can read, operators+ can manage\n- Trigger for automatic updated_at",
    ["supabase/migrations/0005_security_alerts.sql"],
)

# 6. Audit logs table
sql_v6 = """-- ─── audit_logs table ────────────────────────────────────────────────
create table if not exists audit_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text references users (id) on delete set null,
  action text not null,
  resource text not null,
  resource_id text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table audit_logs is 'Immutable record of operator actions';
comment on column audit_logs.action is 'e.g. alert.acknowledge, device.refresh';
comment on column audit_logs.resource is 'e.g. security_alert, device';
comment on column audit_logs.metadata is 'JSON-encoded context';

create index if not exists idx_audit_user on audit_logs (user_id);
create index if not exists idx_audit_action on audit_logs (action);
create index if not exists idx_audit_created on audit_logs (created_at desc);

-- No update/delete policies — audit logs are append-only
alter table audit_logs enable row level security;

create policy "Audit logs viewable by admins" on audit_logs for select using (
  exists (select 1 from users u where u.id = auth.uid()::text and u.role = 'ADMIN')
);
create policy "Audit logs insertable by authenticated users" on audit_logs for insert with check (auth.role() = 'authenticated');
"""
(MIGRATIONS / "0006_audit_logs.sql").write_text(sql_v6)
commit(
    "feat(supabase): add audit_logs table with append-only RLS\n\n- audit_logs table with optional FK to users (set null on delete)\n- inet type for ip_address (Postgres-native)\n- jsonb metadata column\n- Indexes on user_id, action, created_at\n- RLS: admins can read, authenticated can insert (append-only by design)\n- No update or delete policies — audit logs are immutable",
    ["supabase/migrations/0006_audit_logs.sql"],
)

# 7. Seed data SQL
sql_v7 = """-- ─── Seed data (sample) ─────────────────────────────────────────────
-- Insert this after running migrations 0001-0006.
-- To reset: truncate all tables cascade; then re-run.

-- Admin user (use a real UUID in production)
insert into users (id, email, name, role, last_login_at)
values (
  'user-admin-001',
  'ola.kperogi@aria.example',
  'Ola Kperogi',
  'ADMIN',
  now()
)
on conflict (email) do nothing;

-- Sample devices
insert into devices (device_id, name, type, room, status, battery, signal, ip_address, firmware, last_seen_at) values
  ('D-001', 'Ola''s iPhone 15 Pro', 'PHONE', 'Personal', 'ONLINE', 87, -58, '10.0.1.24', '17.4.1', now()),
  ('D-002', 'Living Room Speaker', 'SPEAKER', 'Living Room', 'ONLINE', 100, -42, '10.0.1.51', '4.2.1', now()),
  ('D-003', 'Kitchen Display', 'DISPLAY', 'Kitchen', 'IDLE', 64, -71, '10.0.1.62', '4.2.1', now() - interval '3 minutes'),
  ('D-004', 'Bedroom Hub', 'SPEAKER', 'Bedroom', 'CHARGING', 42, -55, '10.0.1.73', '3.8.2', now()),
  ('D-005', 'Galaxy Watch6', 'WATCH', 'Personal', 'ONLINE', 73, -67, '10.0.1.88', '2.1.0', now() - interval '1 minute'),
  ('D-006', 'AirPods Pro', 'HEADPHONES', 'Personal', 'ONLINE', 28, -49, '10.0.1.91', '7B19', now()),
  ('D-007', 'Office iPad', 'TABLET', 'Office', 'OFFLINE', 12, 0, '10.0.1.104', '17.4.1', now() - interval '2 hours'),
  ('D-008', 'Garage Speaker', 'SPEAKER', 'Garage', 'IDLE', 91, -84, '10.0.1.112', '4.1.7', now() - interval '18 minutes')
on conflict (device_id) do nothing;

-- Sample voice commands
insert into voice_commands (transcript, intent, confidence, status, device_id, issued_at) values
  ('Turn on the living room lights at 60% brightness', 'lights.on', 0.97, 'SUCCESS', (select id from devices where device_id = 'D-002'), now() - interval '8 minutes'),
  ('Set an alarm for 7 AM tomorrow', 'alarm.set', 0.99, 'SUCCESS', (select id from devices where device_id = 'D-001'), now() - interval '12 minutes'),
  ('Play my focus playlist on the bedroom speaker', 'media.play', 0.92, 'SUCCESS', (select id from devices where device_id = 'D-004'), now() - interval '19 minutes'),
  ('What is the weather forecast for the weekend', 'weather.query', 0.78, 'PARTIAL', (select id from devices where device_id = 'D-003'), now() - interval '26 minutes'),
  ('Call mum on speakerphone', 'call.initiate', 0.95, 'SUCCESS', (select id from devices where device_id = 'D-001'), now() - interval '33 minutes'),
  ('Remind me to take out the trash at 6', 'reminder.create', 0.41, 'FAILED', (select id from devices where device_id = 'D-005'), now() - interval '42 minutes'),
  ('Decrease the thermostat by two degrees', 'climate.adjust', 0.94, 'SUCCESS', (select id from devices where device_id = 'D-002'), now() - interval '50 minutes');

-- Sample security alerts
insert into security_alerts (title, description, severity, status, device_id, triggered_at) values
  ('Unrecognized voice profile', 'An unregistered voice attempted to issue the command "unlock front door". Access was denied and the event was logged.', 'CRITICAL', 'OPEN', (select id from devices where device_id = 'D-002'), now() - interval '2 minutes'),
  ('Microphone access blocked', 'App "QuickWeather" requested background microphone access. Request auto-denied per privacy policy.', 'CRITICAL', 'OPEN', (select id from devices where device_id = 'D-001'), now() - interval '47 minutes'),
  ('Unusual location sign-in', 'Aria Cloud account accessed from Lekki, Lagos — a new location.', 'WARNING', 'OPEN', null, now() - interval '1 hour'),
  ('Device firmware out of date', 'Bedroom Hub is running firmware 3.8.2 — version 4.0.1 patches CVE-2025-31822.', 'WARNING', 'OPEN', (select id from devices where device_id = 'D-004'), now() - interval '3 hours'),
  ('New device paired', 'Galaxy Watch6 was successfully paired to your Aria account.', 'INFO', 'OPEN', (select id from devices where device_id = 'D-005'), now() - interval '24 hours'),
  ('Security scan completed', 'Weekly security scan finished. No anomalies detected.', 'SUCCESS', 'OPEN', null, now() - interval '26 hours');
"""
(MIGRATIONS / "0007_seed_data.sql").write_text(sql_v7)
commit(
    "feat(supabase): add seed data migration\n\n- 1 admin user\n- 8 devices across 6 rooms\n- 7 voice commands with transcripts, intents, confidence\n- 6 security alerts (2 critical, 2 warning, 1 info, 1 success)\n- Uses on conflict do nothing for idempotent re-runs\n- Times use interval arithmetic for realistic freshness",
    ["supabase/migrations/0007_seed_data.sql"],
)

# 8. README for supabase folder
supabase_readme = """# Supabase Schema — Aria Console

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
"""
(SUPABASE / "README.md").write_text(supabase_readme)
commit(
    "docs(supabase): add comprehensive README with deployment guide\n\n- Three deployment options: SQL Editor, Supabase CLI, Prisma Migrate\n- Environment variable table with where-to-find instructions\n- RLS policy reference table\n- Alternative database GUIs: pgAdmin, DBeaver, TablePlus, Postico, Prisma Studio, Insomnia",
    ["supabase/README.md"],
)

print(f"After phase 9: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
