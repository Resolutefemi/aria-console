import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const device = await db.device.findUnique({
      where: { id },
      include: {
        _count: {
          select: { voiceCommands: true, energyReadings: true, securityAlerts: true },
        },
      },
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    return NextResponse.json({ device })
  } catch (error) {
    console.error('GET /api/devices/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, room, status, battery, signal, firmware } = body

    const device = await db.device.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(room !== undefined && { room }),
        ...(status !== undefined && { status }),
        ...(battery !== undefined && { battery }),
        ...(signal !== undefined && { signal }),
        ...(firmware !== undefined && { firmware }),
      },
    })

    return NextResponse.json({ device })
  } catch (error) {
    console.error('PATCH /api/devices/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
  }
}
