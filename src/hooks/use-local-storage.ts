'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Persist state to localStorage with JSON serialization.
 * SSR-safe: returns initialValue on the server, hydrates on mount.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [stored, setStored] = useState<T>(initialValue)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStored(JSON.parse(item))
      }
    } catch (e) {
      console.warn(`useLocalStorage: failed to read ${key}`, e)
    }
    setHydrated(true)
  }, [key])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch (e) {
          console.warn(`useLocalStorage: failed to write ${key}`, e)
        }
        return next
      })
    },
    [key]
  )

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch (e) {
      console.warn(`useLocalStorage: failed to remove ${key}`, e)
    }
    setStored(initialValue)
  }, [key, initialValue])

  return [stored, setValue, remove]
}

/**
 * Returns true once the hook has hydrated from localStorage.
 * Useful for avoiding hydration mismatches.
 */
export function useHydrated() {
  const [h, setH] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setH(true), [])
  return h
}
