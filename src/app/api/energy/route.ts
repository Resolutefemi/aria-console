import { NextRequest, NextResponse } from 'next/server'
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
