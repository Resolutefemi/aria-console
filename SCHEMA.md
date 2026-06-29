# Database Schema — Aria Console

This document describes the database schema used by Aria Console. The schema is defined in two places:

1. **Prisma schema** — `prisma/schema.prisma` (used for local SQLite and Supabase Postgres via Prisma migrations)
2. **Raw SQL migrations** — `supabase/migrations/*.sql` (applied directly via Supabase SQL Editor)

Both define the same six tables. The Prisma schema is the source of truth; the SQL migrations mirror it.

## Tables

### `users`

Console operators with role-based access.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK, default gen_random_uuid() | Internal ID |
| email | text | unique, not null | Login email |
| name | text | not null | Display name |
| role | user_role | not null, default 'MEMBER' | ADMIN, OPERATOR, MEMBER, VIEWER |
| avatar_url | text | nullable | URL to avatar image |
| is_active | boolean | not null, default true | Soft-delete flag |
| last_login_at | timestamptz | nullable | Last successful login |
| created_at | timestamptz | not null, default now() | Creation timestamp |
| updated_at | timestamptz | not null, default now() | Last update (auto-updated via trigger) |

### `devices`

Paired devices in the voice-controlled smartphone system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | Internal ID |
| device_id | text | unique, not null | Human-readable (D-001) |
| name | text | not null | Display name |
| type | device_type | not null | PHONE, SPEAKER, WATCH, TABLET, HEADPHONES, DISPLAY, THERMOSTAT, CAMERA |
| room | text | not null | Physical location |
| status | device_status | not null, default 'ONLINE' | ONLINE, IDLE, OFFLINE, CHARGING |
| battery | integer | not null, default 100 | 0-100 (check constraint) |
| signal | integer | not null, default -60 | Wi-Fi signal in dBm |
| ip_address | text | nullable | LAN IP address |
| firmware | text | nullable | Firmware version |
| last_seen_at | timestamptz | not null, default now() | Last heartbeat |
| created_at | timestamptz | not null, default now() | Pairing timestamp |
| updated_at | timestamptz | not null, default now() | Last update |

**Indexes**: status, room, last_seen_at desc

### `voice_commands`

Voice commands issued to devices.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | Internal ID |
| transcript | text | not null | Spoken words |
| intent | text | not null | Categorized intent (lights.on, alarm.set, etc.) |
| confidence | real | not null, 0-1 | Recognition confidence |
| status | command_status | not null, default 'SUCCESS' | SUCCESS, PARTIAL, FAILED |
| device_id | text | FK → devices(id) on delete cascade | Target device |
| issued_at | timestamptz | not null, default now() | When command was spoken |
| created_at | timestamptz | not null, default now() | Record creation |

**Indexes**: device_id, issued_at desc, status

### `energy_readings`

Per-device energy consumption readings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | Internal ID |
| device_id | text | FK → devices(id) on delete cascade | Source device |
| kilowatts | real | not null, >= 0 | Instantaneous power |
| watt_hours | real | not null, >= 0 | Energy in this interval |
| recorded_at | timestamptz | not null, default now() | Reading timestamp |
| created_at | timestamptz | not null, default now() | Record creation |

**Indexes**: device_id, recorded_at desc, (device_id, recorded_at desc) composite

### `security_alerts`

Security events requiring operator attention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | Internal ID |
| title | text | not null | Short title |
| description | text | not null | Detailed description |
| severity | alert_severity | not null, default 'INFO' | CRITICAL, WARNING, INFO, SUCCESS |
| status | alert_status | not null, default 'OPEN' | OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED |
| device_id | text | FK → devices(id) on delete set null, nullable | Related device (optional) |
| metadata | jsonb | nullable | Additional context |
| triggered_at | timestamptz | not null, default now() | When alert fired |
| acknowledged_at | timestamptz | nullable | When operator acknowledged |
| acknowledged_by | text | nullable | User ID of acknowledger |
| created_at | timestamptz | not null, default now() | Record creation |
| updated_at | timestamptz | not null, default now() | Last update |

**Indexes**: severity, status, triggered_at desc, (severity, status) composite

### `audit_logs`

Immutable record of operator actions. Append-only.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | Internal ID |
| user_id | text | FK → users(id) on delete set null, nullable | Acting user |
| action | text | not null | e.g. alert.acknowledged |
| resource | text | not null | e.g. security_alert |
| resource_id | text | nullable | ID of affected resource |
| metadata | jsonb | nullable | JSON-encoded context |
| ip_address | inet | nullable | Request IP (Postgres native) |
| user_agent | text | nullable | Browser user agent |
| created_at | timestamptz | not null, default now() | Action timestamp |

**Indexes**: user_id, action, created_at desc

## Row Level Security (Supabase)

When deployed to Supabase, RLS is enabled on all tables. See [`supabase/README.md`](./supabase/README.md) for the full policy reference.

| Table | Read | Write |
|-------|------|-------|
| users | Anyone | Admin only |
| devices | Authenticated | Operator+ |
| voice_commands | Authenticated | Authenticated (insert) |
| energy_readings | Authenticated | Authenticated (insert) |
| security_alerts | Authenticated | Operator+ |
| audit_logs | Admin only | Authenticated (insert only) |

## Triggers

- `update_updated_at()` — Auto-updates `updated_at` on row change. Applied to `devices` and `security_alerts`.

## Enums

| Enum | Values |
|------|--------|
| user_role | ADMIN, OPERATOR, MEMBER, VIEWER |
| device_type | PHONE, SPEAKER, WATCH, TABLET, HEADPHONES, DISPLAY, THERMOSTAT, CAMERA |
| device_status | ONLINE, IDLE, OFFLINE, CHARGING |
| command_status | SUCCESS, PARTIAL, FAILED |
| alert_severity | CRITICAL, WARNING, INFO, SUCCESS |
| alert_status | OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED |

## Seeding

Run `bun run db:seed` to populate the database with:

- 1 admin user (ola.kperogi@aria.example)
- 30 devices (D-001 through D-030) across 9 rooms
- 7 voice commands
- 12 hours of energy readings per active device
- 6 security alerts (2 critical, 2 warning, 1 info, 1 success)

The seed script is idempotent — it clears all data before inserting, so it's safe to re-run.
