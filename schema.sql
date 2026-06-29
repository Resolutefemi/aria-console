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
-- ─── devices table ───────────────────────────────────────────────────
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
-- ─── voice_commands table ────────────────────────────────────────────
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
-- ─── energy_readings table ───────────────────────────────────────────
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
-- ─── security_alerts table ──────────────────────────────────────────
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
-- ─── audit_logs table ────────────────────────────────────────────────
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
-- ─── Seed data (sample) ─────────────────────────────────────────────
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
