import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'

export async function GET() {
  try {
    const admin = getAdminClient()
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)

    const todayIso = startOfToday.toISOString()
    const yesterdayIso = startOfYesterday.toISOString()
    const hourAgoIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

    const [
      allDevices,
      todayCommands,
      yesterdayCommands,
      todayEnergy,
      yesterdayEnergy,
      criticalAlerts,
      lastHourAlerts,
    ] = await Promise.all([
      admin.from('devices').select('status'),
      admin
        .from('voice_commands')
        .select('id', { count: 'exact', head: true })
        .gte('issued_at', todayIso),
      admin
        .from('voice_commands')
        .select('id', { count: 'exact', head: true })
        .gte('issued_at', yesterdayIso)
        .lt('issued_at', todayIso),
      admin.from('energy_readings').select('watt_hours').gte('recorded_at', todayIso),
      admin
        .from('energy_readings')
        .select('watt_hours')
        .gte('recorded_at', yesterdayIso)
        .lt('recorded_at', todayIso),
      admin
        .from('security_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'CRITICAL')
        .eq('status', 'OPEN'),
      admin
        .from('security_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'CRITICAL')
        .gte('triggered_at', hourAgoIso),
    ])

    if (allDevices.error) throw allDevices.error

    const devices = allDevices.data ?? []
    const onlineCount = devices.filter((d) => d.status === 'ONLINE').length
    const offlineCount = devices.filter((d) => d.status === 'OFFLINE').length
    const todayWh = (todayEnergy.data ?? []).reduce((s, r) => s + r.watt_hours, 0)
    const yesterdayWh = (yesterdayEnergy.data ?? []).reduce((s, r) => s + r.watt_hours, 0)

    const todayKwh = todayWh / 1000
    const yesterdayKwh = yesterdayWh / 1000

    const todayCount = todayCommands.count ?? 0
    const yCount = yesterdayCommands.count ?? 0
    const commandDelta =
      yCount > 0 ? Math.round(((todayCount - yCount) / yCount) * 100) : 0

    return NextResponse.json({
      connectedDevices: {
        count: onlineCount,
        total: devices.length,
        offline: offlineCount,
      },
      voiceCommandsToday: {
        count: todayCount,
        deltaPct: commandDelta,
      },
      energyUsageToday: {
        kwh: parseFloat(todayKwh.toFixed(2)),
        deltaKwh: parseFloat((todayKwh - yesterdayKwh).toFixed(2)),
      },
      activeAlerts: {
        critical: criticalAlerts.count ?? 0,
        lastHour: lastHourAlerts.count ?? 0,
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
