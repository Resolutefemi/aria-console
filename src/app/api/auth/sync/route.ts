import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerClient } from '@/lib/supabase'

/**
 * POST /api/auth/sync
 * Called after sign-in/sign-up to ensure a row exists in our `users` table
 * for the Supabase Auth user. Returns the user record (with DB id).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServerClient()
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to find existing user by email
    let dbUser = await db.user.findUnique({
      where: { email: user.email ?? '' },
    })

    if (!dbUser) {
      // Create new user record from Supabase Auth
      const name =
        (user.user_metadata?.name as string) ||
        (user.email ? user.email.split('@')[0] : 'User')

      dbUser = await db.user.create({
        data: {
          email: user.email ?? '',
          name,
          role: 'ADMIN',
          lastLoginAt: new Date(),
        },
      })
    } else {
      // Update last login
      dbUser = await db.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date(), isActive: true },
      })
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      },
    })
  } catch (error) {
    console.error('POST /api/auth/sync error:', error)
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
  }
}
