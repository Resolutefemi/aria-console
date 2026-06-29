import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit'

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

    // Verify device exists
    const device = await db.device.findUnique({ where: { id } })
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const command = await db.deviceCommand.create({
      data: {
        deviceId: device.id,
        type,
        payload: payload ?? null,
        sentBy,
      },
    })

    // Record in audit log
    await recordAuditLog({
      action: `device.command.${type.toLowerCase()}`,
      resource: 'device',
      resourceId: device.id,
      metadata: { commandId: command.id, type, payload },
      userId: sentBy,
    })

    return NextResponse.json({ command }, { status: 201 })
  } catch (error) {
    console.error('POST /api/device/[id]/command error:', error)
    return NextResponse.json({ error: 'Failed to send command' }, { status: 500 })
  }
}
