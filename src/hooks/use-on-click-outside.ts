'use client'

import { useEffect, RefObject } from 'react'

/**
 * Call a handler when a click occurs outside the referenced element.
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null)
 * useOnClickOutside(ref, () => setMenuOpen(false))
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    function listener(event: MouseEvent | TouchEvent) {
      const el = ref.current
      if (!el || el.contains(event.target as Node)) return
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}
