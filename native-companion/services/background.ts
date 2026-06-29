// ═══════════════════════════════════════════════════════════════
// Background Service — continuous monitoring even when app is closed
// ═══════════════════════════════════════════════════════════════

import * as TaskManager from 'expo-task-manager'
import * as BackgroundFetch from 'expo-background-fetch'
import * as Location from 'expo-location'
import { POLLING } from '@/constants/config'
import { getCurrentLocation, getBatteryInfo, getNetworkInfo } from './device'
import { getTodayAppUsage } from './app-usage'
import { enforceLimits } from './screen-time'
import { checkGeofences } from './geofence'
import { reportData, fetchCommands, reportCommandResult, getStoredDeviceId } from './api'

const BACKGROUND_FETCH_TASK = 'aria-background-fetch'
const LOCATION_TASK = 'aria-location-task'

let isRunning = false

/**
 * Register all background tasks.
 * Call this on app launch.
 */
export async function registerBackgroundTasks(): Promise<void> {
  // Background fetch — runs every ~15 min when app is closed
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 15,  // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    })
  } catch (e) {
    console.log('Background fetch registration failed:', e)
  }

  // Background location — runs continuously
  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: POLLING.LOCATION,
      distanceInterval: 50,
      deferredUpdatesInterval: POLLING.LOCATION,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Aria Companion is monitoring',
        notificationBody: 'Location and app usage are being tracked',
        notificationColor: '#f0a04b',
      },
    })
  } catch (e) {
    console.log('Background location registration failed:', e)
  }
}

/**
 * Unregister all background tasks.
 */
export async function unregisterBackgroundTasks(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK)
    await Location.stopLocationUpdatesAsync(LOCATION_TASK)
  } catch {}
}

// Define the background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    await runBackgroundCycle()
    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch (e) {
    console.error('Background fetch failed:', e)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

// Define the location task
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Location task error:', error)
    return
  }
  if (data && data.locations && data.locations.length > 0) {
    const loc = data.locations[data.locations.length - 1]
    const deviceId = await getStoredDeviceId()
    if (deviceId) {
      await reportData(deviceId, 'LOCATION', {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
      })

      // Check geofences
      await checkGeofences(loc.coords.latitude, loc.coords.longitude)
    }
  }
})

/**
 * Run a full background monitoring cycle.
 * Called by the background fetch task and also usable in foreground.
 */
export async function runBackgroundCycle(): Promise<void> {
  if (isRunning) return
  isRunning = true

  try {
    const deviceId = await getStoredDeviceId()
    if (!deviceId) return

    // 1. Send heartbeat with battery + network status
    const battery = await getBatteryInfo()
    const network = await getNetworkInfo()
    await reportData(deviceId, 'HEARTBEAT', {
      battery: battery.level >= 0 ? battery.level : 100,
      charging: battery.charging,
      signal: -60,
      status: network.online ? 'ONLINE' : 'OFFLINE',
      networkType: network.type,
    })

    // 2. Report app usage stats
    const usage = await getTodayAppUsage()
    if (usage.apps.length > 0) {
      await reportData(deviceId, 'APP_USAGE', {
        totalTimeMs: usage.totalTimeMs,
        apps: usage.apps.map((a) => ({
          packageName: a.packageName,
          appName: a.appName,
          totalTimeInForeground: a.totalTimeInForeground,
          lastTimeUsed: a.lastTimeUsed,
        })),
      })
    }

    // 3. Enforce screen time limits
    await enforceLimits()

    // 4. Check for pending commands
    const commands = await fetchCommands(deviceId)
    for (const cmd of commands) {
      await handleBackgroundCommand(cmd)
    }
  } catch (e) {
    console.error('Background cycle error:', e)
  } finally {
    isRunning = false
  }
}

/**
 * Handle a command received in the background.
 */
async function handleBackgroundCommand(cmd: any): Promise<void> {
  const result: any = { executedAt: new Date().toISOString() }

  switch (cmd.type) {
    case 'LOCK_DEVICE':
      // Use native device lock
      const { lockDevice } = await import('./app-usage')
      await lockDevice()
      result.locked = true
      break

    case 'UNLOCK_DEVICE':
      const { unlockDevice } = await import('./app-usage')
      await unlockDevice()
      result.unlocked = true
      break

    case 'REQUEST_LOCATION':
      const loc = await getCurrentLocation()
      if (loc) {
        const deviceId = await getStoredDeviceId()
        if (deviceId) {
          await reportData(deviceId, 'LOCATION', {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
          })
        }
      }
      result.locationRequested = true
      break

    case 'BLOCK_APP':
      const { blockApp } = await import('./app-usage')
      if (cmd.payload?.packageName) {
        await blockApp(cmd.payload.packageName)
        result.appBlocked = cmd.payload.packageName
      }
      break

    case 'UNBLOCK_APP':
      const { unblockApp } = await import('./app-usage')
      if (cmd.payload?.packageName) {
        await unblockApp(cmd.payload.packageName)
        result.appUnblocked = cmd.payload.packageName
      }
      break

    case 'SEND_MESSAGE':
      result.messageShown = cmd.payload?.message ?? ''
      break

    case 'RING_DEVICE':
      const { Vibration } = await import('react-native')
      Vibration.vibrate([200, 100, 200, 100, 200])
      result.rang = true
      break
  }

  await reportCommandResult(cmd.id, 'EXECUTED', result)
}
