import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

/**
 * GET /api/device/commands?deviceId=xxx
 * Companion app polls this for pending commands.
 * Returns: { commands: [...] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    const admin = getAdminClient()

    const { data, error } = await admin
      .from('device_commands')
      .select('*')
      .eq('device_id', deviceId)
      .eq('status', 'PENDING')
      .order('sent_at', { ascending: true })
      .limit(10)

    if (error) throw error
    const commands = data ?? []

    // Mark as delivered
    if (commands.length > 0) {
      const { error: updateError } = await admin
        .from('device_commands')
        .update({
          status: 'DELIVERED',
          delivered_at: new Date().toISOString(),
        })
        .in(
          'id',
          commands.map((c) => c.id)
        )
      if (updateError) throw updateError
    }

    return NextResponse.json({ commands: serialize(commands) })
  } catch (error) {
    console.error('GET /api/device/commands error:', error)
    return NextResponse.json({ error: 'Failed to fetch commands' }, { status: 500 })
  }
}

/**
 * POST /api/device/commands
 * Companion app reports command execution result.
 * Body: { commandId, status, result? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { commandId, status, result } = body

    if (!commandId || !status) {
      return NextResponse.json({ error: 'commandId and status are required' }, { status: 400 })
    }

    const { data: command, error } = await getAdminClient()
      .from('device_commands')
      .update({
        status,
        executed_at: new Date().toISOString(),
        result: result ?? null,
      })
      .eq('id', commandId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ command: serialize(command) })
  } catch (error) {
    console.error('POST /api/device/commands error:', error)
    return NextResponse.json({ error: 'Failed to update command' }, { status: 500 })
  }
}
