import { NextRequest, NextResponse } from 'next/server'
import { ensureProfile, setSessionCookie } from '@/lib/session'
import { getAdminClient } from '@/lib/db'
import { getBrowserAuthClient } from '@/lib/supabase'

/**
 * POST /api/auth/signup
 *
 * Server-side registration WITHOUT any email-confirmation step: the
 * account is created via the Supabase Admin API with `email_confirm:
 * true`, so it is immediately usable — no "Confirm your signup" email
 * is sent and there is no link to click. A session is minted right
 * away and stored in the httpOnly `aria_session` cookie.
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

    // Create the user already-confirmed via the Admin API. This bypasses
    // the confirmation-link flow entirely, regardless of the project's
    // "Confirm email" setting, and no confirmation email is sent.
    const admin = getAdminClient()
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: name ? { name } : undefined,
      })

    if (createError) {
      const duplicate =
        createError.code === 'email_exists' ||
        /already (registered|exists)/i.test(createError.message)
      return NextResponse.json(
        {
          error: duplicate
            ? 'An account with this email already exists. Try signing in instead.'
            : createError.message,
        },
        { status: duplicate ? 409 : 400 }
      )
    }
    if (!created.user) {
      return NextResponse.json(
        { error: 'Account could not be created. Please try again.' },
        { status: 500 }
      )
    }

    // The Admin API cannot mint user sessions — sign in as the new user
    // through the publishable-key client to get one for the cookie.
    const auth = getBrowserAuthClient()
    const { data, error: signInError } = await auth.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data.session) {
      // Account exists and is confirmed — the user can simply sign in.
      console.error('[auth/signup] session mint failed:', signInError?.message)
      return NextResponse.json(
        {
          user: created.user,
          message:
            'Account created. Please sign in to continue.',
        }
      )
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
