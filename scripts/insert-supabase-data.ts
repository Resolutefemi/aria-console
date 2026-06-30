/**
 * Insert additional voice commands and energy readings into Supabase.
 */
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPA_URL, SRV_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  // 1. Insert additional voice commands
  console.log('Inserting additional voice commands...')

  const { data: existingCmds } = await supabase
    .from('voice_commands')
    .select('transcript')
  const existingTranscripts = new Set((existingCmds ?? []).map((c: any) => c.transcript))
  console.log(`Already in Supabase: ${existingTranscripts.size} commands`)

  // Get device IDs (need the cuid for the device_id field)
  const { data: devices } = await supabase
    .from('devices')
    .select('id, device_id')
  const deviceMap = new Map((devices ?? []).map((d: any) => [d.device_id, d.id]))

  const newCommands = [
    { device_id: 'D-002', transcript: 'Lock the front door', intent: 'door.lock', confidence: 0.96, status: 'SUCCESS', minutesAgo: 65 },
    { device_id: 'D-001', transcript: 'What time is it in London', intent: 'time.query', confidence: 0.99, status: 'SUCCESS', minutesAgo: 73 },
    { device_id: 'D-001', transcript: 'Send a message to mum saying I will call later', intent: 'message.send', confidence: 0.88, status: 'SUCCESS', minutesAgo: 88 },
    { device_id: 'D-002', transcript: 'Add milk to my shopping list', intent: 'list.add', confidence: 0.93, status: 'SUCCESS', minutesAgo: 95 },
    { device_id: 'D-004', transcript: 'Skip this song', intent: 'media.skip', confidence: 0.91, status: 'SUCCESS', minutesAgo: 110 },
    { device_id: 'D-003', transcript: 'Set a timer for 12 minutes', intent: 'timer.set', confidence: 0.97, status: 'SUCCESS', minutesAgo: 125 },
    { device_id: 'D-002', transcript: 'How many calories in an apple', intent: 'nutrition.query', confidence: 0.85, status: 'SUCCESS', minutesAgo: 140 },
    { device_id: 'D-008', transcript: 'Open the garage door', intent: 'door.open', confidence: 0.42, status: 'FAILED', minutesAgo: 155 },
    { device_id: 'D-001', transcript: 'Translate hello to Spanish', intent: 'translate', confidence: 0.94, status: 'SUCCESS', minutesAgo: 170 },
    { device_id: 'D-001', transcript: 'How far is the airport from here', intent: 'distance.query', confidence: 0.71, status: 'PARTIAL', minutesAgo: 185 },
  ]

  const cmdsToInsert = newCommands
    .filter((c) => !existingTranscripts.has(c.transcript))
    .map((c) => ({
      transcript: c.transcript,
      intent: c.intent,
      confidence: c.confidence,
      status: c.status,
      device_id: deviceMap.get(c.device_id),
      issued_at: new Date(Date.now() - c.minutesAgo * 60 * 1000).toISOString(),
    }))
    .filter((c) => c.device_id) // skip if device not found

  console.log(`To insert: ${cmdsToInsert.length} commands`)

  if (cmdsToInsert.length > 0) {
    const { error } = await supabase.from('voice_commands').insert(cmdsToInsert)
    if (error) {
      console.error('Failed to insert commands:', error.message)
    } else {
      console.log(`  ✓ Inserted ${cmdsToInsert.length} commands`)
    }
  }

  // 2. Insert energy readings for the last 12 hours
  console.log('\nInserting energy readings for last 12h...')

  const { count: existingReadings } = await supabase
    .from('energy_readings')
    .select('*', { count: 'exact', head: true })
  console.log(`Existing energy_readings: ${existingReadings ?? 0}`)

  if ((existingReadings ?? 0) > 0) {
    console.log('Energy readings already exist — skipping.')
  } else {
    const now = new Date()
    const readings: any[] = []

    for (const device of devices ?? []) {
      if (device.device_id === 'D-007') continue // offline device

      for (let h = 11; h >= 0; h--) {
        const recordedAt = new Date(now.getTime() - h * 60 * 60 * 1000)
        const hourOfDay = recordedAt.getHours()
        let baseKw = 0.3
        if (hourOfDay >= 7 && hourOfDay < 10) baseKw = 0.8
        else if (hourOfDay >= 10 && hourOfDay < 17) baseKw = 1.2
        else if (hourOfDay >= 17 && hourOfDay < 22) baseKw = 1.8
        else baseKw = 0.4

        const deviceMultiplier =
          device.device_id?.type === 'SPEAKER' ? 1.4 :
          device.device_id?.type === 'DISPLAY' ? 1.1 : 0.7
        const noise = (Math.random() - 0.5) * 0.2
        const kilowatts = Math.max(0.05, baseKw * deviceMultiplier + noise)

        readings.push({
          device_id: device.id,
          kilowatts: parseFloat(kilowatts.toFixed(3)),
          watt_hours: parseFloat((kilowatts * 1000).toFixed(1)),
          recorded_at: recordedAt.toISOString(),
        })
      }
    }

    console.log(`Inserting ${readings.length} readings in batches...`)

    // Insert in batches of 50
    for (let i = 0; i < readings.length; i += 50) {
      const batch = readings.slice(i, i + 50)
      const { error } = await supabase.from('energy_readings').insert(batch)
      if (error) {
        console.error(`Batch ${i / 50 + 1} failed:`, error.message)
        break
      }
      if ((i / 50 + 1) % 5 === 0) {
        console.log(`  ✓ Inserted ${Math.min(i + 50, readings.length)}/${readings.length}`)
      }
    }
  }

  // Verify counts
  console.log('\n--- Final Supabase state ---')
  for (const table of ['devices', 'voice_commands', 'energy_readings', 'security_alerts', 'audit_logs', 'users']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    console.log(`  ${table}: ${count ?? 0}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
