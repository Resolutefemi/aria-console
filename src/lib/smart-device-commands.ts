// ═══════════════════════════════════════════════════════════════
// Smart Device Voice Commands — control ALL device types by voice
// ═══════════════════════════════════════════════════════════════
// This is the heart of the voice-controlled smart device system.
// Users (including blind users) can control ANY paired device by voice.
// ═══════════════════════════════════════════════════════════════

import { parseVoiceCommand } from './voice-commands'

export type SmartDeviceType =
  | 'PHONE'
  | 'SPEAKER'
  | 'WATCH'
  | 'TABLET'
  | 'HEADPHONES'
  | 'DISPLAY'
  | 'THERMOSTAT'
  | 'CAMERA'
  | 'LIGHT'
  | 'LOCK'
  | 'PLUG'
  | 'TV'
  | 'DOORBELL'
  | 'GARAGE'
  | 'VACUUM'
  | 'FRIDGE'

export type SmartDeviceAction = {
  deviceType: SmartDeviceType
  deviceName?: string
  room?: string
  command: string
  params?: Record<string, any>
}

/**
 * Parse a voice command for smart device control.
 * Understands natural language for all device types.
 *
 * Examples:
 * - "Turn on the living room lights" → { deviceType: 'LIGHT', room: 'Living Room', command: 'ON' }
 * - "Set thermostat to 72" → { deviceType: 'THERMOSTAT', command: 'SET_TEMPERATURE', params: { temp: 72 } }
 * - "Lock the front door" → { deviceType: 'LOCK', deviceName: 'Front Door', command: 'LOCK' }
 * - "Show the backyard camera" → { deviceType: 'CAMERA', deviceName: 'Backyard', command: 'SHOW_FEED' }
 * - "Play music on the living room speaker" → { deviceType: 'SPEAKER', room: 'Living Room', command: 'PLAY' }
 * - "Vacuum the living room" → { deviceType: 'VACUUM', room: 'Living Room', command: 'START' }
 * - "Is the garage door open?" → { deviceType: 'GARAGE', command: 'STATUS' }
 * - "Turn off everything in the bedroom" → { deviceType: 'LIGHT', room: 'Bedroom', command: 'OFF' }
 */
