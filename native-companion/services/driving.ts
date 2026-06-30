// ═══════════════════════════════════════════════════════════════
// Driving Monitor — speed detection + auto-lock while driving
// ═══════════════════════════════════════════════════════════════
// Uses GPS speed to detect driving. When speed exceeds threshold,
// the device is locked (driving mode) until speed drops.
// ═══════════════════════════════════════════════════════════════

import * as Location from 'expo-location'
import * as Haptics from 'expo-haptics'
import { reportData } from './api'
import { getStoredDeviceId } from './api'
import { lockDevice, unlockDevice } from './app-usage'

export type DrivingEvent = {
  type: 'DRIVING_START' | 'DRIVING_END' | 'SPEEDING'
  speedMph: number
  speedKmh: number
  latitude: number
  longitude: number
  timestamp: string
}

const SPEED_THRESHOLD_KMH = 20  // Above this = driving
const SPEEDING_THRESHOLD_KMH = 100  // Above this = speeding alert
const SPEED_THRESHOLD_PAUSE_KMH = 8  // Below this = stopped

let isDriving = false
let drivingStartedAt: Date | null = null
let lastSpeedKmh = 0
let subscribers: ((event: DrivingEvent) => void)[] = []

/**
 * Start monitoring speed for driving detection.
 * Call this on app launch.
 */
export async function startDrivingMonitor(): Promise<() => void> {
  const perm = await Location.requestForegroundPermissionsAsync()
  if (!perm.granted) return () => {}

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,  // Check every 5 seconds
      distanceInterval: 10,
    },
    (loc) => {
      const speedMs = loc.coords.speed || 0
      const speedKmh = speedMs > 0 ? speedMs * 3.6 : 0
      const speedMph = speedKmh * 0.621371

      lastSpeedKmh = speedKmh

      // Detect driving start
      if (!isDriving && speedKmh >= SPEED_THRESHOLD_KMH) {
        isDriving = true
        drivingStartedAt = new Date()
        const event: DrivingEvent = {
          type: 'DRIVING_START',
          speedMph, speedKmh,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
        }
        notifySubscribers(event)
        reportDrivingEvent(event)
        enableDrivingMode()
      }

      // Detect speeding
      if (isDriving && speedKmh >= SPEEDING_THRESHOLD_KMH) {
        const event: DrivingEvent = {
          type: 'SPEEDING',
          speedMph, speedKmh,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
        }
        notifySubscribers(event)
        reportDrivingEvent(event)
      }

      // Detect driving end
      if (isDriving && speedKmh <= SPEED_THRESHOLD_PAUSE_KMH) {
        isDriving = false
        const event: DrivingEvent = {
          type: 'DRIVING_END',
          speedMph: 0, speedKmh: 0,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
        }
        notifySubscribers(event)
        reportDrivingEvent(event)
        disableDrivingMode()

        // Report total driving duration
        if (drivingStartedAt) {
          const durationMin = Math.round((Date.now() - drivingStartedAt.getTime()) / 60000)
          reportData(getStoredDeviceId().then(id => id || ''), 'DRIVING_SESSION', {
            durationMin,
            startedAt: drivingStartedAt.toISOString(),
            endedAt: event.timestamp,
          })
          drivingStartedAt = null
        }
      }
    }
  )

  return () => subscription.remove()
}

/**
 * Enable driving mode — lock the device.
 */
async function enableDrivingMode(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  } catch {}
  await lockDevice()
}

/**
 * Disable driving mode — unlock the device.
 */
async function disableDrivingMode(): Promise<void> {
  await unlockDevice()
}

/**
 * Report a driving event to the parent dashboard.
 */
async function reportDrivingEvent(event: DrivingEvent): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return
  await reportData(deviceId, 'DRIVING_EVENT', event)
}

/**
 * Subscribe to driving events.
 */
export function onDrivingEvent(callback: (event: DrivingEvent) => void): () => void {
  subscribers.push(callback)
  return () => {
    subscribers = subscribers.filter((cb) => cb !== callback)
  }
}

function notifySubscribers(event: DrivingEvent): void {
  for (const cb of subscribers) cb(event)
}

/**
 * Get current driving status.
 */
export function getDrivingStatus(): {
  isDriving: boolean
  currentSpeedKmh: number
  drivingStartedAt: Date | null
} {
  return {
    isDriving,
    currentSpeedKmh: lastSpeedKmh,
    drivingStartedAt,
  }
}

/**
 * Manually enable driving mode (e.g., parent forces it).
 */
export async function forceDrivingMode(): Promise<void> {
  isDriving = true
  drivingStartedAt = new Date()
  await enableDrivingMode()
}

/**
 * Manually disable driving mode.
 */
export async function disableForcedDrivingMode(): Promise<void> {
  isDriving = false
  drivingStartedAt = null
  await disableDrivingMode()
}
