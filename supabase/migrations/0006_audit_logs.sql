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
