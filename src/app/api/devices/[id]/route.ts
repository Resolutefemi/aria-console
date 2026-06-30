import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerClient } from '@/lib/supabase'

/**
 * GET /api/devices/[id]
 * Returns a single device. Verifies the device belongs to the current user
 * via the device_pairings table.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get current user
    let currentUserId: string | null = null
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (token) {
      try {
        const supabase = getServerClient()
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user?.email) {
          const dbUser = await db.user.findUnique({ where: { email: user.email } })
          if (dbUser) currentUserId = dbUser.id
        }
      } catch {}
    }

    const device = await db.device.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            voiceCommands: true,
            energyReadings: true,
            securityAlerts: true,
            screenTimeSessions: true,
            locationPings: true,
            webHistory: true,
            apps: true,
          },
        },
      },
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Verify ownership — check if this device is paired to the current user
    if (currentUserId) {
      const pairing = await db.devicePairing.findFirst({
        where: { deviceId: id, parentId: currentUserId, status: 'PAIRED' },
      })
      if (!pairing) {
        return NextResponse.json({ error: 'Access denied — device not paired to your account' }, { status: 403 })
      }
    }

    return NextResponse.json({ device })
  } catch (error) {
    console.error('GET /api/devices/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch device' }, { status: 500 })
  }
}

/**
 * PATCH /api/devices/[id]
 * Update device fields (name, room, status, battery, signal, firmware).
 */
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
