import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

/**
 * POST /api/device/report
 * Companion app calls this to report real device data.
 * Body: { deviceId, type, data }
 *
 * Types:
 * - SCREEN_TIME: { appPackage, appName, startedAt, endedAt?, durationSec? }
 * - LOCATION: { latitude, longitude, accuracy?, address?, battery? }
 * - WEB_HISTORY: { url, title?, category? }
 * - APP_LIST: { apps: [{ packageName, appName, category }] }
 * - HEARTBEAT: { battery, signal, status }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, type, data } = body

    if (!deviceId || !type) {
      return NextResponse.json({ error: 'deviceId and type are required' }, { status: 400 })
    }

    const admin = getAdminClient()

    // Verify device exists
    const { data: device, error: deviceError } = await admin
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .maybeSingle()

    if (deviceError) throw deviceError
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    switch (type) {
      case 'SCREEN_TIME': {
        const { error } = await admin.from('screen_time_sessions').insert({
          device_id: device.id,
          app_package: data.appPackage,
          app_name: data.appName,
          started_at: new Date(data.startedAt).toISOString(),
          ended_at: data.endedAt ? new Date(data.endedAt).toISOString() : null,
          duration_sec: data.durationSec ?? null,
        })
        if (error) throw error
        break
      }

      case 'LOCATION': {
        const { error } = await admin.from('location_pings').insert({
          device_id: device.id,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy ?? null,
          speed: data.speed ?? null,
          heading: data.heading ?? null,
          address: data.address ?? null,
          battery: data.battery ?? null,
        })
        if (error) throw error
        break
      }

      case 'WEB_HISTORY': {
        const { error } = await admin.from('web_history').insert({
          device_id: device.id,
          url: data.url,
          title: data.title ?? null,
          category: data.category ?? null,
          is_blocked: data.isBlocked ?? false,
        })
        if (error) throw error
        break
      }

      case 'APP_LIST': {
        // Upsert each app
        const rows = data.apps.map((app: any) => ({
          device_id: device.id,
          package_name: app.packageName,
          app_name: app.appName,
          category: app.category ?? 'Other',
        }))
        const { error } = await admin
          .from('device_apps')
          .upsert(rows, { onConflict: 'device_id,package_name' })
        if (error) throw error
        break
      }

      case 'HEARTBEAT': {
        const { error } = await admin
          .from('devices')
          .update({
            battery: data.battery ?? device.battery,
            signal: data.signal ?? device.signal,
            status: data.status ?? 'ONLINE',
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', device.id)
        if (error) throw error
        break
      }

      default:
        return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, type })
  } catch (error) {
    console.error('POST /api/device/report error:', error)
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 })
  }
}

/**
 * GET /api/device/report?deviceId=xxx
 * Returns recent activity for a device (parent dashboard uses this).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    const admin = getAdminClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // last 24h

    const [screenTime, location, webHistory, apps] = await Promise.all([
      admin
        .from('screen_time_sessions')
        .select('*')
        .eq('device_id', deviceId)
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(100),
      admin
        .from('location_pings')
        .select('*')
        .eq('device_id', deviceId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('web_history')
        .select('*')
        .eq('device_id', deviceId)
        .gte('visited_at', since)
        .order('visited_at', { ascending: false })
        .limit(50),
      admin.from('device_apps').select('*').eq('device_id', deviceId),
    ])

    if (screenTime.error) throw screenTime.error
    if (webHistory.error) throw webHistory.error
    if (apps.error) throw apps.error

    const sessions = serialize<{
      appPackage: string
      appName: string
      durationSec: number | null
    }[]>(screenTime.data ?? [])

    // Aggregate screen time by app
    const appUsage = new Map<string, { name: string; totalSec: number; sessions: number }>()
    for (const s of sessions) {
      const existing = appUsage.get(s.appPackage) ?? { name: s.appName, totalSec: 0, sessions: 0 }
      existing.totalSec += s.durationSec ?? 0
      existing.sessions += 1
      appUsage.set(s.appPackage, existing)
    }

    const totalScreenTimeSec = Array.from(appUsage.values()).reduce((s, a) => s + a.totalSec, 0)

    return NextResponse.json({
      screenTime: Array.from(appUsage.entries())
        .map(([pkg, a]) => ({
          package: pkg,
          name: a.name,
          totalSec: a.totalSec,
          totalMin: Math.round(a.totalSec / 60),
          sessions: a.sessions,
        }))
        .sort((a, b) => b.totalSec - a.totalSec),
      totalScreenTimeSec,
      totalScreenTimeMin: Math.round(totalScreenTimeSec / 60),
      lastLocation: location.data ? serialize(location.data) : null,
      webHistory: serialize(webHistory.data ?? []),
      apps: serialize(apps.data ?? []),
      sessionCount: sessions.length,
    })
  } catch (error) {
    console.error('GET /api/device/report error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
