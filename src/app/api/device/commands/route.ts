import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    const commands = await db.deviceCommand.findMany({
      where: {
        deviceId,
        status: 'PENDING',
      },
      orderBy: { sentAt: 'asc' },
      take: 10,
    })

    // Mark as delivered
    if (commands.length > 0) {
      await db.deviceCommand.updateMany({
        where: { id: { in: commands.map((c) => c.id) } },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      })
    }

    return NextResponse.json({ commands })
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

    const command = await db.deviceCommand.update({
      where: { id: commandId },
      data: {
        status,
        executedAt: new Date(),
        result: result ?? null,
      },
    })

    return NextResponse.json({ command })
  } catch (error) {
    console.error('POST /api/device/commands error:', error)
    return NextResponse.json({ error: 'Failed to update command' }, { status: 500 })
  }
}
