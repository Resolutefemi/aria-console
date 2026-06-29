'use client'

import { useState, useCallback } from 'react'

type CopiedValue = string | null
type CopyFn = (text: string) => Promise<boolean>

/**
 * Copy text to the clipboard with a transient 'copied' state.
 * Returns [copiedText, copyFn, isCopied].
 */
export function useCopyToClipboard(): [CopiedValue, CopyFn, boolean] {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null)
  const [isCopied, setIsCopied] = useState(false)

  const copy: CopyFn = useCallback(async (text) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported')
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      return true
    } catch (e) {
      console.warn('Copy failed:', e)
      return false
    }
  }, [])

  return [copiedText, copy, isCopied]
}
