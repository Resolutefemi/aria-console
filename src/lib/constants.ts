/**
 * Application-wide constants for Aria Console.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Aria Console'
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

/** Polling intervals in milliseconds. */
export const POLL_INTERVALS = {
  STATS: 30_000,
  DEVICES: 15_000,
  VOICE_COMMANDS: 10_000,
  VOICE_STATS: 30_000,
  ENERGY: 60_000,
  ALERTS: 20_000,
  DEVICE_DISTRIBUTION: 30_000,
} as const

/** API endpoints (relative paths). */
export const API_ENDPOINTS = {
  STATS_OVERVIEW: '/api/stats/overview',
  DEVICES: '/api/devices',
  DEVICES_DISTRIBUTION: '/api/devices/distribution',
  VOICE_COMMANDS: '/api/voice/commands',
  VOICE_STATS: '/api/voice/stats',
  VOICE_INTENTS: '/api/voice/intents',
  ENERGY: '/api/energy',
  ENERGY_STATS: '/api/energy/stats',
  SECURITY_ALERTS: '/api/security/alerts',
  SECURITY_STATS: '/api/security/stats',
  AUDIT_LOGS: '/api/audit-logs',
  USERS: '/api/users',
  HEALTH: '/api/health',
} as const

/** Chart color palette (earthy, warm — matches theme). */
export const CHART_COLORS = {
  AMBER: 'oklch(0.78 0.14 70)',
  TEAL: 'oklch(0.7 0.1 165)',
  SLATE: 'oklch(0.62 0.09 250)',
  ORANGE: 'oklch(0.7 0.15 35)',
  WARM_GREY: 'oklch(0.55 0.05 60)',
} as const

/** Status colors. */
export const STATUS_COLORS = {
  ONLINE: 'bg-emerald-500',
  IDLE: 'bg-amber-500',
  OFFLINE: 'bg-zinc-500',
  CHARGING: 'bg-sky-400',
  CRITICAL: 'text-destructive',
  WARNING: 'text-amber-500',
  INFO: 'text-sky-400',
  SUCCESS: 'text-emerald-500',
} as const

/** App-wide keyboard shortcuts. */
export const KEYBOARD_SHORTCUTS = [
  { keys: '?', description: 'Show this help dialog' },
  { keys: '/', description: 'Focus the search input' },
  { keys: 'Esc', description: 'Close dialogs or clear filters' },
  { keys: 'r', description: 'Refresh device list' },
  { keys: 'e', description: 'Export alerts as CSV' },
] as const

/** Default page size for paginated lists. */
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200
