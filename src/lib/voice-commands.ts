/**
 * Natural language query parser for voice commands.
 * Interprets user speech and returns an action + response.
 */

import { parseSmartDeviceCommand, buildSmartDeviceResponse } from './smart-device-commands'

export type VoiceAction =
  | { type: 'SUMMARY' }                              // "what's happening"
  | { type: 'DEVICE_STATUS' }                        // "how are my devices"
  | { type: 'FIND_DEVICE'; name?: string }           // "where is my phone"
  | { type: 'SCREEN_TIME' }                          // "how much screen time"
  | { type: 'LOCATION'; name?: string }              // "where is [name]"
  | { type: 'ALERTS' }                               // "any alerts"
  | { type: 'LOCK_DEVICE'; name?: string }           // "lock the device"
  | { type: 'UNLOCK_DEVICE'; name?: string }         // "unlock the device"
  | { type: 'RING_DEVICE'; name?: string }           // "ring my phone"
  | { type: 'BATTERY' }                              // "battery level"
  | { type: 'HELP' }                                 // "help"
  | { type: 'SMART_DEVICE'; action: any }            // "turn on the lights"
  | { type: 'VOICE_MODE_TOGGLE' }                    // "voice mode on/off"
  | { type: 'READ_SCREEN' }                          // "read the screen"
  | { type: 'NAVIGATE'; target: string }             // "go to devices"
  | { type: 'UNKNOWN'; transcript: string }

/**
 * Parse a voice transcript into an action.
 * Uses keyword matching — not a full NLP, but handles common phrasings.
 */
