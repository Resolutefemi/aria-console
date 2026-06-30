import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerClient } from '@/lib/supabase'

/**
 * GET /api/devices
 * Returns devices. By default, returns only devices paired to the current user.
 *
 * Query params:
 * - paired=true: only return devices with a PAIRED pairing record
 * - status=ONLINE: filter by status
 * - room=Kitchen: filter by room
 * - deviceId=D-001: filter by human-readable device ID
 * - id=<cuid>: filter by primary key
 * - all=true: return ALL devices (admin only — requires service role)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const room = searchParams.get('room')
    const deviceId = searchParams.get('deviceId')
    const id = searchParams.get('id')
    const paired = searchParams.get('paired')
    const all = searchParams.get('all')

    // Determine the current user from the auth token
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

    // If paired=true, only return devices paired to the current user
    if (paired === 'true') {
      if (!currentUserId) {
        return NextResponse.json({ devices: [], error: 'Not authenticated' }, { status: 401 })
      }

      const pairings = await db.devicePairing.findMany({
        where: {
          status: 'PAIRED',
          parentId: currentUserId, // ← KEY FIX: only this user's devices
        },
        include: {
          device: {
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
          },
        },
        orderBy: { pairedAt: 'desc' },
      })

      const devices = pairings
        .map((p) => p.device)
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .filter((d) => {
          if (status && d.status !== status) return false
          if (room && d.room !== room) return false
          if (deviceId && d.deviceId !== deviceId) return false
          if (id && d.id !== id) return false
          return true
        })

      return NextResponse.json({ devices })
    }

    // Non-paired query: if all=true and user is admin, return everything
    // Otherwise, return only the current user's paired devices
    if (all === 'true' && currentUserId) {
      const dbUser = await db.user.findUnique({ where: { id: currentUserId } })
      if (dbUser?.role === 'ADMIN') {
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
      }
    }

    // Default: return current user's paired devices
    if (!currentUserId) {
      return NextResponse.json({ devices: [] })
    }

    const pairings = await db.devicePairing.findMany({
      where: { status: 'PAIRED', parentId: currentUserId },
      include: {
        device: {
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
        },
      },
      orderBy: { pairedAt: 'desc' },
    })

    const devices = pairings
      .map((p) => p.device)
      .filter((d): d is NonNullable<typeof d> => d !== null)

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('GET /api/devices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}
