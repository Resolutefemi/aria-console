import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const action = searchParams.get('action')

    const logs = await db.auditLog.findMany({
      where: action ? { action } : {},
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('GET /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, resource, resourceId, metadata, userId, ipAddress, userAgent } = body

    const log = await db.auditLog.create({
      data: {
        action,
        resource,
        resourceId,
        metadata: metadata ?? null,
        userId,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({ log }, { status: 201 })
  } catch (error) {
    console.error('POST /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 })
  }
}
