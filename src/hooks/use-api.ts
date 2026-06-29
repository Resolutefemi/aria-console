'use client'

import { useEffect, useState, useCallback } from 'react'

type FetchState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Generic data-fetching hook with polling support.
 * Automatically includes the Supabase auth token if available.
 *
 * @param url API endpoint URL (relative path)
 * @param options.refetchInterval Optional polling interval in ms (0 = disabled)
 * @param options.enabled If false, skip fetching (default: true)
 */
export function useApi<T>(
  url: string | null,
  options: { refetchInterval?: number; enabled?: boolean } = {}
): FetchState<T> {
  const { refetchInterval = 0, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(!!url && enabled)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Get the Supabase session token from localStorage
        let token: string | null = null
        try {
          const stored = localStorage.getItem('sb-hfvxywlzlkysrgrwelgz-auth-token')
          if (stored) {
            const parsed = JSON.parse(stored)
            token = parsed?.access_token ?? null
          }
        } catch {}

        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(url, {
          signal: controller.signal,
          headers,
        })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return
        if (!cancelled) {
          setError(err.message ?? 'Unknown error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    let intervalId: ReturnType<typeof setInterval> | null = null
    if (refetchInterval > 0) {
      intervalId = setInterval(load, refetchInterval)
    }

    return () => {
      cancelled = true
      controller.abort()
      if (intervalId) clearInterval(intervalId)
    }
  }, [url, enabled, refetchInterval, tick])

  return { data, loading, error, refetch }
}

