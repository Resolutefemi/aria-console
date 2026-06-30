// ═══════════════════════════════════════════════════════════════
// App Install Monitor — alert parent when new apps are installed
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules, DeviceEventEmitter } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'
import { getInstalledApps, type InstalledApp } from './app-usage'

const LAST_APPS_KEY = 'aria_last_installed_apps'

export type AppInstallEvent = {
  type: 'INSTALLED' | 'UNINSTALLED'
  packageName: string
  appName: string
  timestamp: string
}

/**
 * Start monitoring for app installs/uninstalls (Android only).
 * iOS doesn't allow detecting app installs.
 */
export async function startAppInstallMonitor(): Promise<() => void> {
  if (Platform.OS !== 'android') return () => {}

  // Save current app list as baseline
  const currentApps = await getInstalledApps()
  await saveAppList(currentApps)

  // Listen for install/uninstall events (Android broadcast)
  try {
    const { AppInstallReceiver } = NativeModules
    if (AppInstallReceiver) {
      const subscription = DeviceEventEmitter.addListener('AppInstallEvent', (event) => {
        handleAppEvent(event)
      })
      AppInstallReceiver.start()

      return () => {
        subscription.remove()
        AppInstallReceiver.stop()
      }
    }
  } catch (e) {
    console.error('Failed to start app install monitor:', e)
  }

  // Fallback: poll for changes every 5 minutes
  const interval = setInterval(async () => {
    await checkForChanges()
  }, 5 * 60 * 1000)

  return () => clearInterval(interval)
}

/**
 * Handle an app install/uninstall event.
 */
async function handleAppEvent(event: { action: string; packageName: string }): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return

  const isInstall = event.action === 'INSTALL'

  await reportData(deviceId, 'APP_INSTALL', {
    type: isInstall ? 'INSTALLED' : 'UNINSTALLED',
    packageName: event.packageName,
    appName: event.packageName.split('.').pop() || event.packageName,
    timestamp: new Date().toISOString(),
  } as AppInstallEvent)
}

/**
 * Check for app list changes by comparing with last saved list.
 */
async function checkForChanges(): Promise<void> {
  const currentApps = await getInstalledApps()
  const lastApps = await loadAppList()

  const currentPackages = new Set(currentApps.map((a) => a.packageName))
  const lastPackages = new Set(lastApps.map((a) => a.packageName))

  // Find newly installed apps
  for (const app of currentApps) {
    if (!lastPackages.has(app.packageName)) {
      const deviceId = await getStoredDeviceId()
      if (deviceId) {
        await reportData(deviceId, 'APP_INSTALL', {
          type: 'INSTALLED',
          packageName: app.packageName,
          appName: app.appName,
          timestamp: new Date().toISOString(),
        } as AppInstallEvent)
      }
    }
  }

  // Find uninstalled apps
  for (const app of lastApps) {
    if (!currentPackages.has(app.packageName)) {
      const deviceId = await getStoredDeviceId()
      if (deviceId) {
        await reportData(deviceId, 'APP_INSTALL', {
          type: 'UNINSTALLED',
          packageName: app.packageName,
          appName: app.appName,
          timestamp: new Date().toISOString(),
        } as AppInstallEvent)
      }
    }
  }

  // Save updated list
  await saveAppList(currentApps)
}

/**
 * Save the current app list to storage.
 */
async function saveAppList(apps: InstalledApp[]): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const simplified = apps.map((a) => ({
      packageName: a.packageName,
      appName: a.appName,
    }))
    await AsyncStorage.setItem(LAST_APPS_KEY, JSON.stringify(simplified))
  } catch {}
}

/**
 * Load the last saved app list.
 */
async function loadAppList(): Promise<{ packageName: string; appName: string }[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem(LAST_APPS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}
