import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

/**
 * POST /api/pairing/verify
 * Companion app calls this with the 6-digit code to pair.
 * Body: { shortCode, deviceInfo: { name, type, room, os, model } }
 * Returns: { deviceId, deviceDisplayId, pairingId, parentName }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shortCode, deviceInfo } = body

    if (!shortCode) {
      return NextResponse.json({ error: 'shortCode is required' }, { status: 400 })
    }

    const admin = getAdminClient()

    // Find pending pairing
    const { data: pairingRow, error: pairingError } = await admin
      .from('device_pairings')
      .select('*, parent:users(name)')
      .eq('short_code', shortCode)
      .maybeSingle()

    if (pairingError) throw pairingError

    if (!pairingRow) {
      return NextResponse.json({ error: 'Invalid pairing code' }, { status: 404 })
    }

    const pairing = serialize<{
      id: string
      status: string
      expiresAt: string
      parent: { name: string } | null
    }>(pairingRow)

    if (pairing.status !== 'PENDING') {
      return NextResponse.json({ error: `Pairing already ${pairing.status.toLowerCase()}` }, { status: 400 })
    }

    if (new Date(pairing.expiresAt) < new Date()) {
      await admin
        .from('device_pairings')
        .update({ status: 'EXPIRED' })
        .eq('id', pairing.id)
      return NextResponse.json({ error: 'Pairing code expired' }, { status: 410 })
    }

    // Create the device
    const { count: deviceCount } = await admin
      .from('devices')
      .select('id', { count: 'exact', head: true })

    const deviceId = `D-${String((deviceCount ?? 0) + 1).padStart(3, '0')}`

    const { data: device, error: deviceError } = await admin
      .from('devices')
      .insert({
        device_id: deviceId,
        name: deviceInfo?.name || `${pairing.parent?.name ?? 'User'}'s Device`,
        type: deviceInfo?.type || 'PHONE',
        room: deviceInfo?.room || 'Personal',
        status: 'ONLINE',
        battery: deviceInfo?.battery ?? 100,
        signal: -60,
        ip_address: deviceInfo?.ipAddress ?? null,
        firmware: deviceInfo?.os ?? null,
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (deviceError) throw deviceError

    // Mark pairing as paired
    await admin
      .from('device_pairings')
      .update({
        status: 'PAIRED',
        device_id: device.id,
        paired_at: new Date().toISOString(),
      })
      .eq('id', pairing.id)

    const s = serialize(device)
    return NextResponse.json({
      deviceId: s.id,
      deviceDisplayId: s.deviceId,
      pairingId: pairing.id,
      parentName: pairing.parent?.name,
    })
  } catch (error) {
    console.error('POST /api/pairing/verify error:', error)
    return NextResponse.json({ error: 'Failed to verify pairing' }, { status: 500 })
  }
}
