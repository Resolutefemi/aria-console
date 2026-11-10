# Database Schema — Aria Console

The schema lives in **one canonical, idempotent SQL file**:
[`supabase/migrations/0001_full_schema.sql`](./supabase/migrations/0001_full_schema.sql).
It is applied to the Supabase project (Dashboard → SQL Editor, or psql) and
contains tables, indexes, triggers, RLS policies and the auth-sync triggers.
The TypeScript side reads/writes these tables through `@supabase/supabase-js`
(`src/lib/db.ts` serializes Postgres `snake_case` rows to the camelCase API
contract the dashboard was built on).

## Tables

### `users` — profile table, 1:1 with Supabase Auth

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, **FK → `auth.users(id)` on delete cascade** | Auth user id |
| email | text | unique, not null | Login email |
| name | text | not null | Display name |
| role | user_role | not null, default 'MEMBER' | ADMIN, OPERATOR, MEMBER, VIEWER |
| avatar_url | text | nullable | URL to avatar image |
| is_active | boolean | not null, default true | Soft-delete flag |
| last_login_at | timestamptz | nullable | Last successful login |
| created_at / updated_at | timestamptz | not null, default now() | Timestamps |

Rows are created automatically by the `handle_new_user` trigger when an auth
user signs up — the first account becomes `ADMIN`.

### `devices`

Paired devices in the voice-controlled smartphone system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK, default gen_random_uuid() | Internal ID |
| device_id | text | unique, not null | Human-readable (D-001) |
| name | text | not null | Display name |
| type | device_type | not null | PHONE … FRIDGE (16 values incl. smart devices) |
| room | text | not null | Physical location |
| status | device_status | not null, default 'ONLINE' | ONLINE, IDLE, OFFLINE, CHARGING |
| battery | integer | not null, default 100 | 0–100 (check constraint) |
| signal | integer | not null, default -60 | Wi-Fi signal in dBm |
| ip_address / firmware | text | nullable | LAN IP, firmware version |
| last_seen_at | timestamptz | not null, default now() | Last heartbeat |
| created_at / updated_at | timestamptz | not null, default now() | Timestamps |

**Indexes**: status, room, last_seen_at desc

### `voice_commands`

| Column | Type | Description |
|--------|------|-------------|
| id | text PK | Internal ID |
| transcript | text | Spoken words |
| intent | text | Categorized intent (lights.on, alarm.set, …) |
| confidence | real (0–1) | Recognition confidence |
| status | command_status | SUCCESS, PARTIAL, FAILED |
| device_id | text FK → devices on delete cascade | Target device |
| issued_at / created_at | timestamptz | Timestamps |

### `energy_readings`

| Column | Type | Description |
|--------|------|-------------|
| id | text PK | Internal ID |
| device_id | text FK → devices on delete cascade | Source device |
| kilowatts / watt_hours | real, ≥ 0 | Instantaneous power / interval energy |
| recorded_at / created_at | timestamptz | Timestamps |

### `security_alerts`

| Column | Type | Description |
|--------|------|-------------|
| id | text PK | Internal ID |
| title / description | text | Alert text |
| severity | alert_severity | CRITICAL, WARNING, INFO, SUCCESS |
| status | alert_status | OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED |
| device_id | text FK → devices on delete set null | Related device (optional) |
| metadata | jsonb | Additional context |
| triggered_at | timestamptz | When the alert fired |
| acknowledged_at / acknowledged_by | timestamptz / text | Acknowledgement |
| created_at / updated_at | timestamptz | Timestamps |

### `audit_logs` — append-only

| Column | Type | Description |
|--------|------|-------------|
| id | text PK | Internal ID |
| user_id | uuid FK → users on delete set null | Acting user |
| action / resource / resource_id | text | e.g. alert.acknowledged / security_alert / id |
| metadata | jsonb | JSON context |
| ip_address | inet | Request IP |
| user_agent | text | Browser user agent |
| created_at | timestamptz | Action timestamp |

No UPDATE/DELETE policies — audit logs are append-only by design.

### Device monitoring tables (companion app)

| Table | Purpose | Notes |
|-------|---------|-------|
| `device_pairings` | Parent ↔ device pairing sessions | `code` + 6-digit `short_code`, 15-min expiry |
| `device_apps` | Installed apps with block/limit state | unique (device_id, package_name) |
| `screen_time_sessions` | Foreground app usage sessions | duration_sec computed on end |
| `location_pings` | GPS pings | lat/long/accuracy/speed/heading |
| `web_history` | In-app browser history | category + is_blocked |
| `parental_rules` | Time limits, app blocks, content filters | config jsonb |
| `device_commands` | Parent → device command queue | PENDING → DELIVERED → EXECUTED |

## Row Level Security (Supabase)

RLS is enabled on **all** tables. Policies are non-recursive: the
`is_admin()` / `is_operator_or_higher()` SECURITY DEFINER helpers look up the
caller's role without querying a policy-protected table from itself.

| Table | Read | Write |
|-------|------|-------|
| users | Authenticated | Self-update, admin insert/delete |
| devices | Authenticated | Operator+ |
| voice_commands | Authenticated | Authenticated (insert) |
| energy_readings | Authenticated | Authenticated (insert) |
| security_alerts | Authenticated | Operator+ |
| audit_logs | Admin only | Authenticated (insert only) |
| device_pairings | Own pairings | Operator+ |
| device_apps / parental_rules / device_commands | Authenticated | Operator+ |
| screen_time_sessions / location_pings / web_history | Authenticated | Authenticated (insert) |

Server API routes run with the secret key and bypass RLS; the policies guard
direct REST access from browsers and third parties.

## Triggers

- `update_updated_at()` — auto-updates `updated_at` on `users`, `devices`,
  `security_alerts`, `device_apps`, `parental_rules`
- `handle_new_user()` on `auth.users` INSERT — creates the `public.users`
  profile (first account → ADMIN)
- `handle_user_updated()` on `auth.users` UPDATE — syncs email/name changes

## Enums

| Enum | Values |
|------|--------|
| user_role | ADMIN, OPERATOR, MEMBER, VIEWER |
| device_type | PHONE, SPEAKER, WATCH, TABLET, HEADPHONES, DISPLAY, THERMOSTAT, CAMERA, LIGHT, LOCK, PLUG, TV, DOORBELL, GARAGE, VACUUM, FRIDGE |
| device_status | ONLINE, IDLE, OFFLINE, CHARGING |
| command_status | SUCCESS, PARTIAL, FAILED |
| alert_severity | CRITICAL, WARNING, INFO, SUCCESS |
| alert_status | OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED |
| pairing_status | PENDING, PAIRED, EXPIRED, REVOKED |
| parental_rule_type | APP_BLOCK, APP_TIME_LIMIT, SCREEN_TIME_LIMIT, BEDTIME, CONTENT_FILTER, LOCATION_GEOFENCE |
| device_command_type | LOCK_DEVICE … CLOSE_GARAGE (22 values) |
| device_command_status | PENDING, DELIVERED, EXECUTED, FAILED, EXPIRED |

## Seeding

The project starts **clean** — no demo data. Pair a device through the
companion app (`/companion` or the Android APK) or insert rows directly in
Supabase Studio's Table Editor.
