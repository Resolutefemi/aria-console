import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getAuthContext, serialize, countOf } from '@/lib/db'

/**
 * GET /api/devices
 * Returns devices. By default, returns only devices paired to the current user.
 *
 * Query params:
 * - paired=true: only return devices with a PAIRED pairing record
 * - status=ONLINE: filter by status
 * - room=Kitchen: filter by room
 * - deviceId=D-001: filter by human-readable device ID
 * - id=<uuid>: filter by primary key
 * - all=true: return ALL devices (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const room = searchParams.get('room')
    const deviceId = searchParams.get('deviceId')
    const id = searchParams.get('id')
    const paired = searchParams.get('paired')
    const all = searchParams.get('all')

    const admin = getAdminClient()

    // Determine the current user from the auth token
    let currentUserId: string | null = null
    let currentUserRole: string | null = null

    const ctx = await getAuthContext(request.headers.get('authorization'))
    if (ctx) {
      currentUserId = ctx.dbUser.id
      currentUserRole = ctx.dbUser.role
    }

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

    function matchesFilters(d: any): boolean {
      if (status && d.status !== status) return false
      if (room && d.room !== room) return false
      if (deviceId && d.deviceId !== deviceId) return false
      if (id && d.id !== id) return false
      return true
    }

    // If paired=true, only return devices paired to the current user
    if (paired === 'true') {
      if (!currentUserId) {
        return NextResponse.json({ devices: [], error: 'Not authenticated' }, { status: 401 })
      }

      const { data: pairings, error } = await admin
        .from('device_pairings')
        .select(
          `paired_at, device:devices(*, ${DEVICE_COUNTS})`
        )
        .eq('status', 'PAIRED')
        .eq('parent_id', currentUserId)
        .order('paired_at', { ascending: false })

      if (error) throw error

      const devices = (pairings ?? [])
        .map((p: any) => p.device)
        .filter((d: any) => d !== null)
        .map(toDeviceWithCounts)
        .filter(matchesFilters)

      return NextResponse.json({ devices })
    }

    // Non-paired query: if all=true and user is admin, return everything
    if (all === 'true' && currentUserId && currentUserRole === 'ADMIN') {
      let query = admin
        .from('devices')
        .select(`*, ${DEVICE_COUNTS}`)
        .order('last_seen_at', { ascending: false })
      if (status) query = query.eq('status', status)
      if (room) query = query.eq('room', room)
      if (deviceId) query = query.eq('device_id', deviceId)
      if (id) query = query.eq('id', id)

      const { data, error } = await query
      if (error) throw error

      const devices = (data ?? []).map(toDeviceWithCounts)
      return NextResponse.json({ devices })
    }

    // Default: return current user's paired devices
    if (!currentUserId) {
      return NextResponse.json({ devices: [] })
    }

    const { data: pairings, error } = await admin
      .from('device_pairings')
      .select(`paired_at, device:devices(*, ${DEVICE_COUNTS})`)
      .eq('status', 'PAIRED')
      .eq('parent_id', currentUserId)
      .order('paired_at', { ascending: false })

    if (error) throw error

    const devices = (pairings ?? [])
      .map((p: any) => p.device)
      .filter((d: any) => d !== null)
      .map(toDeviceWithCounts)

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('GET /api/devices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}