export function parseSmartDeviceCommand(transcript: string): SmartDeviceAction | null {
  const t = transcript.toLowerCase().trim()

  // ─── Lights ─────────────────────────────────────────────
  if (/\b(light|lights|lamp|bulb)\b/.test(t)) {
    const room = extractRoom(t)
    const isOn = /\b(turn on|switch on|enable|activate)\b/.test(t)
    const isOff = /\b(turn off|switch off|disable|deactivate)\b/.test(t)
    const brightness = t.match(/(\d+)\s*(?:percent|%)?/)

    if (isOn) return { deviceType: 'LIGHT', room, command: 'ON', params: brightness ? { brightness: parseInt(brightness[1]) } : undefined }
    if (isOff) return { deviceType: 'LIGHT', room, command: 'OFF' }
    if (brightness) return { deviceType: 'LIGHT', room, command: 'SET_BRIGHTNESS', params: { brightness: parseInt(brightness[1]) } }
    if (/\b(dim|darker)\b/.test(t)) return { deviceType: 'LIGHT', room, command: 'DIM' }
    if (/\b(brighten|brighter)\b/.test(t)) return { deviceType: 'LIGHT', room, command: 'BRIGHTEN' }
    return { deviceType: 'LIGHT', room, command: 'STATUS' }
  }

  // ─── Thermostat ─────────────────────────────────────────
  if (/\b(thermostat|temperature|temp|heater|ac|air conditioner|cool|heat|warm)\b/.test(t)) {
    const room = extractRoom(t)
    const tempMatch = t.match(/(\d+)\s*(?:degrees?|°|deg)?/)
    const isCool = /\b(cool|cooling|ac)\b/.test(t)
    const isHeat = /\b(heat|heating|warm)\b/.test(t)

    if (tempMatch) return { deviceType: 'THERMOSTAT', room, command: 'SET_TEMPERATURE', params: { temp: parseInt(tempMatch[1]) } }
    if (isCool) return { deviceType: 'THERMOSTAT', room, command: 'SET_MODE', params: { mode: 'COOL' } }
    if (isHeat) return { deviceType: 'THERMOSTAT', room, command: 'SET_MODE', params: { mode: 'HEAT' } }
    return { deviceType: 'THERMOSTAT', room, command: 'STATUS' }
  }

  // ─── Locks ──────────────────────────────────────────────
  if (/\b(lock|unlock|door)\b/.test(t)) {
    const deviceName = extractDeviceName(t, ['front door', 'back door', 'garage door'])
    const isLock = /\block\b/.test(t) && !/\bunlock\b/.test(t)
    const isUnlock = /\bunlock\b/.test(t)

    if (isLock) return { deviceType: 'LOCK', deviceName, command: 'LOCK' }
    if (isUnlock) return { deviceType: 'LOCK', deviceName, command: 'UNLOCK' }
    return { deviceType: 'LOCK', deviceName, command: 'STATUS' }
  }

  // ─── Cameras ────────────────────────────────────────────
  if (/\b(camera|feed|video|show|view)\b/.test(t)) {
    const deviceName = extractDeviceName(t, ['front door', 'backyard', 'garage', 'living room'])
    return { deviceType: 'CAMERA', deviceName, command: 'SHOW_FEED' }
  }

  // ─── Speakers / Music ───────────────────────────────────
  if (/\b(speaker|music|play|pause|stop|song|playlist|volume)\b/.test(t)) {
    const room = extractRoom(t)
    if (/\bplay\b/.test(t)) return { deviceType: 'SPEAKER', room, command: 'PLAY' }
    if (/\bpause\b/.test(t)) return { deviceType: 'SPEAKER', room, command: 'PAUSE' }
    if (/\bstop\b/.test(t)) return { deviceType: 'SPEAKER', room, command: 'STOP' }
    if (/\bskip\b/.test(t)) return { deviceType: 'SPEAKER', room, command: 'SKIP' }
    if (/\bvolume up|louder\b/.test(t)) return { deviceType: 'SPEAKER', room, command: 'VOLUME_UP' }
    if (/\bvolume down|quieter\b/.test(t)) return { deviceType: 'SPEAKER', room, command: 'VOLUME_DOWN' }
    const volMatch = t.match(/(\d+)\s*(?:percent|%)?/)
    if (volMatch && /volume/.test(t)) return { deviceType: 'SPEAKER', room, command: 'SET_VOLUME', params: { volume: parseInt(volMatch[1]) } }
    return { deviceType: 'SPEAKER', room, command: 'STATUS' }
  }

  // ─── TV ─────────────────────────────────────────────────
  if (/\b(tv|television|television)\b/.test(t)) {
    const room = extractRoom(t)
    if (/\bturn on|switch on\b/.test(t)) return { deviceType: 'TV', room, command: 'ON' }
    if (/\bturn off|switch off\b/.test(t)) return { deviceType: 'TV', room, command: 'OFF' }
    if (/\bvolume up\b/.test(t)) return { deviceType: 'TV', room, command: 'VOLUME_UP' }
    if (/\bvolume down\b/.test(t)) return { deviceType: 'TV', room, command: 'VOLUME_DOWN' }
    if (/\bmute\b/.test(t)) return { deviceType: 'TV', room, command: 'MUTE' }
    if (/\bchannel up|next channel\b/.test(t)) return { deviceType: 'TV', room, command: 'CHANNEL_UP' }
    if (/\bchannel down|previous channel\b/.test(t)) return { deviceType: 'TV', room, command: 'CHANNEL_DOWN' }
    return { deviceType: 'TV', room, command: 'STATUS' }
  }

  // ─── Vacuum ─────────────────────────────────────────────
  if (/\b(vacuum|roomba|clean|cleaning)\b/.test(t)) {
    const room = extractRoom(t)
    if (/\bstart|begin|clean\b/.test(t)) return { deviceType: 'VACUUM', room, command: 'START' }
    if (/\bstop|pause|cancel\b/.test(t)) return { deviceType: 'VACUUM', room, command: 'STOP' }
    if (/\bdock|charge|return\b/.test(t)) return { deviceType: 'VACUUM', room, command: 'DOCK' }
    return { deviceType: 'VACUUM', room, command: 'STATUS' }
  }

  // ─── Garage Door ────────────────────────────────────────
  if (/\bgarage\b/.test(t)) {
    if (/\bopen\b/.test(t)) return { deviceType: 'GARAGE', command: 'OPEN' }
    if (/\bclose\b/.test(t)) return { deviceType: 'GARAGE', command: 'CLOSE' }
    return { deviceType: 'GARAGE', command: 'STATUS' }
  }

  // ─── Doorbell ───────────────────────────────────────────
  if (/\bdoorbell|who.?s at the door\b/.test(t)) {
    return { deviceType: 'DOORBELL', command: 'SHOW_FEED' }
  }

  // ─── Plugs ──────────────────────────────────────────────
  if (/\b(plug|outlet|socket)\b/.test(t)) {
    const room = extractRoom(t)
    const deviceName = extractDeviceName(t, ['tv plug', 'heater plug', 'lamp plug'])
    if (/\bturn on|switch on\b/.test(t)) return { deviceType: 'PLUG', deviceName, room, command: 'ON' }
    if (/\bturn off|switch off\b/.test(t)) return { deviceType: 'PLUG', deviceName, room, command: 'OFF' }
    return { deviceType: 'PLUG', deviceName, room, command: 'STATUS' }
  }

  // ─── Fridge ─────────────────────────────────────────────
  if (/\bfridge|refrigerator\b/.test(t)) {
    return { deviceType: 'FRIDGE', command: 'STATUS' }
  }

  // ─── Phone (companion device) ───────────────────────────
  if (/\b(phone|device|kid|child)\b/.test(t)) {
    if (/\block\b/.test(t) && !/\bunlock\b/.test(t)) return { deviceType: 'PHONE', command: 'LOCK_DEVICE' }
    if (/\bunlock\b/.test(t)) return { deviceType: 'PHONE', command: 'UNLOCK_DEVICE' }
    if (/\bring\b/.test(t)) return { deviceType: 'PHONE', command: 'RING_DEVICE' }
    if (/\blocate|where\b/.test(t)) return { deviceType: 'PHONE', command: 'REQUEST_LOCATION' }
    return { deviceType: 'PHONE', command: 'STATUS' }
  }

  return null
}

