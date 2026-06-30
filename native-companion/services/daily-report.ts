// ═══════════════════════════════════════════════════════════════
// Daily Report — generate + send daily summary to parent
// ═══════════════════════════════════════════════════════════════

import { getTodayAppUsage } from './app-usage'
import { getCurrentLocation } from './device'
import { getBatteryInfo } from './device'
import { getCallLog, getSMSHistory } from './communications'
import { getGeofences, checkGeofences } from './geofence'
import { getViolationLog } from './screen-time'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type DailyReport = {
  date: string
  deviceId: string
  summary: {
    totalScreenTimeMin: number
    appsUsed: number
    mostUsedApp: string | null
    callsMade: number
    smsSent: number
    flaggedMessages: number
    violations: number
    locationChanges: number
    currentBattery: number
    lastLocation: { latitude: number; longitude: number; address: string | null } | null
  }
  topApps: { name: string; minutes: number }[]
  violations: any[]
  flaggedContent: any[]
}

/**
 * Generate a daily report for the parent.
 * Call this once per day (e.g., at 11 PM).
 */
export async function generateDailyReport(): Promise<DailyReport | null> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return null

  const usage = await getTodayAppUsage()
  const location = await getCurrentLocation()
  const battery = await getBatteryInfo()
  const calls = await getCallLog(1000)
  const sms = await getSMSHistory(1000)
  const violations = await getViolationLog()
  const geofences = await getGeofences()

  // Count calls and SMS for today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayMs = todayStart.getTime()

  const todayCalls = calls.filter((c) => c.timestamp * 1000 >= todayMs)
  const todaySMS = sms.filter((s) => s.timestamp * 1000 >= todayMs)
  const flaggedSMS = todaySMS.filter((s) => s.flagged)
  const todayViolations = violations.filter((v) => new Date(v.timestamp).getTime() >= todayMs)

  const report: DailyReport = {
    date: new Date().toISOString().slice(0, 10),
    deviceId,
    summary: {
      totalScreenTimeMin: Math.round(usage.totalTimeMs / 60000),
      appsUsed: usage.totalApps,
      mostUsedApp: usage.mostUsedApp?.appName ?? null,
      callsMade: todayCalls.filter((c) => c.callType === 'OUTGOING').length,
      smsSent: todaySMS.filter((s) => s.type === 'OUTGOING').length,
      flaggedMessages: flaggedSMS.length,
      violations: todayViolations.length,
      locationChanges: 0, // Would need to count geofence events
      currentBattery: battery.level >= 0 ? battery.level : -1,
      lastLocation: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        address: null,
      } : null,
    },
    topApps: usage.apps.slice(0, 10).map((a) => ({
      name: a.appName,
      minutes: Math.round(a.totalTimeInForeground / 60000),
    })),
    violations: todayViolations,
    flaggedContent: flaggedSMS,
  }

  // Send to backend
  await reportData(deviceId, 'DAILY_REPORT', report)

  return report
}

/**
 * Schedule daily report generation.
 * Runs at 11 PM every day.
 */
export function scheduleDailyReports(): () => void {
  const checkAndReport = async () => {
    const now = new Date()
    const hour = now.getHours()

    // Run at 11 PM (23:00)
    if (hour === 23) {
      const lastReportDate = await getLastReportDate()
      const today = now.toISOString().slice(0, 10)

      if (lastReportDate !== today) {
        await generateDailyReport()
        await setLastReportDate(today)
      }
    }
  }

  // Check every hour
  const interval = setInterval(checkAndReport, 60 * 60 * 1000)
  checkAndReport()

  return () => clearInterval(interval)
}

async function getLastReportDate(): Promise<string | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    return await AsyncStorage.getItem('aria_last_report_date')
  } catch {
    return null
  }
}

async function setLastReportDate(date: string): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    await AsyncStorage.setItem('aria_last_report_date', date)
  } catch {}
}
