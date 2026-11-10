'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'

/**
 * Auth state for Aria Console.
 *
 * All authentication flows through same-origin API routes
 * (/api/auth/*) which hold the Supabase session in an httpOnly cookie.
 * The browser never talks to Supabase directly, so sign-in works even
 * in sandboxed preview iframes where cross-origin fetches are blocked.
 */

type DbUser = {
  id: string
  email: string
  name: string
  role: string
  isActive?: boolean
  [key: string]: unknown
}

type AuthContextValue = {
  user: User | null
  dbUser: DbUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user ?? null)
        setDbUser(data.profile ?? null)
      } else {
        setUser(null)
        setDbUser(null)
      }
    } catch {
      setUser(null)
      setDbUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { error: data.error ?? 'Unable to sign in. Please try again.' }
      }
      setUser(data.user ?? null)
      setDbUser(data.profile ?? null)
      return { error: null }
    } catch {
      return {
        error: 'Could not reach the sign-in service. Check your connection.',
      }
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          return {
            error: data.error ?? 'Unable to create the account. Please try again.',
          }
        }
        setUser(data.user ?? null)
        setDbUser(data.profile ?? null)
        return { error: null }
      } catch {
        return {
          error: 'Could not reach the sign-up service. Check your connection.',
        }
      }
    },
    []
  )

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // Cookie clearing is best-effort; reset local state regardless.
    }
    setUser(null)
    setDbUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, dbUser, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
