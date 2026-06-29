import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const room = searchParams.get('room')
    const deviceId = searchParams.get('deviceId')
    const id = searchParams.get('id')

    const devices = await db.device.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(room ? { room } : {}),
        ...(deviceId ? { deviceId } : {}),
        ...(id ? { id } : {}),
      },
      include: {
        _count: {
          select: { voiceCommands: true, energyReadings: true, securityAlerts: true },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    })

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('GET /api/devices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}
