/**
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
    { deviceId: 'D-012', name: 'Backyard Camera', type: 'CAMERA', room: 'Backyard', status: 'IDLE', battery: 76, signal: -78, ipAddress: '10.0.1.141', firmware: '2.4.1' },
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
      description: 'Aria Cloud account accessed from Lekki, Lagos — a new location. If this wasn\'t you, review active sessions.',
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

  console.log('\n🌱 Seed complete!')
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
