import { NextRequest, NextResponse } from 'next/server'
import { ensureProfile, setSessionCookie } from '@/lib/session'
import { getBrowserAuthClient } from '@/lib/supabase'

/**
 * POST /api/auth/signup
 * Server-side registration. When the project has email confirmation
 * enabled and no session comes back, the response carries
 * `needsConfirmation: true` so the UI can tell the user to check their
 * inbox. When confirmation is disabled, an httpOnly session cookie is
 * set immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const name =
      typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim()
        : undefined

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    const auth = getBrowserAuthClient()
    const { data, error } = await auth.auth.signUp({
      email,
      password,
      options: { data: name ? { name } : undefined },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Email confirmation required — no session yet.
    if (!data.session || !data.user) {
      return NextResponse.json({
        needsConfirmation: true,
        message: data.user
          ? 'Account created. Check your email for a confirmation link, then sign in.'
          : 'Check your email for a confirmation link, then sign in.',
      })
    }

    const profile = await ensureProfile(data.user)
    if (!profile) {
      return NextResponse.json(
        { error: 'Account created, but the profile could not be set up.' },
        { status: 500 }
      )
    }

    const res = NextResponse.json({ user: data.user, profile })
    return setSessionCookie(res, data.session)
  } catch (e) {
    console.error('[auth/signup]', e)
    return NextResponse.json(
      { error: 'Sign-up service is temporarily unavailable.' },
      { status: 500 }
    )
  }
}
