-- ─────────────────────────────────────────────────────────────────────
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
