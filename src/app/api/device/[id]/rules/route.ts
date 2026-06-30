import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/device/[id]/rules
 * Returns all parental rules for a device.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rules = await db.parentalRule.findMany({
      where: { deviceId: id, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ rules })
  } catch (error) {
    console.error('GET /api/device/[id]/rules error:', error)
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
  }
}

/**
 * POST /api/device/[id]/rules
 * Create a new parental rule.
 * Body: { type, config, createdBy }
 * Types: APP_BLOCK, APP_TIME_LIMIT, SCREEN_TIME_LIMIT, BEDTIME, CONTENT_FILTER, LOCATION_GEOFENCE
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, config, createdBy } = body

    if (!type || !config || !createdBy) {
      return NextResponse.json({ error: 'type, config, and createdBy are required' }, { status: 400 })
    }

    const rule = await db.parentalRule.create({
      data: {
        deviceId: id,
        type,
        config,
        createdBy,
      },
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('POST /api/device/[id]/rules error:', error)
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
  }
}

/**
 * DELETE /api/device/[id]/rules?ruleId=xxx
 * Deactivate a parental rule.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('ruleId')

    if (!ruleId) {
      return NextResponse.json({ error: 'ruleId is required' }, { status: 400 })
    }

    const rule = await db.parentalRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    })

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('DELETE /api/device/[id]/rules error:', error)
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
  }
}
