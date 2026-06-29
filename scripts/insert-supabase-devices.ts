/**
 * Insert the 22 new devices (D-009 through D-030) into Supabase.
 * Uses the service_role key — bypasses RLS.
 * Idempotent: skips devices that already exist.
 */
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPA_URL, SRV_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const newDevices = [
  { device_id: 'D-009', name: 'Home Theater Soundbar', type: 'SPEAKER', room: 'Living Room', status: 'ONLINE', battery: 95, signal: -40, ip_address: '10.0.1.121', firmware: '4.2.1' },
  { device_id: 'D-010', name: 'Nest Thermostat', type: 'THERMOSTAT', room: 'Hallway', status: 'ONLINE', battery: 100, signal: -52, ip_address: '10.0.1.130', firmware: '6.2.0' },
  { device_id: 'D-011', name: 'Front Door Camera', type: 'CAMERA', room: 'Entrance', status: 'ONLINE', battery: 88, signal: -63, ip_address: '10.0.1.140', firmware: '2.4.1' },
  { device_id: 'D-012', name: 'Backyard Camera', type: 'CAMERA', room: 'Backyard', status: 'IDLE', battery: 76, signal: -78, ip_address: '10.0.1.141', firmware: '2.4.1' },
  { device_id: 'D-013', name: 'Garage Door Opener', type: 'DISPLAY', room: 'Garage', status: 'ONLINE', battery: 100, signal: -55, ip_address: '10.0.1.150', firmware: '1.8.3' },
  { device_id: 'D-014', name: 'Smart Fridge', type: 'DISPLAY', room: 'Kitchen', status: 'ONLINE', battery: 100, signal: -48, ip_address: '10.0.1.160', firmware: '9.1.2' },
  { device_id: 'D-015', name: 'Robot Vacuum', type: 'DISPLAY', room: 'Living Room', status: 'CHARGING', battery: 23, signal: -65, ip_address: '10.0.1.170', firmware: '3.7.4' },
  { device_id: 'D-016', name: 'Smart Light Bulb — Bedroom', type: 'DISPLAY', room: 'Bedroom', status: 'ONLINE', battery: 100, signal: -50, ip_address: '10.0.1.180', firmware: '2.1.0' },
  { device_id: 'D-017', name: 'Smart Light Bulb — Kitchen', type: 'DISPLAY', room: 'Kitchen', status: 'ONLINE', battery: 100, signal: -50, ip_address: '10.0.1.181', firmware: '2.1.0' },
  { device_id: 'D-018', name: 'Smart Light Bulb — Living Room 1', type: 'DISPLAY', room: 'Living Room', status: 'ONLINE', battery: 100, signal: -45, ip_address: '10.0.1.182', firmware: '2.1.0' },
  { device_id: 'D-019', name: 'Smart Light Bulb — Living Room 2', type: 'DISPLAY', room: 'Living Room', status: 'ONLINE', battery: 100, signal: -47, ip_address: '10.0.1.183', firmware: '2.1.0' },
  { device_id: 'D-020', name: 'Smart Light Bulb — Bathroom', type: 'DISPLAY', room: 'Bathroom', status: 'OFFLINE', battery: 0, signal: 0, ip_address: '10.0.1.184', firmware: '2.1.0' },
  { device_id: 'D-021', name: 'Doorbell Camera', type: 'CAMERA', room: 'Entrance', status: 'ONLINE', battery: 91, signal: -58, ip_address: '10.0.1.190', firmware: '4.2.0' },
  { device_id: 'D-022', name: 'Window Sensor — Kitchen', type: 'DISPLAY', room: 'Kitchen', status: 'ONLINE', battery: 84, signal: -72, ip_address: '10.0.1.200', firmware: '1.2.0' },
  { device_id: 'D-023', name: 'Window Sensor — Bedroom', type: 'DISPLAY', room: 'Bedroom', status: 'IDLE', battery: 67, signal: -75, ip_address: '10.0.1.201', firmware: '1.2.0' },
  { device_id: 'D-024', name: 'Smoke Detector — Kitchen', type: 'DISPLAY', room: 'Kitchen', status: 'ONLINE', battery: 92, signal: -68, ip_address: '10.0.1.210', firmware: '3.1.0' },
  { device_id: 'D-025', name: 'Smoke Detector — Hallway', type: 'DISPLAY', room: 'Hallway', status: 'ONLINE', battery: 89, signal: -62, ip_address: '10.0.1.211', firmware: '3.1.0' },
  { device_id: 'D-026', name: 'Water Leak Sensor', type: 'DISPLAY', room: 'Bathroom', status: 'IDLE', battery: 78, signal: -80, ip_address: '10.0.1.220', firmware: '1.0.4' },
  { device_id: 'D-027', name: 'Smart Plug — TV', type: 'DISPLAY', room: 'Living Room', status: 'ONLINE', battery: 100, signal: -42, ip_address: '10.0.1.230', firmware: '2.3.1' },
  { device_id: 'D-028', name: 'Smart Plug — Heater', type: 'DISPLAY', room: 'Bedroom', status: 'ONLINE', battery: 100, signal: -52, ip_address: '10.0.1.231', firmware: '2.3.1' },
  { device_id: 'D-029', name: 'Echo Dot — Office', type: 'SPEAKER', room: 'Office', status: 'IDLE', battery: 100, signal: -70, ip_address: '10.0.1.240', firmware: '4.2.1' },
  { device_id: 'D-030', name: 'Pixel Watch 2', type: 'WATCH', room: 'Personal', status: 'ONLINE', battery: 65, signal: -69, ip_address: '10.0.1.250', firmware: '1.0.5' },
]

async function main() {
  console.log(`Inserting ${newDevices.length} devices into Supabase...`)

  // Get existing device_ids to skip
  const { data: existing, error: fetchErr } = await supabase
    .from('devices')
    .select('device_id')
  if (fetchErr) {
    console.error('Failed to fetch existing devices:', fetchErr.message)
    process.exit(1)
  }
  const existingIds = new Set((existing ?? []).map((d: any) => d.device_id))
  console.log(`Already in Supabase: ${existingIds.size} devices`)

  const toInsert = newDevices.filter((d) => !existingIds.has(d.device_id))
  console.log(`To insert: ${toInsert.length} devices`)

  if (toInsert.length === 0) {
    console.log('Nothing to insert — all devices already exist.')
    return
  }

  // Insert in batches of 10 to avoid payload limits
  for (let i = 0; i < toInsert.length; i += 10) {
    const batch = toInsert.slice(i, i + 10)
    const { data, error } = await supabase
      .from('devices')
      .insert(batch)
      .select('device_id, name')

    if (error) {
      console.error(`Batch ${i / 10 + 1} failed:`, error.message)
      console.error('First row:', batch[0])
      process.exit(1)
    }
    console.log(`  ✓ Inserted batch ${i / 10 + 1}: ${data?.length ?? 0} devices`)
  }

  // Verify total
  const { count } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
  console.log(`\nTotal devices in Supabase: ${count}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
