#!/usr/bin/env python3
"""Phase 8: Seed script with data + API routes + Supabase SQL schema."""
import os
import subprocess
import json
from pathlib import Path

ROOT = Path("/home/z/my-project")
PRISMA = ROOT / "prisma"
API = ROOT / "src/app/api"
SUPABASE = ROOT / "supabase"
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# ─── Seed script with all data ───
seed_full = """/**
 * Aria Console — Database seed script
 *
 * Run with: bun run db:seed
 *
 * Populates the database with realistic-looking sample data:
 * - 8 devices (phones, speakers, watches, tablets, headphones)
 * - 7 voice commands across those devices
 * - 12 hours of energy readings (per device, hourly)
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

  // ─── User ──────────────────────────────────────────────
  const admin = await db.user.create({
    data: {
      email: 'ola.kperogi@aria.example',
      name: 'Ola Kperogi',
      role: 'ADMIN',
      lastLoginAt: new Date(),
    },
  })
  console.log(`  ✓ Created admin user: ${admin.email}`)

  // ─── Devices ──────────────────────────────────────────
  const deviceData = [
    { deviceId: 'D-001', name: "Ola's iPhone 15 Pro", type: 'PHONE', room: 'Personal', status: 'ONLINE', battery: 87, signal: -58, ipAddress: '10.0.1.24', firmware: '17.4.1' },
    { deviceId: 'D-002', name: 'Living Room Speaker', type: 'SPEAKER', room: 'Living Room', status: 'ONLINE', battery: 100, signal: -42, ipAddress: '10.0.1.51', firmware: '4.2.1' },
    { deviceId: 'D-003', name: 'Kitchen Display', type: 'DISPLAY', room: 'Kitchen', status: 'IDLE', battery: 64, signal: -71, ipAddress: '10.0.1.62', firmware: '4.2.1' },
    { deviceId: 'D-004', name: 'Bedroom Hub', type: 'SPEAKER', room: 'Bedroom', status: 'CHARGING', battery: 42, signal: -55, ipAddress: '10.0.1.73', firmware: '3.8.2' },
    { deviceId: 'D-005', name: 'Galaxy Watch6', type: 'WATCH', room: 'Personal', status: 'ONLINE', battery: 73, signal: -67, ipAddress: '10.0.1.88', firmware: '2.1.0' },
    { deviceId: 'D-006', name: 'AirPods Pro', type: 'HEADPHONES', room: 'Personal', status: 'ONLINE', battery: 28, signal: -49, ipAddress: '10.0.1.91', firmware: '7B19' },
    { deviceId: 'D-007', name: 'Office iPad', type: 'TABLET', room: 'Office', status: 'OFFLINE', battery: 12, signal: 0, ipAddress: '10.0.1.104', firmware: '17.4.1' },
    { deviceId: 'D-008', name: 'Garage Speaker', type: 'SPEAKER', room: 'Garage', status: 'IDLE', battery: 91, signal: -84, ipAddress: '10.0.1.112', firmware: '4.1.7' },
  ]

  const devices = []
  for (const d of deviceData) {
    const device = await db.device.create({
      data: {
        ...d,
        lastSeenAt: d.status === 'OFFLINE' ? new Date(Date.now() - 2 * 60 * 60 * 1000) : new Date(),
      },
    })
    devices.push(device)
  }
  console.log(`  ✓ Created ${devices.length} devices`)

  // ─── Voice commands ───────────────────────────────────
  const commands = [
    { transcript: 'Turn on the living room lights at 60% brightness', intent: 'lights.on', confidence: 0.97, status: 'SUCCESS', deviceId: devices[1].id, minutesAgo: 8 },
    { transcript: 'Set an alarm for 7 AM tomorrow', intent: 'alarm.set', confidence: 0.99, status: 'SUCCESS', deviceId: devices[0].id, minutesAgo: 12 },
    { transcript: 'Play my focus playlist on the bedroom speaker', intent: 'media.play', confidence: 0.92, status: 'SUCCESS', deviceId: devices[3].id, minutesAgo: 19 },
    { transcript: 'What is the weather forecast for the weekend', intent: 'weather.query', confidence: 0.78, status: 'PARTIAL', deviceId: devices[2].id, minutesAgo: 26 },
    { transcript: 'Call mum on speakerphone', intent: 'call.initiate', confidence: 0.95, status: 'SUCCESS', deviceId: devices[0].id, minutesAgo: 33 },
    { transcript: 'Remind me to take out the trash at 6', intent: 'reminder.create', confidence: 0.41, status: 'FAILED', deviceId: devices[4].id, minutesAgo: 42 },
    { transcript: 'Decrease the thermostat by two degrees', intent: 'climate.adjust', confidence: 0.94, status: 'SUCCESS', deviceId: devices[1].id, minutesAgo: 50 },
  ]

  for (const c of commands) {
    await db.voiceCommand.create({
      data: {
        transcript: c.transcript,
        intent: c.intent,
        confidence: c.confidence,
        status: c.status,
        deviceId: c.deviceId,
        issuedAt: new Date(Date.now() - c.minutesAgo * 60 * 1000),
      },
    })
  }
  console.log(`  ✓ Created ${commands.length} voice commands`)

  // ─── Energy readings (12 hours of data per device) ────
  const now = new Date()
  for (const device of devices) {
    // Skip offline devices — they don't report
    if (device.status === 'OFFLINE') continue

    for (let h = 11; h >= 0; h--) {
      const recordedAt = new Date(now.getTime() - h * 60 * 60 * 1000)
      // Speech-like pattern: low at night, peak in evening
      const hourOfDay = recordedAt.getHours()
      let baseKw = 0.3 // baseline
      if (hourOfDay >= 7 && hourOfDay < 10) baseKw = 0.8 // morning
      else if (hourOfDay >= 10 && hourOfDay < 17) baseKw = 1.2 // daytime
      else if (hourOfDay >= 17 && hourOfDay < 22) baseKw = 1.8 // evening peak
      else baseKw = 0.4 // night

      // Per-device variation
      const deviceMultiplier = device.type === 'SPEAKER' ? 1.4 : device.type === 'DISPLAY' ? 1.1 : 0.7
      const noise = (Math.random() - 0.5) * 0.2
      const kilowatts = Math.max(0.05, baseKw * deviceMultiplier + noise)

      await db.energyReading.create({
        data: {
          deviceId: device.id,
          kilowatts: parseFloat(kilowatts.toFixed(3)),
          wattHours: parseFloat((kilowatts * 1000).toFixed(1)),
          recordedAt,
        },
      })
    }
  }
  console.log(`  ✓ Created energy readings (12h × 7 active devices)`)

  // ─── Security alerts ──────────────────────────────────
  const alerts = [
    {
      title: 'Unrecognized voice profile',
      description: 'An unregistered voice attempted to issue the command "unlock front door". Access was denied and the event was logged.',
      severity: 'CRITICAL',
      deviceId: devices[1].id,
      triggeredAt: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
      title: 'Microphone access blocked',
      description: 'App "QuickWeather" requested background microphone access. Request auto-denied per privacy policy.',
      severity: 'CRITICAL',
      deviceId: devices[0].id,
      triggeredAt: new Date(Date.now() - 47 * 60 * 1000),
    },
    {
      title: 'Unusual location sign-in',
      description: 'Aria Cloud account accessed from Lekki, Lagos — a new location. If this wasn\\'t you, review active sessions.',
      severity: 'WARNING',
      deviceId: null,
      triggeredAt: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      title: 'Device firmware out of date',
      description: 'Bedroom Hub is running firmware 3.8.2 — version 4.0.1 patches CVE-2025-31822. Update recommended.',
      severity: 'WARNING',
      deviceId: devices[3].id,
      triggeredAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      title: 'New device paired',
      description: 'Galaxy Watch6 was successfully paired to your Aria account. Biometric binding completed.',
      severity: 'INFO',
      deviceId: devices[4].id,
      triggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      title: 'Security scan completed',
      description: 'Weekly security scan finished. No anomalies detected across 12 devices, 47 permissions, and 3 networks.',
      severity: 'SUCCESS',
      deviceId: null,
      triggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
    },
  ]

  for (const a of alerts) {
    await db.securityAlert.create({
      data: {
        title: a.title,
        description: a.description,
        severity: a.severity,
        status: 'OPEN',
        deviceId: a.deviceId,
        triggeredAt: a.triggeredAt,
      },
    })
  }
  console.log(`  ✓ Created ${alerts.length} security alerts`)

  console.log('\\n🌱 Seed complete!')
  console.log(`  Login as: ${admin.email}`)
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
(PRISMA / "seed.ts").write_text(seed_full)
commit(
    "feat(prisma): add full seed script with realistic data\n\n- 1 admin user (Ola Kperogi)\n- 8 devices across 6 rooms (phone, speaker, display, watch, headphones, tablet)\n- 7 voice commands with transcripts, intents, confidence, status\n- 12 hours of energy readings per active device (speech-like diurnal pattern)\n- 6 security alerts: 2 critical, 2 warning, 1 info, 1 success\n- Run with: bun run db:seed",
    ["prisma/seed.ts"],
)

# Run the seed
print("Running seed...")
result = subprocess.run(["bun", "run", "db:seed"], capture_output=True, text=True)
print(result.stdout[-500:] if result.stdout else "")
if result.returncode != 0:
    print(f"Seed error: {result.stderr[-500:]}")
else:
    print("Seed successful")

# ─── API routes (each as own commit) ───
api_routes = [
    {
        "path": "src/app/api/devices/route.ts",
        "msg": "feat(api): add GET /api/devices endpoint\n\n- Returns all devices with related voice commands count\n- Supports optional ?status= filter (ONLINE, IDLE, OFFLINE, CHARGING)\n- Supports optional ?room= filter\n- Returns 200 with array, 500 on error",
        "content": """import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const room = searchParams.get('room')

    const devices = await db.device.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(room ? { room } : {}),
      },
      include: {
        _count: {
          select: { voiceCommands: true, energyReadings: true, securityAlerts: true },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    })

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('GET /api/devices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}
""",
    },
    {
        "path": "src/app/api/voice/commands/route.ts",
        "msg": "feat(api): add GET /api/voice/commands endpoint\n\n- Returns recent voice commands with device info\n- Default limit: 50, max: 200\n- Supports ?deviceId= filter\n- Supports ?status= filter (SUCCESS, PARTIAL, FAILED)\n- Ordered by issuedAt desc",
        "content": """import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const deviceId = searchParams.get('deviceId')
    const status = searchParams.get('status')

    const commands = await db.voiceCommand.findMany({
      where: {
        ...(deviceId ? { deviceId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { device: true },
      orderBy: { issuedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ commands })
  } catch (error) {
    console.error('GET /api/voice/commands error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice commands' },
      { status: 500 }
    )
  }
}
""",
    },
    {
        "path": "src/app/api/voice/stats/route.ts",
        "msg": "feat(api): add GET /api/voice/stats endpoint\n\n- Returns today's command count, average confidence, success rate\n- Also returns last 7 days of daily counts for sparkline\n- Computed via Prisma aggregations",
        "content": """import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [todayCommands, allTodayCommands, last7Days] = await Promise.all([
      db.voiceCommand.aggregate({
        where: { issuedAt: { gte: startOfToday } },
        _avg: { confidence: true },
        _count: true,
      }),
      db.voiceCommand.groupBy({
        by: ['status'],
        where: { issuedAt: { gte: startOfToday } },
        _count: true,
      }),
      db.voiceCommand.findMany({
        where: { issuedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
        select: { issuedAt: true, status: true },
      }),
    ])

    const successCount = allTodayCommands.find((g) => g.status === 'SUCCESS')?._count ?? 0
    const totalCount = todayCommands._count
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0

    // Build 7-day sparkline data
    const dailyCounts: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const count = last7Days.filter(
        (c) => c.issuedAt >= dayStart && c.issuedAt < dayEnd
      ).length
      dailyCounts.push({
        date: dayStart.toISOString().slice(0, 10),
        count,
      })
    }

    return NextResponse.json({
      todayCount: totalCount,
      avgConfidence: todayCommands._avg.confidence ?? 0,
      successRate,
      dailyCounts,
    })
  } catch (error) {
    console.error('GET /api/voice/stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice stats' },
      { status: 500 }
    )
  }
}
""",
    },
    {
        "path": "src/app/api/energy/route.ts",
        "msg": "feat(api): add GET /api/energy endpoint\n\n- Returns hourly consumption aggregated across all devices for the last 24h\n- Returns per-device breakdown with total kWh and percentage\n- Returns summary: totalKwh, peakKw, peakHour, estimatedMonthlyCost",
        "content": """import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') ?? '24')
    const now = new Date()
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000)

    const readings = await db.energyReading.findMany({
      where: { recordedAt: { gte: since } },
      include: { device: { select: { name: true, id: true } } },
      orderBy: { recordedAt: 'asc' },
    })

    // Aggregate by hour
    const hourly: { t: string; kw: number }[] = []
    for (let h = hours - 1; h >= 0; h--) {
      const hourStart = new Date(now.getTime() - h * 60 * 60 * 1000)
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
      const inHour = readings.filter(
        (r) => r.recordedAt >= hourStart && r.recordedAt < hourEnd
      )
      const avgKw = inHour.length > 0
        ? inHour.reduce((s, r) => s + r.kilowatts, 0) / inHour.length
        : 0
      hourly.push({
        t: hourStart.getHours().toString().padStart(2, '0'),
        kw: parseFloat(avgKw.toFixed(2)),
      })
    }

    // Per-device breakdown
    const deviceMap = new Map<string, { name: string; kwh: number }>()
    for (const r of readings) {
      const existing = deviceMap.get(r.deviceId) ?? { name: r.device.name, kwh: 0 }
      existing.kwh += r.wattHours / 1000 // Wh to kWh
      deviceMap.set(r.deviceId, existing)
    }
    const totalKwh = parseFloat(
      Array.from(deviceMap.values()).reduce((s, d) => s + d.kwh, 0).toFixed(2)
    )
    const byDevice = Array.from(deviceMap.entries())
      .map(([id, d]) => ({
        id,
        name: d.name,
        kwh: parseFloat(d.kwh.toFixed(2)),
        pct: totalKwh > 0 ? Math.round((d.kwh / totalKwh) * 100) : 0,
      }))
      .sort((a, b) => b.kwh - a.kwh)

    const peakKw = Math.max(...hourly.map((h) => h.kw), 0)
    const peakHourIdx = hourly.findIndex((h) => h.kw === peakKw)
    const peakHour = peakHourIdx >= 0 ? hourly[peakHourIdx].t : '00'

    // Estimate monthly cost: 0.025 USD/kWh equivalent in NGN ~ 38 NGN/kWh
    const estimatedMonthlyCost = Math.round(totalKwh * 30 * 38)

    return NextResponse.json({
      hourly,
      byDevice,
      summary: {
        totalKwh,
        peakKw: parseFloat(peakKw.toFixed(1)),
        peakHour,
        estimatedMonthlyCost,
      },
    })
  } catch (error) {
    console.error('GET /api/energy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch energy data' },
      { status: 500 }
    )
  }
}
""",
    },
    {
        "path": "src/app/api/security/alerts/route.ts",
        "msg": "feat(api): add GET /api/security/alerts endpoint\n\n- Returns recent security alerts with optional device info\n- Supports ?severity= filter (CRITICAL, WARNING, INFO, SUCCESS)\n- Supports ?status= filter (OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED)\n- Default limit: 50\n- Ordered by triggeredAt desc",
        "content": """import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')

    const alerts = await db.securityAlert.findMany({
      where: {
        ...(severity ? { severity: severity as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { device: { select: { name: true, deviceId: true } } },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('GET /api/security/alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 }
    )
  }
}
""",
    },
    {
        "path": "src/app/api/security/alerts/[id]/route.ts",
        "msg": "feat(api): add PATCH /api/security/alerts/[id] endpoint\n\n- Updates alert status (ACKNOWLEDGED, RESOLVED, DISMISSED)\n- Records acknowledgedAt and acknowledgedBy on acknowledge\n- Returns updated alert with device info\n- Used by Investigate/Dismiss buttons in UI",
        "content": """import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, acknowledgedBy } = body

    const alert = await db.securityAlert.update({
      where: { id },
      data: {
        status,
        ...(status === 'ACKNOWLEDGED' && {
          acknowledgedAt: new Date(),
          acknowledgedBy: acknowledgedBy ?? 'system',
        }),
      },
      include: { device: { select: { name: true, deviceId: true } } },
    })

    return NextResponse.json({ alert })
  } catch (error) {
    console.error('PATCH /api/security/alerts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
""",
    },
    {
        "path": "src/app/api/stats/overview/route.ts",
        "msg": "feat(api): add GET /api/stats/overview endpoint\n\n- Returns KPI metrics for the top stats cards:\n  - connectedDevices (count + total paired)\n  - voiceCommandsToday (count + delta vs yesterday)\n  - energyUsageToday (kWh + delta)\n  - activeAlerts (critical count + delta)\n- Single round-trip for the dashboard header",
        "content": """import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)

    const [
      allDevices,
      todayCommands,
      yesterdayCommands,
      todayEnergy,
      yesterdayEnergy,
      criticalAlerts,
      lastHourAlerts,
    ] = await Promise.all([
      db.device.findMany({ select: { status: true } }),
      db.voiceCommand.count({ where: { issuedAt: { gte: startOfToday } } }),
      db.voiceCommand.count({
        where: { issuedAt: { gte: startOfYesterday, lt: startOfToday } },
      }),
      db.energyReading.aggregate({
        where: { recordedAt: { gte: startOfToday } },
        _sum: { wattHours: true },
      }),
      db.energyReading.aggregate({
        where: { recordedAt: { gte: startOfYesterday, lt: startOfToday } },
        _sum: { wattHours: true },
      }),
      db.securityAlert.count({ where: { severity: 'CRITICAL', status: 'OPEN' } }),
      db.securityAlert.count({
        where: {
          severity: 'CRITICAL',
          triggeredAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
        },
      }),
    ])

    const onlineCount = allDevices.filter((d) => d.status === 'ONLINE').length
    const offlineCount = allDevices.filter((d) => d.status === 'OFFLINE').length
    const todayKwh = (todayEnergy._sum.wattHours ?? 0) / 1000
    const yesterdayKwh = (yesterdayEnergy._sum.wattHours ?? 0) / 1000

    const commandDelta = yesterdayCommands > 0
      ? Math.round(((todayCommands - yesterdayCommands) / yesterdayCommands) * 100)
      : 0

    return NextResponse.json({
      connectedDevices: {
        count: onlineCount,
        total: allDevices.length,
        offline: offlineCount,
      },
      voiceCommandsToday: {
        count: todayCommands,
        deltaPct: commandDelta,
      },
      energyUsageToday: {
        kwh: parseFloat(todayKwh.toFixed(2)),
        deltaKwh: parseFloat((todayKwh - yesterdayKwh).toFixed(2)),
      },
      activeAlerts: {
        critical: criticalAlerts,
        lastHour: lastHourAlerts,
      },
    })
  } catch (error) {
    console.error('GET /api/stats/overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overview stats' },
      { status: 500 }
    )
  }
}
""",
    },
]

for route in api_routes:
    path = ROOT / route["path"]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(route["content"])
    commit(route["msg"], [route["path"]])

print(f"After phase 8: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()} commits")
