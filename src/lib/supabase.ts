import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client for browser-side operations.
 *
 * Uses the anon key — restricted by Row Level Security policies.
 * Safe to expose to the browser (NEXT_PUBLIC_ prefix).
 *
 * Use this for:
 * - User authentication (sign in, sign up, OAuth)
 * - Realtime subscriptions (live updates)
 * - Direct queries from the browser (subject to RLS)
 */
export function createBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check your .env file.'
    )
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

/**
 * Supabase client for server-side operations.
 *
 * Uses the service_role key — BYPASSES Row Level Security.
 * NEVER import this in a client component ('use client').
 * NEVER expose the service_role key to the browser.
 *
 * Use this for:
 * - Admin operations (creating users, deleting records)
 * - Server-side data fetching with full access
 * - Background jobs and webhooks
 */
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Check your .env file.'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
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
