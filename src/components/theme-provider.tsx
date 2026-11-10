'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Theme switching for Aria Console.
 *
 * Light mode: white + purple. Dark mode: black + purple.
 * The `aria-theme` preference is persisted in localStorage and applied
 * as a class on <html> (globals.css keys the two palettes off `.dark`).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey="aria-theme"
    >
      {children}
    </NextThemesProvider>
  )
}
