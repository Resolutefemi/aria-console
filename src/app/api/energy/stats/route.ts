import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') ?? '7'), 90)
    const now = new Date()
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const readings = await db.energyReading.findMany({
      where: { recordedAt: { gte: since } },
      select: { kilowatts: true, wattHours: true, recordedAt: true, deviceId: true },
    })

    // Aggregate per day
    const byDay: { date: string; kwh: number; avgKw: number }[] = []
    for (let d = days - 1; d >= 0; d--) {
      const dayStart = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const inDay = readings.filter((r) => r.recordedAt >= dayStart && r.recordedAt < dayEnd)

      const kwh = inDay.reduce((s, r) => s + r.wattHours / 1000, 0)
      const avgKw = inDay.length > 0 ? inDay.reduce((s, r) => s + r.kilowatts, 0) / inDay.length : 0

      byDay.push({
        date: dayStart.toISOString().slice(0, 10),
        kwh: parseFloat(kwh.toFixed(2)),
        avgKw: parseFloat(avgKw.toFixed(2)),
      })
    }

    const totalKwh = byDay.reduce((s, d) => s + d.kwh, 0)
    const avgDailyKwh = byDay.length > 0 ? totalKwh / byDay.length : 0

    return NextResponse.json({
      byDay,
      summary: {
        totalKwh: parseFloat(totalKwh.toFixed(2)),
        avgDailyKwh: parseFloat(avgDailyKwh.toFixed(2)),
        days,
      },
    })
  } catch (error) {
    console.error('GET /api/energy/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch energy stats' }, { status: 500 })
  }
}
