// ═══════════════════════════════════════════════════════════════
// Screen Time Enforcement — enforces parental limits
// ═══════════════════════════════════════════════════════════════

import { getTodayAppUsage, blockApp, unblockApp, lockDevice } from './app-usage'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type ScreenTimeLimit = {
  type: 'TOTAL' | 'PER_APP' | 'BEDTIME'
  limitMin: number              // minutes per day
  appId?: string                // for PER_APP limits
  bedtimeStart?: string         // "22:00" for BEDTIME
  bedtimeEnd?: string           // "06:00" for BEDTIME
}

const LIMITS_STORAGE_KEY = 'aria_screen_limits'
const VIOLATION_LOG_KEY = 'aria_violation_log'

/**
 * Get all saved screen time limits.
 */
export async function getLimits(): Promise<ScreenTimeLimit[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem(LIMITS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Add a screen time limit.
 */
export async function addLimit(limit: ScreenTimeLimit): Promise<void> {
  const limits = await getLimits()
  limits.push(limit)
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
  await AsyncStorage.setItem(LIMITS_STORAGE_KEY, JSON.stringify(limits))
}

/**
 * Check if any limits have been exceeded and enforce them.
 * Called periodically by the background service.
 */
export async function enforceLimits(): Promise<{
  violated: boolean
  actions: string[]
}> {
  const limits = await getLimits()
  const actions: string[] = []
  let violated = false

  const usage = await getTodayAppUsage()

  for (const limit of limits) {
    if (limit.type === 'TOTAL') {
      const totalMin = usage.totalTimeMs / 60000
      if (totalMin >= limit.limitMin) {
        // Total screen time exceeded — lock device
        await lockDevice()
        actions.push(`Device locked: total screen time ${Math.round(totalMin)}min exceeded limit ${limit.limitMin}min`)
        violated = true
        await logViolation('TOTAL', totalMin, limit.limitMin)
      }
    } else if (limit.type === 'PER_APP' && limit.appId) {
      const appUsage = usage.apps.find((a) => a.packageName === limit.appId)
      if (appUsage) {
        const appMin = appUsage.totalTimeInForeground / 60000
        if (appMin >= limit.limitMin) {
          // Per-app limit exceeded — block the app
          await blockApp(limit.appId)
          actions.push(`App blocked: ${appUsage.appName} used ${Math.round(appMin)}min exceeded limit ${limit.limitMin}min`)
          violated = true
          await logViolation('PER_APP', appMin, limit.limitMin, limit.appId)
        }
      }
    } else if (limit.type === 'BEDTIME' && limit.bedtimeStart && limit.bedtimeEnd) {
      if (isBedtimeNow(limit.bedtimeStart, limit.bedtimeEnd)) {
        await lockDevice()
        actions.push(`Device locked: bedtime (${limit.bedtimeStart}-${limit.bedtimeEnd})`)
        violated = true
      }
    }
  }

  // Report violations to backend
  if (violated) {
    const deviceId = await getStoredDeviceId()
    if (deviceId) {
      await reportData(deviceId, 'LIMIT_VIOLATION', {
        actions,
        timestamp: new Date().toISOString(),
        usage: {
          totalTimeMs: usage.totalTimeMs,
          apps: usage.apps.map((a) => ({
            package: a.packageName,
            name: a.appName,
            totalMin: Math.round(a.totalTimeInForeground / 60000),
          })),
        },
      })
    }
  }

  return { violated, actions }
}

/**
 * Check if current time is within bedtime hours.
 */
function isBedtimeNow(start: string, end: string): boolean {
  const now = new Date()
  const currentMin = now.getHours() * 60 + now.getMinutes()

  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  const startMin = startH * 60 + startM
  const endMin = endH * 60 + endM

  if (startMin < endMin) {
    // Same day (e.g. 12:00 - 14:00)
    return currentMin >= startMin && currentMin < endMin
  } else {
    // Crosses midnight (e.g. 22:00 - 06:00)
    return currentMin >= startMin || currentMin < endMin
  }
}

/**
 * Log a limit violation locally for the violation history.
 */
async function logViolation(
  type: string,
  actual: number,
  limit: number,
  appId?: string
): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem(VIOLATION_LOG_KEY)
    const log = stored ? JSON.parse(stored) : []
    log.unshift({
      type,
      actual: Math.round(actual),
      limit,
      appId,
      timestamp: new Date().toISOString(),
    })
    // Keep last 100 violations
    await AsyncStorage.setItem(VIOLATION_LOG_KEY, JSON.stringify(log.slice(0, 100)))
  } catch {}
}

/**
 * Get violation history.
 */
export async function getViolationLog(): Promise<any[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem(VIOLATION_LOG_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}