export function parseVoiceCommand(transcript: string): VoiceAction {
  const t = transcript.toLowerCase().trim()

  // Help
  if (/\b(help|what can you do|commands)\b/.test(t)) {
    return { type: 'HELP' }
  }

  // Voice mode toggle (for blind users)
  if (/\b(voice mode (on|off)|turn (on|off) voice mode|enable voice mode|disable voice mode)\b/.test(t)) {
    return { type: 'VOICE_MODE_TOGGLE' }
  }

  // Read screen (for blind users)
  if (/\b(read (the )?screen|what'?s on (the )?screen|read (this )?(page|out loud)|describe (the )?screen)\b/.test(t)) {
    return { type: 'READ_SCREEN' }
  }

  // Navigation by voice (for blind users)
  if (/\b(go to|navigate to|open|show me)\b/.test(t)) {
    if (/\bdevice/.test(t)) return { type: 'NAVIGATE', target: 'devices' }
    if (/\bvoice/.test(t)) return { type: 'NAVIGATE', target: 'voice' }
    if (/\benergy|power/.test(t)) return { type: 'NAVIGATE', target: 'energy' }
    if (/\bsecurity|alert/.test(t)) return { type: 'NAVIGATE', target: 'security' }
    if (/\bpair|pairing/.test(t)) return { type: 'NAVIGATE', target: 'pair' }
  }

  // Smart device commands (lights, thermostat, locks, cameras, etc.)
  const smartAction = parseSmartDeviceCommand(t)
  if (smartAction) {
    return { type: 'SMART_DEVICE', action: smartAction }
  }

  // Lock device
  if (/\b(lock|block)\b.*\b(device|phone|tablet|kid|child)\b/.test(t) || /^lock\b/.test(t)) {
    const nameMatch = t.match(/(?:lock|block)\s+(?:the\s+)?(?:device|phone|tablet)?\s*(?:called|named)?\s*([a-z\s]+?)(?:\s*$|\s+(?:now|please))/)
    return { type: 'LOCK_DEVICE', name: nameMatch?.[1]?.trim() }
  }

  // Unlock device
  if (/\b(unlock|unblock)\b/.test(t)) {
    const nameMatch = t.match(/(?:unlock|unblock)\s+(?:the\s+)?(?:device|phone|tablet)?\s*(?:called|named)?\s*([a-z\s]+?)(?:\s*$|\s+(?:now|please))/)
    return { type: 'UNLOCK_DEVICE', name: nameMatch?.[1]?.trim() }
  }

  // Ring device
  if (/\b(ring|find my)\b.*\b(phone|device|tablet)\b/.test(t) || /^ring\b/.test(t)) {
    return { type: 'RING_DEVICE' }
  }

  // Location queries
  if (/\b(where|location|locate)\b/.test(t)) {
    const nameMatch = t.match(/(?:where is|where's|locate)\s+(?:my\s+|the\s+)?([a-z\s]+?)(?:\s*$|\s+(?:now|please|\?))/)
    return { type: 'LOCATION', name: nameMatch?.[1]?.trim() }
  }

  // Screen time
  if (/\b(screen time|how long|usage|using)\b/.test(t)) {
    return { type: 'SCREEN_TIME' }
  }

  // Alerts
  if (/\b(alert|warning|security|problem|issue)\b/.test(t)) {
    return { type: 'ALERTS' }
  }

  // Battery
  if (/\b(battery|charge|power)\b/.test(t)) {
    return { type: 'BATTERY' }
  }

  // Summary / what's happening
  if (/\b(what'?s happening|summary|status|overview|how are|what'?s going on|update)\b/.test(t)) {
    return { type: 'SUMMARY' }
  }

  // Device status
  if (/\b(device|phone|tablet|connected)\b/.test(t)) {
    return { type: 'DEVICE_STATUS' }
  }

  return { type: 'UNKNOWN', transcript }
}

/**
 * Generate a spoken response for an action based on real data.
 */
export function buildVoiceResponse(action: VoiceAction, data: {
  devices: any[]
  activity?: any
  alerts?: any[]
  stats?: any
}): string {
  const { devices, activity, alerts, stats } = data

  switch (action.type) {
    case 'HELP':
      return 'You can ask me: what\'s happening, where is my device, screen time, any alerts, lock the device, ring my phone, battery level. You can also control smart devices: turn on the lights, set thermostat to 72, lock the front door, show the backyard camera, play music, start the vacuum. For blind users: say "read the screen" or "go to devices".'

    case 'VOICE_MODE_TOGGLE':
      return 'Voice mode toggled. All screen changes will now be announced out loud.'

    case 'READ_SCREEN':
      return readScreenForBlind(data)

    case 'NAVIGATE':
      return `Navigating to ${action.target}.`

    case 'SMART_DEVICE':
      return buildSmartDeviceResponse(action.action, { success: true })

    case 'SUMMARY': {
      if (devices.length === 0) {
        return 'You have no paired devices yet. Open the pair page to link a device.'
      }
      const online = devices.filter((d) => d.status === 'ONLINE').length
      const offline = devices.filter((d) => d.status === 'OFFLINE').length
      const criticalAlerts = (alerts ?? []).filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length
      let response = `You have ${devices.length} paired device${devices.length === 1 ? '' : 's'}. ${online} online, ${offline} offline.`
      if (criticalAlerts > 0) {
        response += ` There ${criticalAlerts === 1 ? 'is' : 'are'} ${criticalAlerts} critical alert${criticalAlerts === 1 ? '' : 's'} requiring attention.`
      } else {
        response += ' No critical alerts.'
      }
      if (activity && activity.totalScreenTimeMin > 0) {
        response += ` Total screen time today: ${activity.totalScreenTimeMin} minutes.`
      }
      return response
    }

    case 'DEVICE_STATUS': {
      if (devices.length === 0) return 'No devices are paired yet.'
      const list = devices.map((d) => `${d.name} is ${d.status.toLowerCase()} with ${d.battery}% battery`).join('. ')
      return list + '.'
    }

    case 'SCREEN_TIME': {
      if (!activity || activity.totalScreenTimeMin === 0) {
        return 'No screen time data available yet.'
      }
      const top = activity.screenTime?.[0]
      if (top) {
        return `Total screen time today is ${activity.totalScreenTimeMin} minutes. Most used app: ${top.name} with ${top.totalMin} minutes.`
      }
      return `Total screen time today is ${activity.totalScreenTimeMin} minutes.`
    }

    case 'LOCATION': {
      if (!activity?.lastLocation) return 'No location data available.'
      const loc = activity.lastLocation
      return `Last known location: ${loc.address ?? 'unknown address'}. Coordinates: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}.`
    }

    case 'ALERTS': {
      const open = (alerts ?? []).filter((a) => a.status === 'OPEN')
      if (open.length === 0) return 'No open alerts. All clear.'
      const critical = open.filter((a) => a.severity === 'CRITICAL')
      if (critical.length > 0) {
        return `There ${critical.length === 1 ? 'is' : 'are'} ${critical.length} critical alert${critical.length === 1 ? '' : 's'}. ${critical[0].title}.`
      }
      return `There ${open.length === 1 ? 'is' : 'are'} ${open.length} alert${open.length === 1 ? '' : 's'}. ${open[0].title}.`
    }

    case 'BATTERY': {
      if (devices.length === 0) return 'No devices to check.'
      const list = devices.map((d) => `${d.name}: ${d.battery}%`).join('. ')
      return list + '.'
    }

    case 'LOCK_DEVICE':
      return `Locking ${action.name ?? 'the device'}. Command sent.`
    case 'UNLOCK_DEVICE':
      return `Unlocking ${action.name ?? 'the device'}. Command sent.`
    case 'RING_DEVICE':
      return 'Ringing the device. Command sent.'
    case 'FIND_DEVICE':
      return `Looking for ${action.name ?? 'your device'}.`

    default:
      return `I didn't understand that. You can ask: what's happening, where is my device, screen time, alerts, or lock the device.`
  }
}

/**
 * Read the screen for blind users.
 * Describes what's currently visible on the dashboard.
 */
function readScreenForBlind(data: {
  devices: any[]
  activity?: any
  alerts?: any[]
  stats?: any
}): string {
  const parts: string[] = []

  parts.push('Aria Console dashboard.')

  if (data.devices.length === 0) {
    parts.push('No paired devices. Open the pair page to link a device.')
  } else {
    parts.push(`You have ${data.devices.length} paired device${data.devices.length === 1 ? '' : 's'}.`)
    for (const d of data.devices.slice(0, 5)) {
      parts.push(`${d.name}: ${d.status.toLowerCase()}, ${d.battery}% battery.`)
    }
  }

  if (data.alerts && data.alerts.length > 0) {
    const open = data.alerts.filter((a) => a.status === 'OPEN')
    if (open.length > 0) {
      parts.push(`${open.length} open alert${open.length === 1 ? '' : 's'}.`)
      parts.push(`Most recent: ${open[0].title}.`)
    }
  }

  if (data.activity) {
    parts.push(`Screen time today: ${data.activity.totalScreenTimeMin} minutes.`)
    if (data.activity.lastLocation) {
      parts.push(`Last location: ${data.activity.lastLocation.address || 'unknown'}.`)
    }
  }

  parts.push('Say a command, or say "help" for options.')

  return parts.join(' ')
}
