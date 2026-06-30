// ═══════════════════════════════════════════════════════════════
// Sleep Tracker — detect when phone hasn't moved for 6+ hours
// ═══════════════════════════════════════════════════════════════
// Uses accelerometer to detect phone movement. When the phone
// hasn't moved for 6+ hours (typically overnight), infers sleep.
// Also detects wake-up (first movement after sleep period).
// ═══════════════════════════════════════════════════════════════

import { Accelerometer } from 'expo-sensors'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type SleepSession = {
  id: string
  startTime: string  // when phone stopped moving
  endTime: string    // when phone started moving again
  durationMin: number
  quality: 'GOOD' | 'FAIR' | 'POOR'
  interruptions: number  // times phone moved briefly during sleep
}

const SLEEP_THRESHOLD_HOURS = 6
const MOVEMENT_THRESHOLD = 0.1  // G-force
const CHECK_INTERVAL_MS = 60000  // Check every minute

let lastMovementTime: Date = new Date()
let isSleeping = false
let sleepStartTime: Date | null = null
let interruptions = 0
let subscription: any = null
let checkInterval: any = null

/**
 * Start sleep tracking.
 */
export function startSleepTracker(): () => void {
  Accelerometer.setUpdateInterval(5000)

  subscription = Accelerometer.addListener((data) => {
    const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + (data.z - 1) * (data.z - 1))

    if (magnitude > MOVEMENT_THRESHOLD) {
      // Phone moved
      if (isSleeping) {
        // Brief movement during sleep — could be an interruption
        interruptions++
        // If movement continues for more than 2 minutes, consider it wake-up
        setTimeout(() => {
          if (isSleeping) {
            // Still sleeping after brief movement
          }
        }, 120000)
      }
      lastMovementTime = new Date()
    }
  })

  // Check every minute if phone has been still long enough
  checkInterval = setInterval(() => {
    checkSleepState()
  }, CHECK_INTERVAL_MS)

  return () => {
    if (subscription) subscription.remove()
    if (checkInterval) clearInterval(checkInterval)
  }
}

/**
 * Check if phone should be considered "sleeping".
 */
async function checkSleepState(): Promise<void> {
  const now = new Date()
  const stillDurationMs = now.getTime() - lastMovementTime.getTime()
  const stillDurationHours = stillDurationMs / (1000 * 60 * 60)

  if (!isSleeping && stillDurationHours >= SLEEP_THRESHOLD_HOURS) {
    // Phone has been still for 6+ hours — start sleep session
    isSleeping = true
    sleepStartTime = lastMovementTime
    interruptions = 0
  } else if (isSleeping) {
    // Check if phone started moving (wake up)
    const recentMovement = now.getTime() - lastMovementTime.getTime()
    if (recentMovement < 60000) {
      // Phone moved in last minute — wake up
      isSleeping = false

      if (sleepStartTime) {
        const durationMin = Math.round((lastMovementTime.getTime() - sleepStartTime.getTime()) / 60000)

        if (durationMin >= SLEEP_THRESHOLD_HOURS * 60) {
          // Report sleep session
          const session: SleepSession = {
            id: `${Date.now()}-${Math.random()}`,
            startTime: sleepStartTime.toISOString(),
            endTime: lastMovementTime.toISOString(),
            durationMin,
            quality: getSleepQuality(durationMin, interruptions),
            interruptions,
          }

          const deviceId = await getStoredDeviceId()
          if (deviceId) {
            await reportData(deviceId, 'SLEEP_SESSION', session)
          }
        }

        sleepStartTime = null
      }
    }
  }
}

/**
 * Determine sleep quality based on duration and interruptions.
 */
function getSleepQuality(durationMin: number, interruptions: number): 'GOOD' | 'FAIR' | 'POOR' {
  const hours = durationMin / 60

  if (hours >= 7 && interruptions <= 2) return 'GOOD'
  if (hours >= 5 && interruptions <= 5) return 'FAIR'
  return 'POOR'
}

/**
 * Get current sleep status.
 */
export function getSleepStatus(): {
  isSleeping: boolean
  sleepStartTime: Date | null
  lastMovementTime: Date
  interruptions: number
} {
  return {
    isSleeping,
    sleepStartTime,
    lastMovementTime,
    interruptions,
  }
}

/**
 * Get sleep history (from storage).
 */
export async function getSleepHistory(): Promise<SleepSession[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem('aria_sleep_history')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save sleep session to history.
 */
export async function saveSleepSession(session: SleepSession): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const history = await getSleepHistory()
    history.unshift(session)
    // Keep last 30 sessions
    await AsyncStorage.setItem('aria_sleep_history', JSON.stringify(history.slice(0, 30)))
  } catch {}
}
