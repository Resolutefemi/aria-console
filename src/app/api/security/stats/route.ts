import { NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

export async function GET() {
  try {
    const admin = getAdminClient()
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await admin
      .from('security_alerts')
      .select('severity, status, triggered_at')

    if (error) throw error
    const alerts = serialize<{
      severity: string
      status: string
      triggeredAt: string
    }[]>(data ?? [])

    const groupCount = (key: 'severity' | 'status') => {
      const map = new Map<string, number>()
      for (const a of alerts) map.set(a[key], (map.get(a[key]) ?? 0) + 1)
      return Array.from(map.entries()).map(([k, count]) => ({ [key]: k, count }))
    }

    const last24hCount = alerts.filter(
      (a) => new Date(a.triggeredAt).getTime() >= new Date(last24h).getTime()
    ).length
    const last7dCount = alerts.filter(
      (a) => new Date(a.triggeredAt).getTime() >= new Date(last7d).getTime()
    ).length

    return NextResponse.json({
      bySeverity: groupCount('severity'),
      byStatus: groupCount('status'),
      last24h: last24hCount,
      last7d: last7dCount,
      total: alerts.length,
    })
  } catch (error) {
    console.error('GET /api/security/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch security stats' }, { status: 500 })
  }
}
