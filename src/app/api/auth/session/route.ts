import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, readSessionTokens, resolveSession } from '@/lib/session'

/**
 * GET /api/auth/session
 * Resolves the current session from the httpOnly cookie. Silently
 * refreshes expired access tokens and re-issues the cookie when the
 * refresh token is still valid. Returns 401 (and clears the cookie)
 * when no valid session exists.
 */
export async function GET(request: NextRequest) {
  try {
    const tokens = readSessionTokens(request)
    const resolved = await resolveSession(tokens)

    if (!resolved) {
      const res = NextResponse.json({ user: null, profile: null }, { status: 401 })
      if (tokens) clearSessionCookie(res)
      return res
    }

    const res = NextResponse.json({
      user: resolved.authUser,
      profile: resolved.profile,
    })

    if (resolved.renewed) {
      setSessionCookie(res, resolved.renewed)
    }

    return res
  } catch (e) {
    console.error('[auth/session]', e)
    return NextResponse.json(
      { user: null, profile: null },
      { status: 401 }
    )
  }
}
