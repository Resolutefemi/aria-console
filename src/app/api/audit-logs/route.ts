import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const action = searchParams.get('action')

    let query = getAdminClient()
      .from('audit_logs')
      .select('*, user:users(name, email)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (action) query = query.eq('action', action)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ logs: serialize(data ?? []) })
  } catch (error) {
    console.error('GET /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, resource, resourceId, metadata, userId, ipAddress, userAgent } = body

    const { data: log, error } = await getAdminClient()
      .from('audit_logs')
      .insert({
        action,
        resource,
        resource_id: resourceId ?? null,
        metadata: metadata ?? null,
        user_id: userId ?? null,
        ip_address: ipAddress ?? null,
        user_agent: userAgent ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ log: serialize(log) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 })
  }
}
