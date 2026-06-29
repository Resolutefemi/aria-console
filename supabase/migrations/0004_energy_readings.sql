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
