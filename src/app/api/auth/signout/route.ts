import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

/**
 * POST /api/auth/signout
 * Clears the httpOnly session cookie. The client resets its auth state
 * after this call succeeds.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  return clearSessionCookie(res)
}
