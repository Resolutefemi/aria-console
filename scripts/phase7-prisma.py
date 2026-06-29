#!/usr/bin/env python3
"""Phase 7: Prisma schema (model by model), db client, and seed script."""
import os
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
PRISMA = ROOT / "prisma"
SRC_LIB = ROOT / "src/lib"
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# 1. Initial prisma schema (datasource + generator only)
schema_v1 = """// Aria Console — Prisma schema
// Local development uses SQLite; production uses Supabase Postgres.
// To switch: change the provider to "postgresql" and update DATABASE_URL.

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
"""
(PRISMA / "schema.prisma").write_text(schema_v1)
commit(
    "feat(prisma): add Prisma schema with SQLite datasource\n\n- Generator: prisma-client-js\n- Datasource: SQLite (local dev), env-driven DATABASE_URL\n- Comment explains how to switch to Supabase Postgres for production",
    ["prisma/schema.prisma"],
)

# 2. Device model
schema_v2 = schema_v1 + """
/// A paired device in the voice-controlled smartphone system.
model Device {
  id        String   @id @default(cuid())
  deviceId  String   @unique /// Human-readable ID like "D-001"
  name      String
  type      DeviceType
  room      String
  status    DeviceStatus @default(ONLINE)
  battery   Int      @default(100) /// 0-100
  signal    Int      @default(-60) /// dBm
  ipAddress String?  @map("ip_address")
  firmware  String?  /// e.g. "3.8.2"
  lastSeenAt DateTime @default(now()) @map("last_seen_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  voiceCommands  VoiceCommand[]
  energyReadings EnergyReading[]

  @@map("devices")
}

enum DeviceType {
  PHONE
  SPEAKER
  WATCH
  TABLET
  HEADPHONES
  DISPLAY
  THERMOSTAT
  CAMERA
}

enum DeviceStatus {
  ONLINE
  IDLE
  OFFLINE
  CHARGING
}
"""
(PRISMA / "schema.prisma").write_text(schema_v2)
commit(
    "feat(prisma): add Device model with status and type enums\n\n- Device: id, deviceId (D-001), name, type, room, status, battery, signal, ip, firmware\n- DeviceType enum: PHONE, SPEAKER, WATCH, TABLET, HEADPHONES, DISPLAY, THERMOSTAT, CAMERA\n- DeviceStatus enum: ONLINE, IDLE, OFFLINE, CHARGING\n- Relations: VoiceCommand[], EnergyReading[]\n- Snake-case column names via @map for Postgres compatibility",
    ["prisma/schema.prisma"],
)

# 3. VoiceCommand model
schema_v3 = schema_v2 + """
/// A voice command issued to a device, with transcript and recognition metadata.
model VoiceCommand {
  id         String   @id @default(cuid())
  transcript String
  intent     String   /// e.g. "lights.on", "alarm.set"
  confidence Float    /// 0.0 to 1.0
  status     CommandStatus @default(SUCCESS)
  deviceId   String
  device     Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  issuedAt   DateTime @default(now()) @map("issued_at")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([deviceId])
  @@index([issuedAt])
  @@map("voice_commands")
}

enum CommandStatus {
  SUCCESS
  PARTIAL
  FAILED
}
"""
(PRISMA / "schema.prisma").write_text(schema_v3)
commit(
    "feat(prisma): add VoiceCommand model with confidence and status\n\n- VoiceCommand: transcript, intent, confidence (0-1), status\n- CommandStatus enum: SUCCESS, PARTIAL, FAILED\n- Relation to Device (cascade delete)\n- Indexes on deviceId and issuedAt for query performance\n- Maps to voice_commands table",
    ["prisma/schema.prisma"],
)

# 4. EnergyReading model
schema_v4 = schema_v3 + """
/// An energy consumption reading from a device at a specific timestamp.
model EnergyReading {
  id          String   @id @default(cuid())
  deviceId    String
  device      Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  kilowatts   Float    @map("kilowatts") /// Instantaneous power in kW
  wattHours   Float    @map("watt_hours") /// Energy consumed in this interval (Wh)
  recordedAt  DateTime @default(now()) @map("recorded_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([deviceId])
  @@index([recordedAt])
  @@map("energy_readings")
}
"""
(PRISMA / "schema.prisma").write_text(schema_v4)
commit(
    "feat(prisma): add EnergyReading model with kW and Wh fields\n\n- EnergyReading: kilowatts (instantaneous), wattHours (interval energy)\n- Relation to Device (cascade delete)\n- Indexes on deviceId and recordedAt for time-series queries\n- Maps to energy_readings table",
    ["prisma/schema.prisma"],
)

