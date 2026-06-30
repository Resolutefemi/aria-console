'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getBrowserClient } from '@/lib/supabase'

type DbUser = {
  id: string
  email: string
  name: string
  role: string
}

type AuthContextValue = {
  user: User | null
  dbUser: DbUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  async function syncDbUser(sess: Session | null) {
    if (!sess?.access_token) {
      setDbUser(null)
      return
    }
    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sess.access_token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setDbUser(data.user)
      }
    } catch (e) {
      console.error('Failed to sync user:', e)
    }
  }

  useEffect(() => {
    const supabase = getBrowserClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      await syncDbUser(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        await syncDbUser(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: name ? { name } : undefined },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
    setDbUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, dbUser, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
