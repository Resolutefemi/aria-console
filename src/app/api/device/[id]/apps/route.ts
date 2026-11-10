import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

/**
 * GET /api/device/[id]/apps
 * Returns all apps installed on the device with their block/limit status.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await getAdminClient()
      .from('device_apps')
      .select('*')
      .eq('device_id', id)
      .order('app_name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ apps: serialize(data ?? []) })
  } catch (error) {
    console.error('GET /api/device/[id]/apps error:', error)
    return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
  }
}

/**
 * PATCH /api/device/[id]/apps
 * Update an app's block status or daily time limit.
 * Body: { packageName, isBlocked?, dailyLimitMin?, sentBy? }
 * Also sends a BLOCK_APP or UNBLOCK_APP command to the device.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { packageName, isBlocked, dailyLimitMin, sentBy } = body

    if (!packageName) {
      return NextResponse.json({ error: 'packageName is required' }, { status: 400 })
    }

    const admin = getAdminClient()

    const updates: Record<string, unknown> = {}
    if (isBlocked !== undefined) updates.is_blocked = isBlocked
    if (dailyLimitMin !== undefined) updates.daily_limit_min = dailyLimitMin

    const { data: app, error } = await admin
      .from('device_apps')
      .update(updates)
      .eq('device_id', id)
      .eq('package_name', packageName)
      .select()
      .single()

    if (error) throw error

    // Send a command to the device if blocking/unblocking
    if (isBlocked !== undefined && sentBy) {
      await admin.from('device_commands').insert({
        device_id: id,
        type: isBlocked ? 'BLOCK_APP' : 'UNBLOCK_APP',
        payload: { packageName, appName: app.app_name },
        sent_by: sentBy,
      })
    }

    return NextResponse.json({ app: serialize(app) })
  } catch (error) {
    console.error('PATCH /api/device/[id]/apps error:', error)
    return NextResponse.json({ error: 'Failed to update app' }, { status: 500 })
  }
}
