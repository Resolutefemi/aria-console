import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')

    let query = getAdminClient()
      .from('security_alerts')
      .select('*, device:devices(name, device_id)')
      .order('triggered_at', { ascending: false })
      .limit(limit)

    if (severity) query = query.eq('severity', severity)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ alerts: serialize(data ?? []) })
  } catch (error) {
    console.error('GET /api/security/alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 }
    )
  }
}
