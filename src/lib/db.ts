import { SupabaseClient, User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { readSessionTokens } from '@/lib/session'

/**
 * Supabase data layer — replaces the old Prisma client.
 *
 * All server-side data access goes through the admin client (secret key,
 * bypasses RLS). Rows come back from PostgREST in snake_case; `serialize`
 * converts them to the camelCase API contract the dashboard was built on.
 */

const globalForDb = globalThis as unknown as {
  ariaAdminClient: SupabaseClient | undefined
}

/** Admin Supabase client singleton (service/secret key, server-only). */
export function getAdminClient(): SupabaseClient {
  if (!globalForDb.ariaAdminClient) {
    globalForDb.ariaAdminClient = getServerClient()
  }
  return globalForDb.ariaAdminClient
}

// ─── Row serialization (snake_case → camelCase) ─────────────────────

/** Fields holding raw jsonb — keys inside them are left untouched. */
const JSONB_FIELDS = new Set(['metadata', 'payload', 'result', 'config'])

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Deeply converts DB row keys from snake_case to camelCase, preserving
 * jsonb payloads verbatim. Date objects pass through unchanged.
 */
export function serialize<T = any>(row: unknown): T {
  if (Array.isArray(row)) return row.map((r) => serialize(r)) as any
  if (row && typeof row === 'object' && !(row instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      out[snakeToCamel(key)] = JSONB_FIELDS.has(key) ? value : serialize(value)
    }
    return out as T
  }
  return row as T
}

/**
 * PostgREST aggregate embeds come back as `rel: [{ count: N }]`.
 * This unwraps them to a plain number.
 */
export function countOf(embed: unknown): number {
  if (Array.isArray(embed)) return (embed[0] as any)?.count ?? 0
  if (embed && typeof embed === 'object') return (embed as any).count ?? 0
  return 0
}

// ─── Auth context ───────────────────────────────────────────────────

export type AuthContext = {
  authUser: User
  dbUser: {
    id: string
    email: string
    name: string
    role: string
    isActive: boolean
    [key: string]: unknown
  }
}

/**
 * Resolves the current user from either the `Authorization: Bearer <jwt>`
 * header or the httpOnly `aria_session` cookie (whichever is present).
 * Returns null when no valid token can be found.
 */
export async function getAuthContext(
  auth: NextRequest | string | null
): Promise<AuthContext | null> {
  let token: string | null = null

  if (auth && typeof auth !== 'string') {
    token =
      auth.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ??
      null
    if (!token) {
      token = readSessionTokens(auth)?.a ?? null
    }
  } else {
    token = auth?.replace(/^Bearer\s+/i, '').trim() ?? null
  }

  if (!token) return null

  const admin = getAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null

  const { data: dbRow } = await admin
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!dbRow) return null

  return { authUser: data.user, dbUser: serialize(dbRow) }
}
