-- ─────────────────────────────────────────────────────────────────────
-- Aria Console — Real Device Monitoring Schema Additions
-- ─────────────────────────────────────────────────────────────────────
-- Adds tables for real device monitoring and parental controls.
-- Idempotent — safe to run multiple times.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ─────────────────────────────────────────────────────────────────────

-- ─── New enums ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PairingStatus" AS ENUM ('PENDING', 'PAIRED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ParentalRuleType" AS ENUM (
    'APP_BLOCK', 'APP_TIME_LIMIT', 'SCREEN_TIME_LIMIT',
    'BEDTIME', 'CONTENT_FILTER', 'LOCATION_GEOFENCE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DeviceCommandType" AS ENUM (
    'LOCK_DEVICE', 'UNLOCK_DEVICE', 'BLOCK_APP', 'UNBLOCK_APP',
    'SET_TIME_LIMIT', 'REQUEST_LOCATION', 'REQUEST_SCREENSHOT',
    'SEND_MESSAGE', 'RING_DEVICE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DeviceCommandStatus" AS ENUM ('PENDING', 'DELIVERED', 'EXECUTED', 'FAILED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── device_pairings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "device_pairings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "device_id" TEXT,
    "status" "PairingStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pairings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "device_pairings_code_key" ON "device_pairings"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "device_pairings_short_code_key" ON "device_pairings"("short_code");
CREATE INDEX IF NOT EXISTS "device_pairings_parent_id_idx" ON "device_pairings"("parent_id");
CREATE INDEX IF NOT EXISTS "device_pairings_short_code_idx" ON "device_pairings"("short_code");

DO $$ BEGIN
  ALTER TABLE "device_pairings" ADD CONSTRAINT "device_pairings_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "device_pairings" ADD CONSTRAINT "device_pairings_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── device_apps ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "device_apps" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "package_name" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "icon_url" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "daily_limit_min" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_apps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "device_apps_device_id_package_name_key" ON "device_apps"("device_id", "package_name");
CREATE INDEX IF NOT EXISTS "device_apps_device_id_idx" ON "device_apps"("device_id");

DO $$ BEGIN
  ALTER TABLE "device_apps" ADD CONSTRAINT "device_apps_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── screen_time_sessions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "screen_time_sessions" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "app_package" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_sec" INTEGER,

    CONSTRAINT "screen_time_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "screen_time_sessions_device_id_started_at_idx" ON "screen_time_sessions"("device_id", "started_at");
CREATE INDEX IF NOT EXISTS "screen_time_sessions_app_package_idx" ON "screen_time_sessions"("app_package");

DO $$ BEGIN
  ALTER TABLE "screen_time_sessions" ADD CONSTRAINT "screen_time_sessions_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── location_pings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "location_pings" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "address" TEXT,
    "battery" INTEGER,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_pings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "location_pings_device_id_recorded_at_idx" ON "location_pings"("device_id", "recorded_at");

DO $$ BEGIN
  ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── web_history ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "web_history" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "category" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "web_history_device_id_visited_at_idx" ON "web_history"("device_id", "visited_at");

DO $$ BEGIN
  ALTER TABLE "web_history" ADD CONSTRAINT "web_history_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── parental_rules ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "parental_rules" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "type" "ParentalRuleType" NOT NULL,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parental_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "parental_rules_device_id_idx" ON "parental_rules"("device_id");
CREATE INDEX IF NOT EXISTS "parental_rules_type_idx" ON "parental_rules"("type");

DO $$ BEGIN
  ALTER TABLE "parental_rules" ADD CONSTRAINT "parental_rules_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "parental_rules" ADD CONSTRAINT "parental_rules_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── device_commands ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "device_commands" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "type" "DeviceCommandType" NOT NULL,
    "payload" JSONB,
    "status" "DeviceCommandStatus" NOT NULL DEFAULT 'PENDING',
    "sent_by" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "result" JSONB,

    CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "device_commands_device_id_status_idx" ON "device_commands"("device_id", "status");
CREATE INDEX IF NOT EXISTS "device_commands_sent_at_idx" ON "device_commands"("sent_at");

DO $$ BEGIN
  ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_sent_by_fkey"
    FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── RLS policies for new tables ──────────────────────────────────
-- (Disable RLS for now to avoid the recursion issue; enable later
-- after the auth flow is tested. Service role key bypasses RLS anyway.)

ALTER TABLE "device_pairings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "device_apps" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "screen_time_sessions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "location_pings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "web_history" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "parental_rules" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "device_commands" DISABLE ROW LEVEL SECURITY;

-- ─── Verification ─────────────────────────────────────────────────
SELECT 'device_pairings' as table_name, count(*) as row_count FROM device_pairings
UNION ALL SELECT 'device_apps', count(*) FROM device_apps
UNION ALL SELECT 'screen_time_sessions', count(*) FROM screen_time_sessions
UNION ALL SELECT 'location_pings', count(*) FROM location_pings
UNION ALL SELECT 'web_history', count(*) FROM web_history
UNION ALL SELECT 'parental_rules', count(*) FROM parental_rules
UNION ALL SELECT 'device_commands', count(*) FROM device_commands;
