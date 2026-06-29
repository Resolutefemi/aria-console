import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [bySeverity, byStatus, last24hCount, last7dCount, totalCount] = await Promise.all([
      db.securityAlert.groupBy({
        by: ['severity'],
        _count: true,
      }),
      db.securityAlert.groupBy({
        by: ['status'],
        _count: true,
      }),
      db.securityAlert.count({ where: { triggeredAt: { gte: last24h } } }),
      db.securityAlert.count({ where: { triggeredAt: { gte: last7d } } }),
      db.securityAlert.count(),
    ])

    return NextResponse.json({
      bySeverity: bySeverity.map((g) => ({ severity: g.severity, count: g._count })),
      byStatus: byStatus.map((g) => ({ status: g.status, count: g._count })),
      last24h: last24hCount,
      last7d: last7dCount,
      total: totalCount,
    })
  } catch (error) {
    console.error('GET /api/security/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch security stats' }, { status: 500 })
  }
}
