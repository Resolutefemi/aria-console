import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')

    const alerts = await db.securityAlert.findMany({
      where: {
        ...(severity ? { severity: severity as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { device: { select: { name: true, deviceId: true } } },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('GET /api/security/alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 }
    )
  }
}
