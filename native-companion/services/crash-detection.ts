// ═══════════════════════════════════════════════════════════════
// Crash Detection — accelerometer spike + no movement
// ═══════════════════════════════════════════════════════════════
// Detects potential car crashes using accelerometer data.
// Pattern: sudden high G-force spike, followed by no movement.
// Triggers SOS alert with location if crash detected.
// ═══════════════════════════════════════════════════════════════

import { Accelerometer } from 'expo-sensors'
import * as Haptics from 'expo-haptics'
import { getCurrentLocation } from './device'
import { triggerSOS } from './sos'
import { recordAmbient } from './ambient-recording'

const CRASH_G_THRESHOLD = 4.0  // G-force (typical car crash: 20-50G, but phone mount absorbs some)
const STATIONARY_THRESHOLD = 0.05  // G-force (no movement)
const STATIONARY_DURATION_MS = 10000  // 10 seconds of no movement after impact
const COOLDOWN_MS = 60000  // 1 minute between crash alerts

let lastCrashAlert = 0
let potentialCrash = false
let crashImpactTime: Date | null = null
let subscription: any = null
let stationaryCheckInterval: any = null

export type CrashEvent = {
  id: string
  impactTime: string
  maxGForce: number
  latitude: number
  longitude: number
  speedKmh: number
  timestamp: string
}

/**
 * Start crash detection monitoring.
 */
export function startCrashDetection(): () => void {
  Accelerometer.setUpdateInterval(50)  // High frequency for crash detection

  let maxGForce = 0

  subscription = Accelerometer.addListener((data) => {
    const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z)

    // Track max G-force
    if (magnitude > maxGForce) {
      maxGForce = magnitude
    }

    // Check for crash impact
    if (magnitude > CRASH_G_THRESHOLD && !potentialCrash) {
      potentialCrash = true
      crashImpactTime = new Date()
      maxGForce = magnitude

      // Start checking for stationary period
      stationaryCheckInterval = setInterval(() => {
        checkStationaryAfterImpact(maxGForce)
      }, 1000)

      // Haptic warning
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      } catch {}
    }
  })

  return () => {
    if (subscription) subscription.remove()
    if (stationaryCheckInterval) clearInterval(stationaryCheckInterval)
  }
}

/**
 * Check if phone is stationary after impact (confirms crash).
 */
async function checkStationaryAfterImpact(maxGForce: number): Promise<void> {
  if (!potentialCrash || !crashImpactTime) return

  const timeSinceImpact = Date.now() - crashImpactTime.getTime()

  // If 10 seconds have passed since impact
  if (timeSinceImpact >= STATIONARY_DURATION_MS) {
    // Phone has been still for 10 seconds after impact — likely a crash
    clearInterval(stationaryCheckInterval)
    stationaryCheckInterval = null

    // Check cooldown
    if (Date.now() - lastCrashAlert < COOLDOWN_MS) {
      potentialCrash = false
      crashImpactTime = null
      return
    }

    lastCrashAlert = Date.now()
    potentialCrash = false

    // Trigger crash alert
    await handleCrashDetected(maxGForce)
    crashImpactTime = null
  }
}

/**
 * Handle a confirmed crash.
 */
async function handleCrashDetected(maxGForce: number): Promise<void> {
  // Get current location
  const location = await getCurrentLocation()

  const crashEvent: CrashEvent = {
    id: `${Date.now()}-${Math.random()}`,
    impactTime: crashImpactTime?.toISOString() ?? new Date().toISOString(),
    maxGForce,
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    speedKmh: location?.speed ? location.speed * 3.6 : 0,
    timestamp: new Date().toISOString(),
  }

  // 1. Trigger SOS with crash info
  await triggerSOS(`CRASH DETECTED! Impact force: ${maxGForce.toFixed(1)}G. Location: ${location?.latitude}, ${location?.longitude}`)

  // 2. Record 30 seconds of ambient audio (for emergency context)
  await recordAmbient('CRASH_DETECTED')

  // 3. Strong haptic pattern
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 600)
  } catch {}

  // 4. Show notification
  const { Notifications } = await import('expo-notifications')
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 CRASH DETECTED',
      body: 'Emergency SOS has been sent to your parent with your location.',
      sound: true,
      priority: 'high',
    },
    trigger: null,
  })
}

/**
 * Manually trigger crash alert (for testing).
 */
export async function simulateCrash(): Promise<void> {
  await handleCrashDetected(5.0)
}

/**
 * Cancel a potential crash (if user picks up phone quickly).
 */
export function cancelCrashDetection(): void {
  potentialCrash = false
  crashImpactTime = null
  if (stationaryCheckInterval) {
    clearInterval(stationaryCheckInterval)
    stationaryCheckInterval = null
  }
}

/**
 * Get crash detection status.
 */
export function getCrashDetectionStatus(): {
  potentialCrash: boolean
  crashImpactTime: Date | null
} {
  return {
    potentialCrash,
    crashImpactTime,
  }
}
