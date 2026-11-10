import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, serialize } from '@/lib/db'

/**
 * GET /api/users — list operator profiles.
 * POST /api/users — create a new operator account in Supabase Auth.
 *   The `handle_new_user` trigger creates the matching profile row;
 *   the role is passed via user metadata.
 */
export async function GET() {
  try {
    const admin = getAdminClient()

    const { data, error } = await admin
      .from('users')
      .select('id, email, name, role, is_active, last_login_at, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ users: serialize(data ?? []) })
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, role } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    const admin = getAdminClient()

    // Generate a temporary password the operator can change later.
    const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!'

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name,
          ...(role ? { role } : {}),
        },
      })

    if (authError || !authData.user) {
      console.error('POST /api/users auth error:', authError)
      return NextResponse.json(
        { error: authError?.message ?? 'Failed to create account' },
        { status: 400 }
      )
    }

    // The DB trigger creates the profile; fetch it (retry briefly in case
    // the trigger transaction is still committing).
    let profile = null
    for (let i = 0; i < 3 && !profile; i++) {
      const { data } = await admin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle()
      profile = data
      if (!profile) await new Promise((r) => setTimeout(r, 150))
    }

    return NextResponse.json(
      { user: serialize(profile), tempPassword },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
