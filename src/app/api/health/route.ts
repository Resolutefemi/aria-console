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
    // supabase-js errors are plain objects (not Error subclasses) —
    // re-throw with the real message so /api/health stays actionable
    // (e.g. "Invalid API key" instead of a useless "Unknown error").
    if (error) throw new Error(error.message || 'Supabase query failed')

    const durationMs = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected (supabase)',
      durationMs,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    })
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Unknown error'
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: message,
      },
      { status: 503 }
    )
  }
}
