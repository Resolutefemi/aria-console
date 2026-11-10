import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getAuthContext, serialize, countOf } from '@/lib/db'

const DEVICE_COUNTS =
  'voice_commands(count), energy_readings(count), security_alerts(count), screen_time_sessions(count), location_pings(count), web_history(count), device_apps(count)'

function toDeviceWithCounts(device: any) {
  const s = serialize(device)
  return {
    ...s,
    _count: {
      voiceCommands: countOf(device.voice_commands),
      energyReadings: countOf(device.energy_readings),
      securityAlerts: countOf(device.security_alerts),
      screenTimeSessions: countOf(device.screen_time_sessions),
      locationPings: countOf(device.location_pings),
      webHistory: countOf(device.web_history),
      apps: countOf(device.device_apps),
    },
  }
}

/**
 * GET /api/devices/[id]
 * Returns a single device. Verifies the device belongs to the current user
 * via the device_pairings table.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = getAdminClient()

    // Get current user
    let currentUserId: string | null = null
    const ctx = await getAuthContext(request.headers.get('authorization'))
    if (ctx) currentUserId = ctx.dbUser.id

    const { data: device, error } = await admin
      .from('devices')
      .select(`*, ${DEVICE_COUNTS}`)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Verify ownership — check if this device is paired to the current user
    if (currentUserId) {
      const { data: pairing } = await admin
        .from('device_pairings')
        .select('id')
        .eq('device_id', id)
        .eq('parent_id', currentUserId)
        .eq('status', 'PAIRED')
        .maybeSingle()

      if (!pairing) {
        return NextResponse.json(
          { error: 'Access denied — device not paired to your account' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ device: toDeviceWithCounts(device) })
  } catch (error) {
    console.error('GET /api/devices/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 })
  }
}

/**
 * PATCH /api/devices/[id]
 * Update device fields (name, room, status, battery, signal, firmware).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, room, status, battery, signal, firmware } = body

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (room !== undefined) updates.room = room
    if (status !== undefined) updates.status = status
    if (battery !== undefined) updates.battery = battery
    if (signal !== undefined) updates.signal = signal
    if (firmware !== undefined) updates.firmware = firmware

    const admin = getAdminClient()
    const { data: device, error } = await admin
      .from('devices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ device: serialize(device) })
  } catch (error) {
    console.error('PATCH /api/devices/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
  }
}
