import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const commands = await db.voiceCommand.findMany({
      where: { issuedAt: { gte: last7d } },
      select: { intent: true, status: true, confidence: true },
    })

    const byIntent = new Map<string, { count: number; successCount: number; avgConfidence: number }>()
    for (const c of commands) {
      const existing = byIntent.get(c.intent) ?? { count: 0, successCount: 0, avgConfidence: 0 }
      existing.count += 1
      if (c.status === 'SUCCESS') existing.successCount += 1
      existing.avgConfidence = (existing.avgConfidence * (existing.count - 1) + c.confidence) / existing.count
      byIntent.set(c.intent, existing)
    }

    return NextResponse.json({
      intents: Array.from(byIntent.entries())
        .map(([intent, stats]) => ({
          intent,
          count: stats.count,
          successRate: stats.count > 0 ? Math.round((stats.successCount / stats.count) * 100) : 0,
          avgConfidence: parseFloat(stats.avgConfidence.toFixed(2)),
        }))
        .sort((a, b) => b.count - a.count),
    })
  } catch (error) {
    console.error('GET /api/voice/intents error:', error)
    return NextResponse.json({ error: 'Failed to fetch intent stats' }, { status: 500 })
  }
}
