import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const deviceId = searchParams.get('deviceId')
    const status = searchParams.get('status')

    let query = getAdminClient()
      .from('voice_commands')
      .select('*, device:devices(*)')
      .order('issued_at', { ascending: false })
      .limit(limit)

    if (deviceId) query = query.eq('device_id', deviceId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ commands: serialize(data ?? []) })
  } catch (error) {
    console.error('GET /api/voice/commands error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice commands' },
      { status: 500 }
    )
  }
}
