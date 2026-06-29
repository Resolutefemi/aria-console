import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    const apps = await db.deviceApp.findMany({
      where: { deviceId: id },
      orderBy: { appName: 'asc' },
    })
    return NextResponse.json({ apps })
  } catch (error) {
    console.error('GET /api/device/[id]/apps error:', error)
    return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
  }
}

/**
 * PATCH /api/device/[id]/apps
 * Update an app's block status or daily time limit.
 * Body: { packageName, isBlocked?, dailyLimitMin? }
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

    const app = await db.deviceApp.update({
      where: {
        deviceId_packageName: { deviceId: id, packageName },
      },
      data: {
        ...(isBlocked !== undefined && { isBlocked }),
        ...(dailyLimitMin !== undefined && { dailyLimitMin }),
      },
    })

    // Send a command to the device if blocking/unblocking
    if (isBlocked !== undefined && sentBy) {
      await db.deviceCommand.create({
        data: {
          deviceId: id,
          type: isBlocked ? 'BLOCK_APP' : 'UNBLOCK_APP',
          payload: { packageName, appName: app.appName },
          sentBy,
        },
      })
    }

    return NextResponse.json({ app })
  } catch (error) {
    console.error('PATCH /api/device/[id]/apps error:', error)
    return NextResponse.json({ error: 'Failed to update app' }, { status: 500 })
  }
}
