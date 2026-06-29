// ═══════════════════════════════════════════════════════════════
// App Usage Service — tracks REAL app usage on the device
// ═══════════════════════════════════════════════════════════════
//
// Android: Uses UsageStatsManager (requires PACKAGE_USAGE_STATS permission)
// iOS: Uses DeviceActivity framework (requires FamilyControls capability)
//
// On Expo Go, these native modules aren't available — you need to
// build a standalone app with EAS Build. See README.md.
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules } from 'react-native'

export type AppUsageStat = {
  packageName: string
  appName: string
  totalTimeInForeground: number  // milliseconds
  lastTimeUsed: number  // timestamp
  icon?: string  // base64
}

export type InstalledApp = {
  packageName: string
  appName: string
  versionName: string
  versionCode: number
  icon?: string  // base64 PNG
  systemApp: boolean
  installTime: number
}

export type AppUsageSummary = {
  apps: AppUsageStat[]
  totalTimeMs: number
  totalApps: number
  mostUsedApp: AppUsageStat | null
}

/**
 * Check if usage stats permission is granted (Android).
 * On iOS, this checks FamilyControls authorization.
 */
export async function hasUsageStatsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const { UsageStatsManager } = NativeModules
      if (!UsageStatsManager) return false
      return await UsageStatsManager.hasPermission()
    } catch {
      return false
    }
  } else if (Platform.OS === 'ios') {
    try {
      const { FamilyControls } = NativeModules
      if (!FamilyControls) return false
      return await FamilyControls.isAuthorized()
    } catch {
      return false
    }
  }
  return false
}

/**
 * Request usage stats permission.
 * Android: Opens Settings → Apps → Special access → Usage access
 * iOS: Shows FamilyControls authorization prompt
 */
export async function requestUsageStatsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const { UsageStatsManager } = NativeModules
      if (!UsageStatsManager) return false
      return await UsageStatsManager.requestPermission()
    } catch {
      return false
    }
  } else if (Platform.OS === 'ios') {
    try {
      const { FamilyControls } = NativeModules
      if (!FamilyControls) return false
      return await FamilyControls.requestAuthorization()
    } catch {
      return false
    }
  }
  return false
}

/**
 * Get REAL app usage stats for today.
 * Returns array of apps with their foreground time.
 */
export async function getTodayAppUsage(): Promise<AppUsageSummary> {
  if (!(await hasUsageStatsPermission())) {
    return { apps: [], totalTimeMs: 0, totalApps: 0, mostUsedApp: null }
  }

  if (Platform.OS === 'android') {
    try {
      const { UsageStatsManager } = NativeModules
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const stats = await UsageStatsManager.queryUsageStats(
        startOfDay.getTime(),
        Date.now()
      )
      return aggregateStats(stats)
    } catch (e) {
      console.error('Failed to get Android usage stats:', e)
      return { apps: [], totalTimeMs: 0, totalApps: 0, mostUsedApp: null }
    }
  } else if (Platform.OS === 'ios') {
    try {
      const { FamilyControls } = NativeModules
      const activities = await FamilyControls.getDeviceActivitySummaries()
      return aggregateStats(activities)
    } catch (e) {
      console.error('Failed to get iOS activity:', e)
      return { apps: [], totalTimeMs: 0, totalApps: 0, mostUsedApp: null }
    }
  }

  return { apps: [], totalTimeMs: 0, totalApps: 0, mostUsedApp: null }
}

/**
 * Get REAL app usage stats for a date range.
 */
export async function getAppUsage(startDate: Date, endDate: Date): Promise<AppUsageSummary> {
  if (!(await hasUsageStatsPermission())) {
    return { apps: [], totalTimeMs: 0, totalApps: 0, mostUsedApp: null }
  }

  if (Platform.OS === 'android') {
    try {
      const { UsageStatsManager } = NativeModules
      const stats = await UsageStatsManager.queryUsageStats(
        startDate.getTime(),
        endDate.getTime()
      )
      return aggregateStats(stats)
    } catch {
      return { apps: [], totalTimeMs: 0, totalApps: 0, mostUsedApp: null }
    }
  }

  return { apps: [], totalTimeMs: 0, totalApps: 0, mostUsedApp: null }
}

