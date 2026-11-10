import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

/**
 * POST /api/pairing/create
 * Parent calls this to generate a pairing code.
 * Body: { parentId, deviceName, deviceType }
 * Returns: { pairingId, shortCode, expiresAt }
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

    const { data: pairing, error } = await getAdminClient()
      .from('device_pairings')
      .insert({
        code: Math.random().toString(36).slice(2, 12).toUpperCase(),
        short_code: shortCode,
        parent_id: parentId,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    const s = serialize(pairing)
    return NextResponse.json({
      pairingId: s.id,
      shortCode: s.shortCode,
      expiresAt: s.expiresAt,
    })
  } catch (error) {
    console.error('POST /api/pairing/create error:', error)
    return NextResponse.json({ error: 'Failed to create pairing' }, { status: 500 })
  }
}
