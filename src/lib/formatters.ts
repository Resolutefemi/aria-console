/**
 * Locale-aware formatters for the Aria Console dashboard.
 * All formatters are pure functions (no side effects).
 */

const LOCALE = 'en-US'
const CURRENCY = 'NGN'

/** Format a number with thousands separators. */
export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format a number as Naira currency (no symbol — caller adds ₦). */
export function formatNaira(n: number): string {
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/** Format a Date as HH:MM:SS (24-hour). */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/** Format a Date as 'Mon, Jan 15'. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Format a Date as ISO date (YYYY-MM-DD). */
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Format an ISO date string as a relative time (e.g. '3 min ago'). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} d ago`
  return formatDate(new Date(iso))
}

/** Format a Wi-Fi signal strength in dBm as a human label. */
export function signalLabel(dbm: number): { label: string; strength: number } {
  if (dbm === 0) return { label: 'No signal', strength: 0 }
  if (dbm >= -55) return { label: 'Excellent', strength: 4 }
  if (dbm >= -65) return { label: 'Good', strength: 3 }
  if (dbm >= -75) return { label: 'Fair', strength: 2 }
  return { label: 'Weak', strength: 1 }
}

/** Truncate a string with an ellipsis if it exceeds maxLength. */
export function truncate(s: string, maxLength: number): string {
  return s.length > maxLength ? s.slice(0, maxLength - 1) + '…' : s
}

/** Convert a string to kebab-case (used for CSS class names, IDs). */
export function kebabCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/** Format a confidence (0-1) as a percentage. */
export function confidencePct(c: number): string {
  return `${Math.round(c * 100)}%`
}
