'use client'

import { useEffect, useState } from 'react'

/**
 * Debounce a rapidly-changing value.
 * Returns the value after `delay` ms has elapsed without changes.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
