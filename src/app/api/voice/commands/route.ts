import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const deviceId = searchParams.get('deviceId')
    const status = searchParams.get('status')

    const commands = await db.voiceCommand.findMany({
      where: {
        ...(deviceId ? { deviceId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: { device: true },
      orderBy: { issuedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ commands })
  } catch (error) {
    console.error('GET /api/voice/commands error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voice commands' },
      { status: 500 }
    )
  }
}
