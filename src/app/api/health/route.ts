import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const start = Date.now()
  try {
    // Simple database ping
    await db.\$queryRaw\`SELECT 1\`
    const durationMs = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      durationMs,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
