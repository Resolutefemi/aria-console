import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const room = searchParams.get('room')
    const deviceId = searchParams.get('deviceId')
    const id = searchParams.get('id')
    const paired = searchParams.get('paired')

    // If paired=true, only return devices that have a PAIRED pairing record
    if (paired === 'true') {
      const pairings = await db.devicePairing.findMany({
        where: { status: 'PAIRED' },
        include: {
          device: {
            include: {
              _count: {
                select: { voiceCommands: true, energyReadings: true, securityAlerts: true },
              },
            },
          },
        },
        orderBy: { pairedAt: 'desc' },
      })

      const devices = pairings
        .map((p) => p.device)
        .filter((d) => d !== null)
        .filter((d) => {
          if (status && d!.status !== status) return false
          if (room && d!.room !== room) return false
          if (deviceId && d!.deviceId !== deviceId) return false
          if (id && d!.id !== id) return false
          return true
        })

      return NextResponse.json({ devices })
    }

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
