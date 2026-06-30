import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/pairing/verify
 * Companion app calls this with the 6-digit code to pair.
 * Body: { shortCode, deviceInfo: { name, type, room, os, model } }
 * Returns: { deviceId, pairingId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shortCode, deviceInfo } = body

    if (!shortCode) {
      return NextResponse.json({ error: 'shortCode is required' }, { status: 400 })
    }

    // Find pending pairing
    const pairing = await db.devicePairing.findUnique({
      where: { shortCode },
      include: { parent: true },
    })

    if (!pairing) {
      return NextResponse.json({ error: 'Invalid pairing code' }, { status: 404 })
    }

    if (pairing.status !== 'PENDING') {
      return NextResponse.json({ error: `Pairing already ${pairing.status.toLowerCase()}` }, { status: 400 })
    }

    if (pairing.expiresAt < new Date()) {
      await db.devicePairing.update({
        where: { id: pairing.id },
        data: { status: 'EXPIRED' },
      })
      return NextResponse.json({ error: 'Pairing code expired' }, { status: 410 })
    }

    // Create the device
    const deviceCount = await db.device.count()
    const deviceId = `D-${String(deviceCount + 1).padStart(3, '0')}`

    const device = await db.device.create({
      data: {
        deviceId,
        name: deviceInfo?.name || `${pairing.parent.name}'s Device`,
        type: deviceInfo?.type || 'PHONE',
        room: deviceInfo?.room || 'Personal',
        status: 'ONLINE',
        battery: deviceInfo?.battery ?? 100,
        signal: -60,
        ipAddress: deviceInfo?.ipAddress,
        firmware: deviceInfo?.os,
        lastSeenAt: new Date(),
      },
    })

    // Mark pairing as paired
    await db.devicePairing.update({
      where: { id: pairing.id },
      data: {
        status: 'PAIRED',
        deviceId: device.id,
        pairedAt: new Date(),
      },
    })

    return NextResponse.json({
      deviceId: device.id,
      deviceDisplayId: device.deviceId,
      pairingId: pairing.id,
      parentName: pairing.parent.name,
    })
  } catch (error) {
    console.error('POST /api/pairing/verify error:', error)
    return NextResponse.json({ error: 'Failed to verify pairing' }, { status: 500 })
  }
}
