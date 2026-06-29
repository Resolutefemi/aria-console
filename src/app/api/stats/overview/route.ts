import { NextResponse } from 'next/server'
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
