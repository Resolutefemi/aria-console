import { NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

export async function GET() {
  try {
    const admin = getAdminClient()
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOf7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const { data, error } = await admin
      .from('voice_commands')
      .select('issued_at, status, confidence')
      .gte('issued_at', startOf7d.toISOString())

    if (error) throw error
    const commands = serialize<{
      issuedAt: string
      status: string
      confidence: number
    }[]>(data ?? [])

    const today = commands.filter(
      (c) => new Date(c.issuedAt).getTime() >= startOfToday.getTime()
    )
    const totalCount = today.length
    const successCount = today.filter((c) => c.status === 'SUCCESS').length
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0
    const avgConfidence =
      totalCount > 0
        ? today.reduce((s, c) => s + c.confidence, 0) / totalCount
        : 0

    // Build 7-day sparkline data
    const dailyCounts: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const count = commands.filter((c) => {
        const t = new Date(c.issuedAt).getTime()
        return t >= dayStart.getTime() && t < dayEnd.getTime()
      }).length
      dailyCounts.push({
        date: dayStart.toISOString().slice(0, 10),
        count,
      })
    }

    return NextResponse.json({
      todayCount: totalCount,
      avgConfidence: parseFloat(avgConfidence.toFixed(2)),
      successRate,
      dailyCounts,
    })
  } catch (error) {
    console.error('GET /api/voice/stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice stats' },
      { status: 500 }
    )
  }
}
