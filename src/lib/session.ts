import { NextRequest, NextResponse } from 'next/server'
import type { Session, User } from '@supabase/supabase-js'
import { getAdminClient } from '@/lib/db'
import { serialize } from '@/lib/db'

/**
 * httpOnly cookie sessions for Aria Console.
 *
 * Auth requests used to go straight from the browser to Supabase
 * (supabase-js → *.supabase.co). Inside sandboxed preview iframes those
 * cross-origin fetches are blocked ("Failed to fetch"), so all auth now
 * flows through our own API routes: the browser only ever talks to
 * same-origin /api/auth/*, and this module stores the Supabase session
 * tokens in an httpOnly cookie that API routes can read server-side.
 */

export const SESSION_COOKIE = 'aria_session'

/** 7 days — Supabase refresh tokens stay valid, so we can silently renew. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

type StoredTokens = {
  a: string // access_token (JWT, ~1 h validity)
  r: string // refresh_token
}

export type ProfileRow = {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  [key: string]: unknown
}

// ─── Cookie serialization ───────────────────────────────────────────

function encodeTokens(tokens: StoredTokens): string {
  return encodeURIComponent(JSON.stringify(tokens))
}

function decodeTokens(raw: string): StoredTokens | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<StoredTokens>
    if (typeof parsed.a !== 'string' || typeof parsed.r !== 'string') return null
    return { a: parsed.a, r: parsed.r }
  } catch {
    return null
  }
}

function buildCookieHeader(value: string, maxAge: number): string {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

/** Attaches (or refreshes) the session cookie on an outgoing response. */
export function setSessionCookie(
  res: NextResponse,
  session: Pick<Session, 'access_token' | 'refresh_token'>
): NextResponse {
  res.headers.append(
    'Set-Cookie',
    buildCookieHeader(
      encodeTokens({ a: session.access_token, r: session.refresh_token }),
      SESSION_MAX_AGE
    )
  )
  return res
}

/** Removes the session cookie. */
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.headers.append('Set-Cookie', buildCookieHeader('', 0))
  return res
}

/** Reads the Supabase tokens from the incoming request's session cookie. */
export function readSessionTokens(req: NextRequest): StoredTokens | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value
  if (!raw) return null
  return decodeTokens(raw)
}

// ─── Profile bootstrap ──────────────────────────────────────────────

/**
 * Guarantees a row in public.users for the given auth user. The
 * `handle_new_user` DB trigger normally handles this; this covers users
 * created before the rebuild or via edge paths that skipped the trigger.
 */
export async function ensureProfile(authUser: User): Promise<ProfileRow | null> {
  const admin = getAdminClient()

  const { data: existing } = await admin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (existing) return serialize(existing) as ProfileRow

  const name =
    (authUser.user_metadata?.name as string) ||
    authUser.email?.split('@')[0] ||
    'User'

  const isFirstUser =
    (
      await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
    ).count === 0

  const { data: created, error } = await admin
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email,
      name,
      role: isFirstUser ? 'ADMIN' : 'VIEWER',
      is_active: true,
    })
    .select('*')
    .single()

  if (error) return null

  // Keep last_login_at fresh for genuinely new rows too.
  await admin
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', authUser.id)

  return serialize(created) as ProfileRow
}

// ─── Session resolution ─────────────────────────────────────────────

export type ResolvedSession = {
  authUser: User
  profile: ProfileRow
  /** Set when the access token was renewed — cookie must be refreshed. */
  renewed: Session | null
}

/**
 * Validates the cookie tokens against Supabase. If the access token is
 * expired but the refresh token is valid, renews the session server-side
 * and returns the new session so the caller can re-set the cookie.
 */
export async function resolveSession(
  tokens: StoredTokens | null
): Promise<ResolvedSession | null> {
  if (!tokens) return null

  const admin = getAdminClient()

  // 1) Access token still valid?
  const { data: valid } = await admin.auth.getUser(tokens.a)
  if (valid?.user) {
    const profile = await ensureProfile(valid.user)
    if (!profile) return null
    if (!profile.isActive) return null
    return { authUser: valid.user, profile, renewed: null }
  }

  // 2) Expired — try a silent refresh with the refresh token.
  try {
    const { data, error } = await admin.auth.setSession({
      access_token: tokens.a,
      refresh_token: tokens.r,
    })
    if (error || !data?.session || !data.user) return null
    const profile = await ensureProfile(data.user)
    if (!profile || !profile.isActive) return null
    return { authUser: data.user, profile, renewed: data.session }
  } catch {
    return null
  }
}
