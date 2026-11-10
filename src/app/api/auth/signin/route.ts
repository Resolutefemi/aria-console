import { NextRequest, NextResponse } from 'next/server'
import { ensureProfile, setSessionCookie } from '@/lib/session'
import { getBrowserAuthClient } from '@/lib/supabase'

/**
 * POST /api/auth/signin
 * Server-side password sign-in. The browser never talks to Supabase
 * directly — it posts credentials here and receives an httpOnly session
 * cookie plus the resolved profile.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const auth = getBrowserAuthClient()
    const { data, error } = await auth.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        {
          error:
            error?.message ??
            'Invalid email or password. Please try again.',
        },
        { status: 401 }
      )
    }

    const profile = await ensureProfile(data.user)
    if (!profile) {
      return NextResponse.json(
        { error: 'Signed in, but the profile could not be loaded.' },
        { status: 500 }
      )
    }

    const res = NextResponse.json({ user: data.user, profile })
    return setSessionCookie(res, data.session)
  } catch (e) {
    console.error('[auth/signin]', e)
    return NextResponse.json(
      { error: 'Sign-in service is temporarily unavailable.' },
      { status: 500 }
    )
  }
}
