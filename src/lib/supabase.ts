import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client for browser-side operations.
 *
 * Uses the publishable key (new API key format) — restricted by Row Level
 * Security policies. Safe to expose to the browser (NEXT_PUBLIC_ prefix).
 *
 * Use this for:
 * - User authentication (sign in, sign up, OAuth)
 * - Realtime subscriptions (live updates)
 * - Direct queries from the browser (subject to RLS)
 */
export function createBrowserClient(): SupabaseClient {
  // NOTE: NEXT_PUBLIC_* vars must be referenced statically so Next.js
  // inlines them into the client bundle at build time.
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (process.env.SUPABASE_URL as string | undefined)
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined)

  if (!url || !publishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check your .env file.'
    )
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

/**
 * Supabase client for server-side operations.
 *
 * Uses the secret key (new API key format, replaces service_role) —
 * BYPASSES Row Level Security. NEVER import this in a client component
 * ('use client'). NEVER expose it to the browser.
 *
 * Use this for:
 * - Admin operations (creating users, deleting records)
 * - Server-side data fetching with full access
 * - Background jobs and webhooks
 */
export function createServerClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (process.env.SUPABASE_URL as string | undefined)
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    (process.env.SUPABASE_SECRET_KEY as string | undefined)

  if (!url || !secretKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Check your .env file.'
    )
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Publishable-key Supabase client for SERVER-side auth flows
 * (sign-in / sign-up / token refresh). Uses the restricted publishable
 * key so password operations behave exactly like the public API —
 * unlike the secret-key client, which bypasses auth policies.
 *
 * Session persistence is off: tokens are stored in the httpOnly
 * `aria_session` cookie instead (see src/lib/session.ts).
 */
export function createAuthClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (process.env.SUPABASE_URL as string | undefined)
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined)

  if (!url || !publishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check your .env file.'
    )
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

let _authClient: SupabaseClient | null = null

export function getBrowserAuthClient(): SupabaseClient {
  if (!_authClient) _authClient = createAuthClient()
  return _authClient
}

/**
 * Lazy-initialized singletons (created on first use).
 * Avoids throwing during build if env vars are missing.
 */
let _browserClient: SupabaseClient | null = null
let _serverClient: SupabaseClient | null = null

export function getBrowserClient(): SupabaseClient {
  if (!_browserClient) _browserClient = createBrowserClient()
  return _browserClient
}

export function getServerClient(): SupabaseClient {
  if (!_serverClient) _serverClient = createServerClient()
  return _serverClient
}
