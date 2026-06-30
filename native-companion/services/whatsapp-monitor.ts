// ═══════════════════════════════════════════════════════════════
// WhatsApp Monitor — read WhatsApp messages via notification listener
// ═══════════════════════════════════════════════════════════════
// Captures WhatsApp incoming messages through Android's
// NotificationListenerService. Cannot read encrypted messages
// directly — only what appears in notifications.
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'
import { scanContent } from './social-monitor'

export type WhatsAppMessage = {
  id: string
  sender: string
  message: string
  isGroup: boolean
  groupName?: string
  timestamp: string
  flagged: boolean
  flagReason?: string
}

const WHATSAPP_PACKAGES = [
  'com.whatsapp',
  'com.whatsapp.w4b',  // WhatsApp Business
]

let listener: any = null
let isEnabled = false

/**
 * Enable WhatsApp monitoring (Android only).
 * Requires notification listener permission:
 * Settings → Notifications → Notification access → Aria Companion
 */
export async function enableWhatsAppMonitor(): Promise<boolean> {
  if (Platform.OS !== 'android') return false

  try {
    const { NotificationListener } = NativeModules
    if (!NotificationListener) return false

    const granted = await NotificationListener.requestPermission()
    if (!granted) return false

    listener = NotificationListener.addListener((notification: any) => {
      if (WHATSAPP_PACKAGES.includes(notification.packageName)) {
        handleWhatsAppNotification(notification)
      }
    })

    NotificationListener.start(WHATSAPP_PACKAGES)
    isEnabled = true
    return true
  } catch (e) {
    console.error('Failed to enable WhatsApp monitor:', e)
    return false
  }
}

/**
 * Disable WhatsApp monitoring.
 */
export async function disableWhatsAppMonitor(): Promise<void> {
  if (Platform.OS !== 'android') return

  try {
    const { NotificationListener } = NativeModules
    if (!NotificationListener) return

    if (listener) {
      listener.remove()
      listener = null
    }

    NotificationListener.stop()
    isEnabled = false
  } catch {}
}

/**
 * Check if WhatsApp monitor is enabled.
 */
export function isWhatsAppMonitorEnabled(): boolean {
  return isEnabled
}

/**
 * Handle a WhatsApp notification.
 */
async function handleWhatsAppNotification(notification: {
  title: string
  text: string
  packageName: string
  timestamp: number
}): Promise<void> {
  // Parse notification: "Sender: message" or "Group: Sender: message"
  const isGroup = notification.title.includes(':') && notification.text.includes(':')

  let sender = notification.title
  let message = notification.text
  let groupName: string | undefined

  if (isGroup) {
    const parts = notification.text.split(':')
    if (parts.length >= 2) {
      sender = parts[0].trim()
      message = parts.slice(1).join(':').trim()
      groupName = notification.title
    }
  }

  // Scan for flagged content
  const alerts = scanContent(`${sender} ${message}`, 'WhatsApp')
  const flagged = alerts.length > 0
  const flagReason = alerts[0]?.category

  const whatsappMessage: WhatsAppMessage = {
    id: `${Date.now()}-${Math.random()}`,
    sender,
    message,
    isGroup,
    groupName,
    timestamp: new Date(notification.timestamp).toISOString(),
    flagged,
    flagReason,
  }

  // Report to parent dashboard
  const deviceId = await getStoredDeviceId()
  if (deviceId) {
    await reportData(deviceId, 'WHATSAPP_MESSAGE', whatsappMessage)
  }
}

/**
 * Get list of monitored WhatsApp packages.
 */
export function getMonitoredPackages(): string[] {
  return WHATSAPP_PACKAGES
}
