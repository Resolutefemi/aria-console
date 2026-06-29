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
