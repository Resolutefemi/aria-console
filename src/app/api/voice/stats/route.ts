import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [todayCommands, allTodayCommands, last7Days] = await Promise.all([
      db.voiceCommand.aggregate({
        where: { issuedAt: { gte: startOfToday } },
        _avg: { confidence: true },
        _count: true,
      }),
      db.voiceCommand.groupBy({
        by: ['status'],
        where: { issuedAt: { gte: startOfToday } },
        _count: true,
      }),
      db.voiceCommand.findMany({
        where: { issuedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
        select: { issuedAt: true, status: true },
      }),
    ])

    const successCount = allTodayCommands.find((g) => g.status === 'SUCCESS')?._count ?? 0
    const totalCount = todayCommands._count
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0

    // Build 7-day sparkline data
    const dailyCounts: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const count = last7Days.filter(
        (c) => c.issuedAt >= dayStart && c.issuedAt < dayEnd
      ).length
      dailyCounts.push({
        date: dayStart.toISOString().slice(0, 10),
        count,
      })
    }

    return NextResponse.json({
      todayCount: totalCount,
      avgConfidence: todayCommands._avg.confidence ?? 0,
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