# 5. SecurityAlert model
schema_v5 = schema_v4 + """
/// A security event that requires operator attention.
model SecurityAlert {
  id          String   @id @default(cuid())
  title       String
  description String
  severity    AlertSeverity @default(INFO)
  status      AlertStatus    @default(OPEN)
  deviceId    String?
  device      Device?  @relation(fields: [deviceId], references: [id], onDelete: SetNull)
  metadata    String?  /// JSON-encoded additional context (SQLite has no JSON type)
  triggeredAt DateTime @default(now()) @map("triggered_at")
  acknowledgedAt DateTime? @map("acknowledged_at")
  acknowledgedBy String?  @map("acknowledged_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([severity])
  @@index([status])
  @@index([triggeredAt])
  @@map("security_alerts")
}

enum AlertSeverity {
  CRITICAL
  WARNING
  INFO
  SUCCESS
}

enum AlertStatus {
  OPEN
  ACKNOWLEDGED
  RESOLVED
  DISMISSED
}
"""
(PRISMA / "schema.prisma").write_text(schema_v5)
commit(
    "feat(prisma): add SecurityAlert model with severity and status\n\n- SecurityAlert: title, description, severity, status, optional device\n- AlertSeverity: CRITICAL, WARNING, INFO, SUCCESS\n- AlertStatus: OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED\n- Acknowledgment tracking: acknowledgedAt, acknowledgedBy\n- metadata field for JSON context (SQLite lacks JSON type)\n- Indexes on severity, status, triggeredAt",
    ["prisma/schema.prisma"],
)

# 6. User model
schema_v6 = schema_v5 + """
/// A console operator with role-based access.
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      UserRole @default(MEMBER)
  avatarUrl String?  @map("avatar_url")
  isActive  Boolean  @default(true) @map("is_active")
  lastLoginAt DateTime? @map("last_login_at")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  auditLogs AuditLog[]

  @@map("users")
}

enum UserRole {
  ADMIN
  OPERATOR
  MEMBER
  VIEWER
}
"""
(PRISMA / "schema.prisma").write_text(schema_v6)
commit(
    "feat(prisma): add User model with role-based access\n\n- User: email (unique), name, role, avatarUrl, isActive, lastLoginAt\n- UserRole enum: ADMIN, OPERATOR, MEMBER, VIEWER\n- Relation to AuditLog for accountability\n- Maps to users table",
    ["prisma/schema.prisma"],
)

# 7. AuditLog model
schema_v7 = schema_v6 + """
/// An immutable record of operator actions for compliance and debugging.
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String   /// e.g. "alert.acknowledge", "device.refresh"
  resource  String   /// e.g. "security_alert", "device"
  resourceId String? @map("resource_id")
  metadata  String?  /// JSON-encoded context
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
"""
(PRISMA / "schema.prisma").write_text(schema_v7)
commit(
    "feat(prisma): add AuditLog model for operator accountability\n\n- AuditLog: userId, action, resource, resourceId, metadata, ipAddress, userAgent\n- Relation to User (set null on delete to preserve history)\n- Indexes on userId, action, createdAt for compliance queries\n- Immutable (no updatedAt) — append-only by design\n- Maps to audit_logs table",
    ["prisma/schema.prisma"],
)

# 8. db client
db_client = """import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reloading can create multiple PrismaClient
 * instances, exhausting database connections. We cache the client on
 * globalThis to prevent this.
 *
 * In production, we create a new client per server process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
"""
(SRC_LIB / "db.ts").write_text(db_client)
commit(
    "feat(lib): add Prisma client singleton\n\n- Cache client on globalThis to survive hot-reload in dev\n- Verbose logging in development (query, error, warn)\n- Production: errors only\n- Standard Next.js + Prisma pattern",
    ["src/lib/db.ts"],
)

# 9. Generate Prisma client + push schema
print("Generating Prisma client and pushing schema...")
result = subprocess.run(["bun", "run", "db:generate"], capture_output=True, text=True)
if result.returncode != 0:
    print(f"db:generate failed: {result.stderr}")
result = subprocess.run(["bun", "run", "db:push"], capture_output=True, text=True)
if result.returncode != 0:
    print(f"db:push failed: {result.stderr}")
else:
    print("Schema pushed to SQLite database")

# 10. Seed script — initial structure with 8 devices
seed_v1 = """/**
 * Aria Console — Database seed script
 *
 * Run with: bun run db:seed
 *
 * Populates the database with realistic-looking sample data:
 * - 8 devices (phones, speakers, watches, tablets, headphones)
 * - 7 voice commands across those devices
 * - 12 hours of energy readings
 * - 6 security alerts of varying severity
 * - 1 admin user
 */
import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding Aria Console database...')

  // Clear existing data (order matters for FK constraints)
  await db.auditLog.deleteMany()
  await db.securityAlert.deleteMany()
  await db.energyReading.deleteMany()
  await db.voiceCommand.deleteMany()
  await db.device.deleteMany()
  await db.user.deleteMany()

  console.log('  ✓ Cleared existing data')

  // Seed content added in subsequent commits
  console.log('🌱 Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
"""
(PRISMA / "seed.ts").write_text(seed_v1)
# Add db:seed script to package.json
import json
pkg = json.loads((ROOT / "package.json").read_text())
pkg["scripts"]["db:seed"] = "bun run prisma/seed.ts"
(ROOT / "package.json").write_text(json.dumps(pkg, indent=2) + "\n")
commit(
    "feat(prisma): add database seed script scaffold\n\n- Clears all existing data (respects FK constraints)\n- Will populate devices, commands, energy, alerts, users in subsequent commits\n- Run with: bun run db:seed\n- Added db:seed script to package.json",
    ["prisma/seed.ts", "package.json"],
)

print(f"After phase 7: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
