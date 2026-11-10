import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, getAuthContext, serialize } from '@/lib/db'

/**
 * POST /api/auth/sync
 * Called after sign-in/sign-up. The `handle_new_user` trigger in Postgres
 * already creates the profile row when an auth user is created; this
 * endpoint refreshes last_login_at and returns the profile (with role).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request.headers.get('authorization'))

    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()

    // Ensure the profile row exists (covers edge cases where the DB
    // trigger did not run, e.g. users created before the rebuild).
    const { data: existing } = await admin
      .from('users')
      .select('*')
      .eq('id', ctx.authUser.id)
      .maybeSingle()

    let dbUser = existing

    if (!dbUser) {
      const name =
        (ctx.authUser.user_metadata?.name as string) ||
        (ctx.authUser.email ? ctx.authUser.email.split('@')[0] : 'User')

      const isFirstUser =
        (
          await admin
            .from('users')
            .select('id', { count: 'exact', head: true })
        ).count === 0

      const { data: created, error: insertError } = await admin
        .from('users')
        .insert({
          id: ctx.authUser.id,
          email: ctx.authUser.email ?? '',
          name,
          role: isFirstUser ? 'ADMIN' : 'MEMBER',
        })
        .select()
        .single()

      if (insertError) {
        console.error('POST /api/auth/sync insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to sync user' },
          { status: 500 }
        )
      }
      dbUser = created
    }

    // Update last login
    const { data: updated } = await admin
      .from('users')
      .update({ last_login_at: new Date().toISOString(), is_active: true })
      .eq('id', ctx.authUser.id)
      .select()
      .single()

    if (updated) dbUser = updated

    return NextResponse.json({
      user: serialize({
        id: dbUser!.id,
        email: dbUser!.email,
        name: dbUser!.name,
        role: dbUser!.role,
      }),
    })
  } catch (error) {
    console.error('POST /api/auth/sync error:', error)
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
  }
}
