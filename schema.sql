-- ─────────────────────────────────────────────────────────────────────
-- Aria Console — Supabase Postgres Schema (idempotent, safe to re-run)
-- ─────────────────────────────────────────────────────────────────────
-- Generated from prisma/schema.prisma via `prisma migrate diff`.
-- All CREATE statements use IF NOT EXISTS so this file is safe to run
-- multiple times — existing objects are skipped, missing ones are created.
--
-- To reset everything and start fresh instead, run:
--   DROP SCHEMA public CASCADE;
--   CREATE SCHEMA public;
-- ...then run this file.
--
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ─────────────────────────────────────────────────────────────────────

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum (uses DO block so it's idempotent)
DO $$ BEGIN
  CREATE TYPE "DeviceType" AS ENUM ('PHONE', 'SPEAKER', 'WATCH', 'TABLET', 'HEADPHONES', 'DISPLAY', 'THERMOSTAT', 'CAMERA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'IDLE', 'OFFLINE', 'CHARGING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CommandStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO', 'SUCCESS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'MEMBER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable (uses IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "devices" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "room" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ONLINE',
    "battery" INTEGER NOT NULL DEFAULT 100,
    "signal" INTEGER NOT NULL DEFAULT -60,
    "ip_address" TEXT,
    "firmware" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "voice_commands" (
    "id" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'SUCCESS',
    "device_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_commands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "energy_readings" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "kilowatts" DOUBLE PRECISION NOT NULL,
    "watt_hours" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_readings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "security_alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "device_id" TEXT,
    "metadata" JSONB,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (uses IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "devices_device_id_key" ON "devices"("device_id");
CREATE INDEX IF NOT EXISTS "voice_commands_device_id_idx" ON "voice_commands"("device_id");
CREATE INDEX IF NOT EXISTS "voice_commands_issued_at_idx" ON "voice_commands"("issued_at");
CREATE INDEX IF NOT EXISTS "energy_readings_device_id_idx" ON "energy_readings"("device_id");
CREATE INDEX IF NOT EXISTS "energy_readings_recorded_at_idx" ON "energy_readings"("recorded_at");
CREATE INDEX IF NOT EXISTS "security_alerts_severity_idx" ON "security_alerts"("severity");
CREATE INDEX IF NOT EXISTS "security_alerts_status_idx" ON "security_alerts"("status");
CREATE INDEX IF NOT EXISTS "security_alerts_triggered_at_idx" ON "security_alerts"("triggered_at");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey (uses DO block so it's idempotent)
DO $$ BEGIN
  ALTER TABLE "voice_commands" ADD CONSTRAINT "voice_commands_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Verification queries (run after the above to confirm everything's in place)
-- ─────────────────────────────────────────────────────────────────────
-- SELECT count(*) AS device_count FROM devices;
-- SELECT count(*) AS user_count FROM users;
-- SELECT count(*) AS alert_count FROM security_alerts;
