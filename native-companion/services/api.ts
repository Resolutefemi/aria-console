// ═══════════════════════════════════════════════════════════════
// API Service — talks to the Aria Console backend
// ═══════════════════════════════════════════════════════════════

import { API } from '@/constants/config'
import * as SecureStore from 'expo-secure-store'

const DEVICE_ID_KEY = 'aria_device_id'
const PARENT_NAME_KEY = 'aria_parent_name'

export async function getStoredDeviceId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(DEVICE_ID_KEY)
  } catch {
    return null
  }
}

export async function getStoredParentName(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PARENT_NAME_KEY)
  } catch {
    return null
  }
}

export async function clearStoredData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY)
    await SecureStore.deleteItemAsync(PARENT_NAME_KEY)
  } catch {}
}

/**
 * Verify a 6-digit pairing code.
 * Called by the companion app after the parent generates a code.
 */
export async function verifyPairing(
  shortCode: string,
  deviceInfo: {
    name: string
    type: string
    room: string
    os: string
    battery: number
  }
): Promise<{ deviceId: string; parentName: string } | { error: string }> {
  try {
    const res = await fetch(API.pairingVerify, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortCode, deviceInfo }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Pairing failed' }

    await SecureStore.setItemAsync(DEVICE_ID_KEY, data.deviceId)
    await SecureStore.setItemAsync(PARENT_NAME_KEY, data.parentName)
    return { deviceId: data.deviceId, parentName: data.parentName }
  } catch (e: any) {
    return { error: e.message || 'Network error' }
  }
}

/**
 * Report data to the backend.
 * Types: HEARTBEAT, LOCATION, SCREEN_TIME, APP_LIST, WEB_HISTORY
 */
export async function reportData(
  deviceId: string,
  type: string,
  data: any
): Promise<boolean> {
  try {
    const res = await fetch(API.deviceReport, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, type, data }),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Fetch pending commands from the parent.
 */
export async function fetchCommands(deviceId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API.deviceCommands}?deviceId=${deviceId}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.commands || []
  } catch {
    return []
  }
}

/**
 * Report command execution result.
 */
export async function reportCommandResult(
  commandId: string,
  status: string,
  result: any
): Promise<void> {
  try {
    await fetch(API.deviceCommands, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId, status, result }),
    })
  } catch {}
}