/**
 * Get list of all installed apps (Android only).
 * iOS doesn't allow listing installed apps.
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  if (Platform.OS !== 'android') return []

  try {
    const { InstalledApps } = NativeModules
    if (!InstalledApps) return []
    return await InstalledApps.getAll()
  } catch (e) {
    console.error('Failed to get installed apps:', e)
    return []
  }
}

/**
 * Block an app — prevents it from being opened.
 * Android: Uses DevicePolicyManager (requires Device Admin)
 * iOS: Uses ManagedSettingsStore (requires FamilyControls)
 */
export async function blockApp(packageName: string): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const { DevicePolicy } = NativeModules
      if (!DevicePolicy) return false
      return await DevicePolicy.blockPackage(packageName)
    } catch {
      return false
    }
  } else if (Platform.OS === 'ios') {
    try {
      const { FamilyControls } = NativeModules
      if (!FamilyControls) return false
      return await FamilyControls.blockApplication(packageName)
    } catch {
      return false
    }
  }
  return false
}

/**
 * Unblock an app.
 */
export async function unblockApp(packageName: string): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const { DevicePolicy } = NativeModules
      if (!DevicePolicy) return false
      return await DevicePolicy.unblockPackage(packageName)
    } catch {
      return false
    }
  } else if (Platform.OS === 'ios') {
    try {
      const { FamilyControls } = NativeModules
      if (!FamilyControls) return false
      return await FamilyControls.unblockApplication(packageName)
    } catch {
      return false
    }
  }
  return false
}

/**
 * Lock the entire device (kid mode).
 * Android: Uses DevicePolicyManager.lockNow()
 * iOS: Uses ManagedSettingsStore to block all apps
 */
export async function lockDevice(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const { DevicePolicy } = NativeModules
      if (!DevicePolicy) return false
      return await DevicePolicy.lockNow()
    } catch {
      return false
    }
  } else if (Platform.OS === 'ios') {
    try {
      const { FamilyControls } = NativeModules
      if (!FamilyControls) return false
      return await FamilyControls.enableShield()
    } catch {
      return false
    }
  }
  return false
}

/**
 * Unlock the device.
 */
export async function unlockDevice(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      const { FamilyControls } = NativeModules
      if (!FamilyControls) return false
      return await FamilyControls.disableShield()
    } catch {
      return false
    }
  }
  // Android: device unlocks when parent sends unlock command
  return false
}

// ─── Helper ──────────────────────────────────────────────

function aggregateStats(stats: any[]): AppUsageSummary {
  if (!stats || stats.length === 0) {
    return { apps: [], totalTimeMs: 0, totalApps: 0, mostUsedApp: null }
  }

  // Group by package name and sum the time
  const byPackage = new Map<string, AppUsageStat>()
  for (const stat of stats) {
    const existing = byPackage.get(stat.packageName)
    if (existing) {
      existing.totalTimeInForeground += stat.totalTimeInForeground || 0
      existing.lastTimeUsed = Math.max(existing.lastTimeUsed, stat.lastTimeUsed || 0)
    } else {
      byPackage.set(stat.packageName, {
        packageName: stat.packageName,
        appName: stat.appName || stat.packageName,
        totalTimeInForeground: stat.totalTimeInForeground || 0,
        lastTimeUsed: stat.lastTimeUsed || 0,
      })
    }
  }

  const apps = Array.from(byPackage.values())
    .filter((a) => a.totalTimeInForeground > 60000)  // Only apps used >1 min
    .sort((a, b) => b.totalTimeInForeground - a.totalTimeInForeground)

  const totalTimeMs = apps.reduce((sum, a) => sum + a.totalTimeInForeground, 0)
  const mostUsedApp = apps[0] || null

  return {
    apps,
    totalTimeMs,
    totalApps: apps.length,
    mostUsedApp,
  }
}
