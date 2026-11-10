-- ═════════════════════════════════════════════════════════════════════
-- Aria Console — Full Supabase Schema (REBUILD)
-- ═════════════════════════════════════════════════════════════════════
-- Single canonical, idempotent schema. Replaces migrations 0001-0009.
--
-- Changes vs. the old migrations:
--   * public.users is now a profile table linked 1:1 to Supabase Auth
--     (auth.users) via id — created automatically by trigger.
--   * All enums snake_case; device_type / device_command_type extended
--     to the full smart-device value set used by the API.
--   * Non-recursive RLS everywhere (is_admin / is_operator_or_higher
--     SECURITY DEFINER helpers — fixes the 0001 recursion bug).
--   * No seed data (fresh project — start clean).
--
-- Apply: Supabase Dashboard → SQL Editor, or via the repo's dbtool.
-- ═════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('ADMIN', 'OPERATOR', 'MEMBER', 'VIEWER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_type as enum (
    'PHONE', 'SPEAKER', 'WATCH', 'TABLET', 'HEADPHONES', 'DISPLAY',
    'THERMOSTAT', 'CAMERA', 'LIGHT', 'LOCK', 'PLUG', 'TV', 'DOORBELL',
    'GARAGE', 'VACUUM', 'FRIDGE'
  );
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

