// ═══════════════════════════════════════════════════════════════
// Geofence Service — alerts when device enters/leaves defined areas
// ═══════════════════════════════════════════════════════════════

import * as Location from 'expo-location'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type Geofence = {
  id: string
  name: string          // "Home", "School", etc.
  latitude: number
  longitude: number
  radius: number        // meters
  notifyOnEnter: boolean
  notifyOnExit: boolean
}

export type GeofenceEvent = {
  geofenceId: string
  geofenceName: string
  eventType: 'enter' | 'exit'
  latitude: number
  longitude: number
  timestamp: string
}

const GEOFENCE_STORAGE_KEY = 'aria_geofences'
const LAST_LOCATION_KEY = 'aria_last_geofence_location'

/**
 * Add a geofence.
 */
export async function addGeofence(geofence: Geofence): Promise<void> {
  const geofences = await getGeofences()
  geofences.push(geofence)
  await saveGeofences(geofences)
}

/**
 * Remove a geofence by ID.
 */
export async function removeGeofence(id: string): Promise<void> {
  const geofences = await getGeofences()
  const filtered = geofences.filter((g) => g.id !== id)
  await saveGeofences(filtered)
}

/**
 * Get all saved geofences.
 */
export async function getGeofences(): Promise<Geofence[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem(GEOFENCE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

async function saveGeofences(geofences: Geofence[]): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    await AsyncStorage.setItem(GEOFENCE_STORAGE_KEY, JSON.stringify(geofences))
  } catch {}
}

/**
 * Start monitoring geofences.
 * Call this on app launch and on each location update.
 */
export async function checkGeofences(
  latitude: number,
  longitude: number
): Promise<GeofenceEvent[]> {
  const geofences = await getGeofences()
  const events: GeofenceEvent[] = []

  // Get last known location state
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
  let lastState: Record<string, 'inside' | 'outside'> = {}
  try {
    const stored = await AsyncStorage.getItem(LAST_LOCATION_KEY)
    if (stored) lastState = JSON.parse(stored)
  } catch {}

  for (const fence of geofences) {
    const distance = haversineDistance(
      latitude, longitude,
      fence.latitude, fence.longitude
    )
    const isInside = distance <= fence.radius
    const wasInside = lastState[fence.id] === 'inside'

    if (isInside && !wasInside && fence.notifyOnEnter) {
      // Entered geofence
      events.push({
        geofenceId: fence.id,
        geofenceName: fence.name,
        eventType: 'enter',
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      })
    } else if (!isInside && wasInside && fence.notifyOnExit) {
      // Exited geofence
      events.push({
        geofenceId: fence.id,
        geofenceName: fence.name,
        eventType: 'exit',
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      })
    }

    lastState[fence.id] = isInside ? 'inside' : 'outside'
  }

  // Save updated state
  await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(lastState))

  // Report events to backend
  if (events.length > 0) {
    const deviceId = await getStoredDeviceId()
    if (deviceId) {
      for (const event of events) {
        await reportData(deviceId, 'GEOFENCE_EVENT', event)
      }
    }
  }

  return events
}

/**
 * Calculate distance between two coordinates (Haversine formula).
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000  // Earth radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Create a preset geofence (Home, School, etc.)
 */
export function createPresetGeofence(
  name: string,
  latitude: number,
  longitude: number,
  radius: number = 100
): Geofence {
  return {
    id: `${name.toLowerCase()}-${Date.now()}`,
    name,
    latitude,
    longitude,
    radius,
    notifyOnEnter: true,
    notifyOnExit: true,
  }
}
