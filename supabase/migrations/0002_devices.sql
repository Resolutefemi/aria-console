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
