// ═══════════════════════════════════════════════════════════════
// Panic Shake — shake the phone to trigger SOS
// ═══════════════════════════════════════════════════════════════
// Uses the accelerometer to detect shaking. When the phone is
// shaken hard enough, triggers an SOS alert automatically.
// ═══════════════════════════════════════════════════════════════

import { Accelerometer } from 'expo-sensors'
import * as Haptics from 'expo-haptics'
import { triggerSOS } from './sos'

const SHAKE_THRESHOLD = 2.5  // G-force threshold
const SHAKE_TIMEOUT = 3000   // Min ms between shake triggers
const SHAKE_COUNT_THRESHOLD = 3  // Need 3 shakes within 1 second

let lastTrigger = 0
let shakeCount = 0
let lastShakeTime = 0
let subscription: any = null
let enabled = false

/**
 * Enable shake-to-SOS.
 * The user must shake the phone 3 times within 1 second.
 */
export function enablePanicShake(): void {
  if (enabled) return
  enabled = true

  Accelerometer.setUpdateInterval(100)

  subscription = Accelerometer.addListener((data) => {
    const { x, y, z } = data
    // Calculate total acceleration magnitude (subtract gravity ~1)
    const magnitude = Math.sqrt(x * x + y * y + z * z) - 1

    if (magnitude > SHAKE_THRESHOLD) {
      const now = Date.now()

      // Reset shake count if too much time passed
      if (now - lastShakeTime > 1000) {
        shakeCount = 0
      }

      shakeCount++
      lastShakeTime = now

      // Check if we've hit the threshold
      if (shakeCount >= SHAKE_COUNT_THRESHOLD) {
        if (now - lastTrigger > SHAKE_TIMEOUT) {
          lastTrigger = now
          shakeCount = 0
          handleShake()
        }
      }
    }
  })
}

/**
 * Disable shake-to-SOS.
 */
export function disablePanicShake(): void {
  enabled = false
  if (subscription) {
    subscription.remove()
    subscription = null
  }
}

/**
 * Handle a shake event — trigger SOS.
 */
async function handleShake(): Promise<void> {
  try {
    // Strong haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300)
  } catch {}

  // Trigger SOS
  await triggerSOS('Shake detected — possible emergency')
}

/**
 * Check if panic shake is enabled.
 */
export function isPanicShakeEnabled(): boolean {
  return enabled
}

/**
 * Calibrate the shake threshold.
 * Call this when the user holds the phone steady.
 */
export async function calibrateShakeThreshold(): Promise<number> {
  return new Promise((resolve) => {
    const readings: number[] = []
    const sub = Accelerometer.addListener((data) => {
      const { x, y, z } = data
      const magnitude = Math.sqrt(x * x + y * y + z * z) - 1
      readings.push(Math.abs(magnitude))
    })

    setTimeout(() => {
      sub.remove()
      if (readings.length === 0) {
        resolve(SHAKE_THRESHOLD)
        return
      }
      const avg = readings.reduce((s, v) => s + v, 0) / readings.length
      const max = Math.max(...readings)
      // Set threshold to 2x the max reading during calibration
      const newThreshold = Math.max(SHAKE_THRESHOLD, max * 2)
      resolve(newThreshold)
    }, 2000)
  })
}
