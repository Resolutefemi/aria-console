// ═══════════════════════════════════════════════════════════════
// SOS Service — panic button for the child
// ═══════════════════════════════════════════════════════════════

import * as Haptics from 'expo-haptics'
import { getCurrentLocation } from './device'
import { getBatteryInfo } from './device'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type SOSAlert = {
  deviceId: string
  latitude: number
  longitude: number
  accuracy: number
  battery: number
  timestamp: string
  message?: string
}

/**
 * Trigger an SOS alert.
 * Sends the current location + battery to the parent dashboard
 * and triggers a high-priority notification.
 */
export async function triggerSOS(customMessage?: string): Promise<SOSAlert | null> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return null

  // Strong haptic feedback
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400)
  } catch {}

  // Get current location
  const location = await getCurrentLocation()
  const battery = await getBatteryInfo()

  const alert: SOSAlert = {
    deviceId,
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    accuracy: location?.accuracy ?? 0,
    battery: battery.level >= 0 ? battery.level : 100,
    timestamp: new Date().toISOString(),
    message: customMessage || 'SOS! I need help!',
  }

  // Send to backend — parent dashboard will show high-priority alert
  await reportData(deviceId, 'SOS_ALERT', alert)

  return alert
}

/**
 * Send a "check-in" (safe) signal.
 * Less urgent than SOS — just lets the parent know the child is okay.
 */
export async function sendCheckIn(): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return

  const location = await getCurrentLocation()
  const battery = await getBatteryInfo()

  await reportData(deviceId, 'CHECK_IN', {
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    battery: battery.level >= 0 ? battery.level : 100,
    timestamp: new Date().toISOString(),
  })

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {}
}
