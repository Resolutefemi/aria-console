'use client'

import { useEffect, useRef } from 'react'

/**
 * Declarative setInterval.
 * Pass a callback and a delay (ms). Pass null as delay to pause.
 *
 * @example
 * useInterval(() => setNow(Date.now()), 1000)
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
