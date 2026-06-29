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
