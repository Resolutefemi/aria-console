import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'
import { recordAuditLog } from '@/lib/audit'

/**
 * POST /api/device/[id]/command
 * Parent sends a command to a device (lock, unlock, ring, etc.)
 * Body: { type, payload?, sentBy }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, payload, sentBy } = body

    if (!type || !sentBy) {
      return NextResponse.json({ error: 'type and sentBy are required' }, { status: 400 })
    }

    const admin = getAdminClient()

    // Verify device exists
    const { data: device, error: deviceError } = await admin
      .from('devices')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (deviceError) throw deviceError
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const { data: command, error } = await admin
      .from('device_commands')
      .insert({
        device_id: device.id,
        type,
        payload: payload ?? null,
        sent_by: sentBy,
      })
      .select()
      .single()

    if (error) throw error

    // Record in audit log
    await recordAuditLog({
      action: `device.command.${type.toLowerCase()}`,
      resource: 'device',
      resourceId: device.id,
      metadata: { commandId: command.id, type, payload },
      userId: sentBy,
    })

    return NextResponse.json({ command: serialize(command) }, { status: 201 })
  } catch (error) {
    console.error('POST /api/device/[id]/command error:', error)
    return NextResponse.json({ error: 'Failed to send command' }, { status: 500 })
  }
}
