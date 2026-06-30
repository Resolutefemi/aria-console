import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/pairing/create
 * Parent calls this to generate a pairing code.
 * Body: { parentId, deviceName, deviceType }
 * Returns: { shortCode, expiresAt }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parentId, deviceName, deviceType } = body

    if (!parentId || !deviceName) {
      return NextResponse.json(
        { error: 'parentId and deviceName are required' },
        { status: 400 }
      )
    }

    // Generate a 6-digit short code
    const shortCode = Math.floor(100000 + Math.random() * 900000).toString()

    const pairing = await db.devicePairing.create({
      data: {
        code: Math.random().toString(36).slice(2, 12).toUpperCase(),
        shortCode,
        parentId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      },
    })

    return NextResponse.json({
      pairingId: pairing.id,
      shortCode: pairing.shortCode,
      expiresAt: pairing.expiresAt,
    })
  } catch (error) {
    console.error('POST /api/pairing/create error:', error)
    return NextResponse.json({ error: 'Failed to create pairing' }, { status: 500 })
  }
}