/**
 * Extract room name from transcript.
 */
function extractRoom(t: string): string | undefined {
  const rooms = [
    'living room', 'bedroom', 'master bedroom', 'kitchen', 'bathroom',
    'office', 'garage', 'backyard', 'front yard', 'basement', 'attic',
    'hallway', 'dining room', 'laundry room', 'entrance', 'patio',
  ]
  for (const room of rooms) {
    if (t.includes(room)) return room.charAt(0).toUpperCase() + room.slice(1)
  }
  return undefined
}

/**
 * Extract device name from transcript.
 */
function extractDeviceName(t: string, knownNames: string[]): string | undefined {
  for (const name of knownNames) {
    if (t.includes(name)) return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return undefined
}

/**
 * Build a spoken response for a smart device action.
 */
export function buildSmartDeviceResponse(
  action: SmartDeviceAction,
  result: { success: boolean; message?: string }
): string {
  const deviceLabel = action.deviceName || action.room || action.deviceType.toLowerCase()

  if (!result.success) {
    return `I couldn't ${action.command.toLowerCase()} the ${deviceLabel}. ${result.message || 'Please try again.'}`
  }

  switch (action.command) {
    case 'ON': return `Turned on the ${deviceLabel}.`
    case 'OFF': return `Turned off the ${deviceLabel}.`
    case 'LOCK': return `Locked the ${deviceLabel}.`
    case 'UNLOCK': return `Unlocked the ${deviceLabel}.`
    case 'PLAY': return `Playing music on the ${deviceLabel}.`
    case 'PAUSE': return `Paused the ${deviceLabel}.`
    case 'STOP': return `Stopped the ${deviceLabel}.`
    case 'SET_TEMPERATURE':
      return `Set the ${deviceLabel} to ${action.params?.temp} degrees.`
    case 'SET_BRIGHTNESS':
      return `Set the ${deviceLabel} brightness to ${action.params?.brightness} percent.`
    case 'SET_VOLUME':
      return `Set the ${deviceLabel} volume to ${action.params?.volume} percent.`
    case 'OPEN': return `Opened the ${deviceLabel}.`
    case 'CLOSE': return `Closed the ${deviceLabel}.`
    case 'START': return `Started the ${deviceLabel}.`
    case 'STATUS': return result.message || `The ${deviceLabel} is ${result.success ? 'active' : 'inactive'}.`
    default: return `Done. ${result.message || ''}`
  }
}

/**
 * Execute a smart device action by calling the appropriate API.
 */
export async function executeSmartDeviceAction(
  action: SmartDeviceAction,
  deviceId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/device/${deviceId}/smart-control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    })
    const data = await res.json()
    return { success: res.ok, message: data.message }
  } catch (e: any) {
    return { success: false, message: e.message }
  }
}
