-- ─────────────────────────────────────────────────────────────────────
-- Aria Console — RLS Policy Fix
-- ─────────────────────────────────────────────────────────────────────
-- The original 0001_init_and_users.sql had an infinite recursion bug:
-- the users RLS policy referenced users itself, causing:
--   "infinite recursion detected in policy for relation 'users'"
--
-- This script drops the broken policies and replaces them with safe ones
-- that don't recurse.
--
-- Run this in the Supabase SQL Editor to fix the issue.
-- ─────────────────────────────────────────────────────────────────────

-- ─── Drop broken policies ───────────────────────────────────────────

drop policy if exists "Users are viewable by everyone" on users;
drop policy if exists "Users can be modified by admins" on users;
drop policy if exists "Devices are viewable by authenticated users" on devices;
drop policy if exists "Devices can be modified by operators" on devices;
drop policy if exists "Voice commands viewable by authenticated users" on voice_commands;
drop policy if exists "Voice commands insertable by authenticated users" on voice_commands;
drop policy if exists "Energy readings viewable by authenticated users" on energy_readings;
drop policy if exists "Energy readings insertable by authenticated users" on energy_readings;
drop policy if exists "Alerts viewable by authenticated users" on security_alerts;
drop policy if exists "Alerts manageable by operators" on security_alerts;
drop policy if exists "Audit logs viewable by admins" on audit_logs;
drop policy if exists "Audit logs insertable by authenticated users" on audit_logs;

-- ─── Recreate with non-recursive policies ───────────────────────────
--
-- The key change: instead of querying `users` from inside a users policy
-- (which causes recursion), we use auth.role() = 'authenticated' which
-- is a session-level check that doesn't hit the table.
--
-- For admin-only operations, we use a security definer function that
-- looks up the user's role outside the RLS context.

-- Helper function: check if current user is admin (avoids recursion)
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where id = auth.uid()::text
    and role = 'ADMIN'
  );
$$;

-- Helper function: check if current user is operator or higher
create or replace function is_operator_or_higher()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where id = auth.uid()::text
    and role in ('ADMIN', 'OPERATOR')
  );
$$;

-- ─── users policies (no recursion) ──────────────────────────────────
-- Anyone authenticated can read users (for display names, etc.)
create policy "users_select_authenticated"
  on users for select
  to authenticated
  using (true);

-- Users can update their own row, or admins can update anyone
create policy "users_update_self_or_admin"
  on users for update
  to authenticated
  using (id = auth.uid()::text or is_admin())
  with check (id = auth.uid()::text or is_admin());

-- Only admins can insert or delete users
create policy "users_insert_admin_only"
  on users for insert
  to authenticated
  with check (is_admin());

create policy "users_delete_admin_only"
  on users for delete
  to authenticated
  using (is_admin());

-- ─── devices policies ───────────────────────────────────────────────
create policy "devices_select_authenticated"
  on devices for select
  to authenticated
  using (true);

create policy "devices_modify_operator"
  on devices for all
  to authenticated
  using (is_operator_or_higher())
  with check (is_operator_or_higher());

-- ─── voice_commands policies ────────────────────────────────────────
create policy "voice_commands_select_authenticated"
  on voice_commands for select
  to authenticated
  using (true);

create policy "voice_commands_insert_authenticated"
  on voice_commands for insert
  to authenticated
  with check (true);

-- ─── energy_readings policies ───────────────────────────────────────
create policy "energy_readings_select_authenticated"
  on energy_readings for select
  to authenticated
  using (true);

create policy "energy_readings_insert_authenticated"
  on energy_readings for insert
  to authenticated
  with check (true);

-- ─── security_alerts policies ───────────────────────────────────────
create policy "security_alerts_select_authenticated"
  on security_alerts for select
  to authenticated
  using (true);

create policy "security_alerts_modify_operator"
  on security_alerts for all
  to authenticated
  using (is_operator_or_higher())
  with check (is_operator_or_higher());

-- ─── audit_logs policies (append-only, admin-readable) ──────────────
create policy "audit_logs_select_admin"
  on audit_logs for select
  to authenticated
  using (is_admin());

create policy "audit_logs_insert_authenticated"
  on audit_logs for insert
  to authenticated
  with check (true);

-- No update or delete policies — audit_logs is append-only by design

-- ─── Verify ─────────────────────────────────────────────────────────
-- Quick test: should return 0 (no recursion) instead of error
select count(*) as user_count from users;
select count(*) as device_count from devices;
select count(*) as alert_count from security_alerts;
