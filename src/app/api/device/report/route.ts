import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/device/report
 * Companion app calls this to report real device data.
 * Body: { deviceId, type, data }
 *
 * Types:
 * - SCREEN_TIME: { appPackage, appName, startedAt, endedAt?, durationSec? }
 * - LOCATION: { latitude, longitude, accuracy?, address?, battery? }
 * - WEB_HISTORY: { url, title?, category? }
 * - APP_LIST: { apps: [{ packageName, appName, category }] }
 * - HEARTBEAT: { battery, signal, status }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, type, data } = body

    if (!deviceId || !type) {
      return NextResponse.json({ error: 'deviceId and type are required' }, { status: 400 })
    }

    // Verify device exists
    const device = await db.device.findUnique({ where: { id: deviceId } })
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    switch (type) {
      case 'SCREEN_TIME': {
        await db.screenTimeSession.create({
          data: {
            deviceId: device.id,
            appPackage: data.appPackage,
            appName: data.appName,
            startedAt: new Date(data.startedAt),
            endedAt: data.endedAt ? new Date(data.endedAt) : null,
            durationSec: data.durationSec ?? null,
          },
        })
        break
      }

      case 'LOCATION': {
        await db.locationPing.create({
          data: {
            deviceId: device.id,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy ?? null,
            speed: data.speed ?? null,
            heading: data.heading ?? null,
            address: data.address ?? null,
            battery: data.battery ?? null,
          },
        })
        break
      }

      case 'WEB_HISTORY': {
        await db.webHistoryEntry.create({
          data: {
            deviceId: device.id,
            url: data.url,
            title: data.title ?? null,
            category: data.category ?? null,
            isBlocked: data.isBlocked ?? false,
          },
        })
        break
      }

      case 'APP_LIST': {
        // Upsert each app
        for (const app of data.apps) {
          await db.deviceApp.upsert({
            where: {
              deviceId_packageName: {
                deviceId: device.id,
                packageName: app.packageName,
              },
            },
            update: {
              appName: app.appName,
              category: app.category ?? 'Other',
            },
            create: {
              deviceId: device.id,
              packageName: app.packageName,
              appName: app.appName,
              category: app.category ?? 'Other',
            },
          })
        }
        break
      }

      case 'HEARTBEAT': {
        await db.device.update({
          where: { id: device.id },
          data: {
            battery: data.battery ?? device.battery,
            signal: data.signal ?? device.signal,
            status: data.status ?? 'ONLINE',
            lastSeenAt: new Date(),
          },
        })
        break
      }

      default:
        return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, type })
  } catch (error) {
    console.error('POST /api/device/report error:', error)
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 })
  }
}

/**
 * GET /api/device/report?deviceId=xxx
 * Returns recent activity for a device (parent dashboard uses this).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24h

    const [screenTime, location, webHistory, apps] = await Promise.all([
      db.screenTimeSession.findMany({
        where: { deviceId, startedAt: { gte: since } },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
      db.locationPing.findFirst({
        where: { deviceId },
        orderBy: { recordedAt: 'desc' },
      }),
      db.webHistoryEntry.findMany({
        where: { deviceId, visitedAt: { gte: since } },
        orderBy: { visitedAt: 'desc' },
        take: 50,
      }),
      db.deviceApp.findMany({ where: { deviceId } }),
    ])

    // Aggregate screen time by app
    const appUsage = new Map<string, { name: string; totalSec: number; sessions: number }>()
    for (const s of screenTime) {
      const existing = appUsage.get(s.appPackage) ?? { name: s.appName, totalSec: 0, sessions: 0 }
      existing.totalSec += s.durationSec ?? 0
      existing.sessions += 1
      appUsage.set(s.appPackage, existing)
    }

    const totalScreenTimeSec = Array.from(appUsage.values()).reduce((s, a) => s + a.totalSec, 0)

    return NextResponse.json({
      screenTime: Array.from(appUsage.entries())
        .map(([pkg, a]) => ({
          package: pkg,
          name: a.name,
          totalSec: a.totalSec,
          totalMin: Math.round(a.totalSec / 60),
          sessions: a.sessions,
        }))
        .sort((a, b) => b.totalSec - a.totalSec),
      totalScreenTimeSec,
      totalScreenTimeMin: Math.round(totalScreenTimeSec / 60),
      lastLocation: location,
      webHistory,
      apps,
      sessionCount: screenTime.length,
    })
  } catch (error) {
    console.error('GET /api/device/report error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
