// ═══════════════════════════════════════════════════════════════
// Device Service — uses REAL native APIs
// ═══════════════════════════════════════════════════════════════

import * as Device from 'expo-device'
import * as Battery from 'expo-battery'
import * as Location from 'expo-location'
import * as Network from 'expo-network'

export type DeviceInfo = {
  name: string
  type: 'PHONE' | 'TABLET' | 'DESKTOP'
  os: string
  osVersion: string
  brand: string
  model: string
}

export type BatteryInfo = {
  level: number  // 0-100
  charging: boolean
}

export type LocationInfo = {
  latitude: number
  longitude: number
  accuracy: number
  speed: number | null
  heading: number | null
  timestamp: number
}

export type NetworkInfo = {
  online: boolean
  type: string  // wifi, cellular, unknown
}

/**
 * Get REAL device info using expo-device.
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const type: DeviceInfo['type'] =
    Device.deviceType === Device.DeviceType.PHONE ? 'PHONE'
    : Device.deviceType === Device.DeviceType.TABLET ? 'TABLET'
    : 'DESKTOP'

  return {
    name: Device.deviceName || `${Device.manufacturer || 'Unknown'} ${Device.modelName || 'Device'}`,
    type,
    os: Device.osName || 'Unknown',
    osVersion: Device.osVersion || 'Unknown',
    brand: Device.brand || 'Unknown',
    model: Device.modelName || 'Unknown',
  }
}

/**
 * Get REAL battery level and charging status using expo-battery.
 */
export async function getBatteryInfo(): Promise<BatteryInfo> {
  try {
    const level = await Battery.getBatteryLevelAsync()  // 0.0 to 1.0
    const state = await Battery.getBatteryStateAsync()
    return {
      level: Math.round(level * 100),
      charging: state === Battery.BatteryState.CHARGING,
    }
  } catch {
    return { level: -1, charging: false }
  }
}

/**
 * Get REAL current location using expo-location.
 * Requires permission.
 */
export async function getCurrentLocation(): Promise<LocationInfo | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync()
    if (!perm.granted) return null

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy || 0,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      timestamp: loc.timestamp,
    }
  } catch {
    return null
  }
}

/**
 * Start background location tracking.
 * Reports location to backend on significant movement.
 */
export async function startLocationTracking(
  deviceId: string,
  onLocation: (loc: LocationInfo) => void
): Promise<() => void> {
  const perm = await Location.requestBackgroundPermissionsAsync()
  if (!perm.granted) {
    // Fall back to foreground tracking
    return startForegroundLocationTracking(deviceId, onLocation)
  }

  const subscription = await Location.startLocationUpdatesAsync('aria-location-task', {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000,  // 60 seconds
    distanceInterval: 50,  // 50 meters
    deferredUpdatesInterval: 60000,
  })

  // For foreground, also watch position
  return startForegroundLocationTracking(deviceId, onLocation)
}

async function startForegroundLocationTracking(
  deviceId: string,
  onLocation: (loc: LocationInfo) => void
): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 60000,
      distanceInterval: 50,
    },
    (loc) => {
      const info: LocationInfo = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || 0,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        timestamp: loc.timestamp,
      }
      onLocation(info)
    }
  )
  return () => sub.remove()
}

/**
 * Get REAL network status using expo-network.
 */
export async function getNetworkInfo(): Promise<NetworkInfo> {
  try {
    const state = await Network.getNetworkStateAsync()
    return {
      online: state.isConnected && state.isInternetReachable !== false,
      type: state.type === Network.NetworkStateType.WIFI ? 'wifi'
        : state.type === Network.NetworkStateType.CELLULAR ? 'cellular'
        : 'unknown',
    }
  } catch {
    return { online: false, type: 'unknown' }
  }
}
