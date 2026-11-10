import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'

export async function GET() {
  const start = Date.now()
  try {
    // Simple database ping — count devices via Supabase
    const { error } = await getAdminClient().from('devices').select('id', {
      count: 'exact',
      head: true,
    })
    if (error) throw error

    const durationMs = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected (supabase)',
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
