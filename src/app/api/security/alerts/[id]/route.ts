import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, acknowledgedBy } = body

    const alert = await db.securityAlert.update({
      where: { id },
      data: {
        status,
        ...(status === 'ACKNOWLEDGED' && {
          acknowledgedAt: new Date(),
          acknowledgedBy: acknowledgedBy ?? 'system',
        }),
      },
      include: { device: { select: { name: true, deviceId: true } } },
    })

    return NextResponse.json({ alert })
  } catch (error) {
    console.error('PATCH /api/security/alerts/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
