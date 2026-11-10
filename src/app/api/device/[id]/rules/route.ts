import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

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
    const { data, error } = await getAdminClient()
      .from('parental_rules')
      .select('*')
      .eq('device_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ rules: serialize(data ?? []) })
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

    const { data: rule, error } = await getAdminClient()
      .from('parental_rules')
      .insert({
        device_id: id,
        type,
        config,
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ rule: serialize(rule) }, { status: 201 })
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

    const { data: rule, error } = await getAdminClient()
      .from('parental_rules')
      .update({ is_active: false })
      .eq('id', ruleId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ rule: serialize(rule) })
  } catch (error) {
    console.error('DELETE /api/device/[id]/rules error:', error)
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
  }
}