do $$ begin
  create type pairing_status as enum ('PENDING', 'PAIRED', 'EXPIRED', 'REVOKED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type parental_rule_type as enum (
    'APP_BLOCK', 'APP_TIME_LIMIT', 'SCREEN_TIME_LIMIT',
    'BEDTIME', 'CONTENT_FILTER', 'LOCATION_GEOFENCE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_command_type as enum (
    'LOCK_DEVICE', 'UNLOCK_DEVICE', 'BLOCK_APP', 'UNBLOCK_APP',
    'SET_TIME_LIMIT', 'REQUEST_LOCATION', 'REQUEST_SCREENSHOT',
    'SEND_MESSAGE', 'RING_DEVICE',
    'TURN_ON', 'TURN_OFF', 'SET_TEMPERATURE', 'SET_BRIGHTNESS',
    'SET_VOLUME', 'PLAY_MEDIA', 'PAUSE_MEDIA', 'STOP_MEDIA',
    'SHOW_CAMERA_FEED', 'START_VACUUM', 'STOP_VACUUM',
    'OPEN_GARAGE', 'CLOSE_GARAGE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_command_status as enum ('PENDING', 'DELIVERED', 'EXECUTED', 'FAILED', 'EXPIRED');
exception when duplicate_object then null; end $$;

-- ─── updated_at helper ──────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── users (profile table, 1:1 with auth.users) ─────────────────────
create table if not exists users (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text unique not null,
  name          text not null,
  role          user_role not null default 'MEMBER',
  avatar_url    text,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table users is 'Console operators — profile rows synced 1:1 with Supabase Auth';
comment on column users.role is 'ADMIN | OPERATOR | MEMBER | VIEWER';

create trigger trg_users_updated_at
  before update on users
  for each row execute function update_updated_at();

-- ─── devices ────────────────────────────────────────────────────────
create table if not exists devices (
  id           text primary key default gen_random_uuid()::text,
  device_id    text unique not null,
  name         text not null,
  type         device_type not null,
  room         text not null,
  status       device_status not null default 'ONLINE',
  battery      integer not null default 100 check (battery >= 0 and battery <= 100),
  signal       integer not null default -60,
  ip_address   text,
  firmware     text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table devices is 'Paired devices in the voice-controlled smart-home system';

create index if not exists idx_devices_status on devices (status);
create index if not exists idx_devices_room on devices (room);
create index if not exists idx_devices_last_seen on devices (last_seen_at desc);

create trigger trg_devices_updated_at
  before update on devices
  for each row execute function update_updated_at();

-- ─── voice_commands ─────────────────────────────────────────────────
create table if not exists voice_commands (
  id         text primary key default gen_random_uuid()::text,
  transcript text not null,
  intent     text not null,
  confidence real not null check (confidence >= 0 and confidence <= 1),
  status     command_status not null default 'SUCCESS',
  device_id  text not null references devices (id) on delete cascade,
  issued_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_voice_commands_device on voice_commands (device_id);
create index if not exists idx_voice_commands_issued on voice_commands (issued_at desc);
create index if not exists idx_voice_commands_status on voice_commands (status);

-- ─── energy_readings ────────────────────────────────────────────────
create table if not exists energy_readings (
  id          text primary key default gen_random_uuid()::text,
  device_id   text not null references devices (id) on delete cascade,
  kilowatts   real not null check (kilowatts >= 0),
  watt_hours  real not null check (watt_hours >= 0),
  recorded_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists idx_energy_device on energy_readings (device_id);
create index if not exists idx_energy_recorded on energy_readings (recorded_at desc);
create index if not exists idx_energy_device_recorded on energy_readings (device_id, recorded_at desc);

-- ─── security_alerts ────────────────────────────────────────────────
create table if not exists security_alerts (
  id              text primary key default gen_random_uuid()::text,
  title           text not null,
  description     text not null,
  severity        alert_severity not null default 'INFO',
  status          alert_status not null default 'OPEN',
  device_id       text references devices (id) on delete set null,
  metadata        jsonb,
  triggered_at    timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_alerts_severity on security_alerts (severity);
create index if not exists idx_alerts_status on security_alerts (status);
create index if not exists idx_alerts_triggered on security_alerts (triggered_at desc);
create index if not exists idx_alerts_severity_status on security_alerts (severity, status);

create trigger trg_security_alerts_updated_at
  before update on security_alerts
  for each row execute function update_updated_at();

-- ─── audit_logs (append-only) ───────────────────────────────────────
create table if not exists audit_logs (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid references users (id) on delete set null,
  action     text not null,
  resource   text not null,
  resource_id text,
  metadata   jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_user on audit_logs (user_id);
create index if not exists idx_audit_action on audit_logs (action);
create index if not exists idx_audit_created on audit_logs (created_at desc);

-- ─── device_pairings ────────────────────────────────────────────────
create table if not exists device_pairings (
  id         text primary key default gen_random_uuid()::text,
  code       text unique not null,
  short_code text unique not null,
  parent_id  uuid not null references users (id) on delete cascade,
  device_id  text references devices (id) on delete set null,
  status     pairing_status not null default 'PENDING',
  expires_at timestamptz not null,
  paired_at  timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pairings_parent on device_pairings (parent_id);
create index if not exists idx_pairings_short_code on device_pairings (short_code);

-- ─── device_apps ────────────────────────────────────────────────────
create table if not exists device_apps (
  id              text primary key default gen_random_uuid()::text,
  device_id       text not null references devices (id) on delete cascade,
  package_name    text not null,
  app_name        text not null,
  category        text not null default 'Other',
  icon_url        text,
  is_blocked      boolean not null default false,
  daily_limit_min integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists uniq_device_apps_device_package on device_apps (device_id, package_name);
create index if not exists idx_device_apps_device on device_apps (device_id);

create trigger trg_device_apps_updated_at
  before update on device_apps
  for each row execute function update_updated_at();

-- ─── screen_time_sessions ───────────────────────────────────────────
create table if not exists screen_time_sessions (
  id          text primary key default gen_random_uuid()::text,
  device_id   text not null references devices (id) on delete cascade,
  app_package text not null,
  app_name    text not null,
  started_at  timestamptz not null,
  ended_at    timestamptz,
  duration_sec integer
);

create index if not exists idx_sts_device_started on screen_time_sessions (device_id, started_at desc);
create index if not exists idx_sts_app_package on screen_time_sessions (app_package);

-- ─── location_pings ─────────────────────────────────────────────────
create table if not exists location_pings (
  id         text primary key default gen_random_uuid()::text,
  device_id  text not null references devices (id) on delete cascade,
  latitude   double precision not null,
  longitude  double precision not null,
  accuracy   double precision,
  speed      double precision,
  heading    double precision,
  address    text,
  battery    integer,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_pings_device_recorded on location_pings (device_id, recorded_at desc);

-- ─── web_history ────────────────────────────────────────────────────
create table if not exists web_history (
  id         text primary key default gen_random_uuid()::text,
  device_id  text not null references devices (id) on delete cascade,
  url        text not null,
  title      text,
  category   text,
  is_blocked boolean not null default false,
  visited_at timestamptz not null default now()
);

create index if not exists idx_web_history_device_visited on web_history (device_id, visited_at desc);

-- ─── parental_rules ─────────────────────────────────────────────────
create table if not exists parental_rules (
  id         text primary key default gen_random_uuid()::text,
  device_id  text not null references devices (id) on delete cascade,
  type       parental_rule_type not null,
  config     jsonb not null,
  is_active  boolean not null default true,
  created_by uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parental_rules_device on parental_rules (device_id);
create index if not exists idx_parental_rules_type on parental_rules (type);

create trigger trg_parental_rules_updated_at
  before update on parental_rules
  for each row execute function update_updated_at();

-- ─── device_commands ────────────────────────────────────────────────
create table if not exists device_commands (
  id           text primary key default gen_random_uuid()::text,
  device_id    text not null references devices (id) on delete cascade,
  type         device_command_type not null,
  payload      jsonb,
  status       device_command_status not null default 'PENDING',
  sent_by      text not null,
  sent_at      timestamptz not null default now(),
  delivered_at timestamptz,
  executed_at  timestamptz,
  result       jsonb
);

create index if not exists idx_device_commands_device_status on device_commands (device_id, status);
create index if not exists idx_device_commands_sent_at on device_commands (sent_at desc);

-- ═════════════════════════════════════════════════════════════════════
-- AUTH INTEGRATION — auto-sync auth.users → public.users
-- ═════════════════════════════════════════════════════════════════════

-- Create a profile row whenever an auth user signs up.
-- The very first account becomes ADMIN (console bootstrap);
-- afterwards, role comes from user metadata (admin-created users)
-- or defaults to MEMBER.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role user_role;
  has_users boolean;
begin
  select exists (select 1 from public.users) into has_users;

  if not has_users then
    new_role := 'ADMIN';
  else
    new_role := coalesce(
      (new.raw_user_meta_data ->> 'role')::user_role,
      'MEMBER'
    );
  end if;

  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep email/name in sync when the auth user updates them.
create or replace function handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set email = new.email,
      name  = coalesce(new.raw_user_meta_data ->> 'name', name),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function handle_user_updated();

-- (Profile deletion is handled by the FK `on delete cascade`.)

-- ═════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (non-recursive)
-- The Next.js API routes use the service key (bypasses RLS); these
-- policies protect direct browser/dashboard access via the REST API.
-- ═════════════════════════════════════════════════════════════════════

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
    and role = 'ADMIN'
    and is_active
  );
$$;

create or replace function is_operator_or_higher()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
    and role in ('ADMIN', 'OPERATOR')
    and is_active
  );
$$;

alter table users enable row level security;
alter table devices enable row level security;
alter table voice_commands enable row level security;
alter table energy_readings enable row level security;
alter table security_alerts enable row level security;
alter table audit_logs enable row level security;
alter table device_pairings enable row level security;
alter table device_apps enable row level security;
alter table screen_time_sessions enable row level security;
alter table location_pings enable row level security;
alter table web_history enable row level security;
alter table parental_rules enable row level security;
alter table device_commands enable row level security;

-- users
drop policy if exists "users_select_authenticated" on users;
drop policy if exists "users_update_self_or_admin" on users;
drop policy if exists "users_insert_admin_only" on users;
drop policy if exists "users_delete_admin_only" on users;
create policy "users_select_authenticated"
  on users for select to authenticated using (true);
create policy "users_update_self_or_admin"
  on users for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());
create policy "users_insert_admin_only"
  on users for insert to authenticated with check (is_admin());
create policy "users_delete_admin_only"
  on users for delete to authenticated using (is_admin());

-- devices
drop policy if exists "devices_select_authenticated" on devices;
drop policy if exists "devices_modify_operator" on devices;
create policy "devices_select_authenticated"
  on devices for select to authenticated using (true);
create policy "devices_modify_operator"
  on devices for all to authenticated
  using (is_operator_or_higher()) with check (is_operator_or_higher());

-- voice_commands
drop policy if exists "voice_commands_select_authenticated" on voice_commands;
drop policy if exists "voice_commands_insert_authenticated" on voice_commands;
create policy "voice_commands_select_authenticated"
  on voice_commands for select to authenticated using (true);
create policy "voice_commands_insert_authenticated"
  on voice_commands for insert to authenticated with check (true);

-- energy_readings
drop policy if exists "energy_readings_select_authenticated" on energy_readings;
drop policy if exists "energy_readings_insert_authenticated" on energy_readings;
create policy "energy_readings_select_authenticated"
  on energy_readings for select to authenticated using (true);
create policy "energy_readings_insert_authenticated"
  on energy_readings for insert to authenticated with check (true);

-- security_alerts
drop policy if exists "security_alerts_select_authenticated" on security_alerts;
drop policy if exists "security_alerts_modify_operator" on security_alerts;
create policy "security_alerts_select_authenticated"
  on security_alerts for select to authenticated using (true);
create policy "security_alerts_modify_operator"
  on security_alerts for all to authenticated
  using (is_operator_or_higher()) with check (is_operator_or_higher());

-- audit_logs (append-only; admin read)
drop policy if exists "audit_logs_select_admin" on audit_logs;
drop policy if exists "audit_logs_insert_authenticated" on audit_logs;
create policy "audit_logs_select_admin"
  on audit_logs for select to authenticated using (is_admin());
create policy "audit_logs_insert_authenticated"
  on audit_logs for insert to authenticated with check (true);

-- device_pairings (parent sees own pairings)
drop policy if exists "pairings_select_own" on device_pairings;
drop policy if exists "pairings_modify_operator" on device_pairings;
create policy "pairings_select_own"
  on device_pairings for select to authenticated
  using (parent_id = auth.uid() or is_operator_or_higher());
create policy "pairings_modify_operator"
  on device_pairings for all to authenticated
  using (is_operator_or_higher()) with check (is_operator_or_higher());

-- device_apps
drop policy if exists "device_apps_select_authenticated" on device_apps;
drop policy if exists "device_apps_modify_operator" on device_apps;
create policy "device_apps_select_authenticated"
  on device_apps for select to authenticated using (true);
create policy "device_apps_modify_operator"
  on device_apps for all to authenticated
  using (is_operator_or_higher()) with check (is_operator_or_higher());

-- screen_time_sessions / location_pings / web_history (companion app inserts via API; authenticated read)
drop policy if exists "sts_select_authenticated" on screen_time_sessions;
drop policy if exists "sts_insert_authenticated" on screen_time_sessions;
create policy "sts_select_authenticated"
  on screen_time_sessions for select to authenticated using (true);
create policy "sts_insert_authenticated"
  on screen_time_sessions for insert to authenticated with check (true);

drop policy if exists "pings_select_authenticated" on location_pings;
drop policy if exists "pings_insert_authenticated" on location_pings;
create policy "pings_select_authenticated"
  on location_pings for select to authenticated using (true);
create policy "pings_insert_authenticated"
  on location_pings for insert to authenticated with check (true);

drop policy if exists "web_history_select_authenticated" on web_history;
drop policy if exists "web_history_insert_authenticated" on web_history;
create policy "web_history_select_authenticated"
  on web_history for select to authenticated using (true);
create policy "web_history_insert_authenticated"
  on web_history for insert to authenticated with check (true);

-- parental_rules
drop policy if exists "parental_rules_select_authenticated" on parental_rules;
drop policy if exists "parental_rules_modify_operator" on parental_rules;
create policy "parental_rules_select_authenticated"
  on parental_rules for select to authenticated using (true);
create policy "parental_rules_modify_operator"
  on parental_rules for all to authenticated
  using (is_operator_or_higher()) with check (is_operator_or_higher());

-- device_commands
drop policy if exists "device_commands_select_authenticated" on device_commands;
drop policy if exists "device_commands_modify_operator" on device_commands;
create policy "device_commands_select_authenticated"
  on device_commands for select to authenticated using (true);
create policy "device_commands_modify_operator"
  on device_commands for all to authenticated
  using (is_operator_or_higher()) with check (is_operator_or_higher());
