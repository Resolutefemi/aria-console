// ═══════════════════════════════════════════════════════════════
// Device Events — battery alerts, screen unlock, charging events
// ═══════════════════════════════════════════════════════════════

import * as Battery from 'expo-battery'
import { Platform, NativeModules, DeviceEventEmitter } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type DeviceEvent = {
  type: 'BATTERY_LOW' | 'BATTERY_CRITICAL' | 'CHARGING_STARTED' | 'CHARGING_STOPPED' | 'SCREEN_UNLOCK' | 'SCREEN_LOCK' | 'BOOT_COMPLETED' | 'AIRPLANE_MODE_ON' | 'AIRPLANE_MODE_OFF'
  timestamp: string
  metadata?: any
}

const BATTERY_LOW_THRESHOLD = 20
const BATTERY_CRITICAL_THRESHOLD = 10

let batterySubscription: any = null
let lastBatteryLevel: number | null = null
let lastChargingState: boolean | null = null

/**
 * Start monitoring device events.
 */
export async function startDeviceEventMonitor(): Promise<() => void> {
  const cleanups: (() => void)[] = []

  // Battery monitoring
  const batteryLevel = await Battery.getBatteryLevelAsync()
  const batteryState = await Battery.getBatteryStateAsync()
  lastBatteryLevel = Math.round(batteryLevel * 100)
  lastChargingState = batteryState === Battery.BatteryState.CHARGING

  batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
    const level = Math.round(batteryLevel * 100)
    handleBatteryChange(level)
  })

  const chargingSub = Battery.addBatteryStateListener(({ batteryState }) => {
    const isCharging = batteryState === Battery.BatteryState.CHARGING
    handleChargingChange(isCharging)
  })

  cleanups.push(() => {
    batterySubscription?.remove()
    chargingSub?.remove()
  })

  // Screen on/off (Android only)
  if (Platform.OS === 'android') {
    try {
      const { ScreenReceiver } = NativeModules
      if (ScreenReceiver) {
        const screenSub = DeviceEventEmitter.addListener('ScreenEvent', (event) => {
          reportDeviceEvent({
            type: event.screenOn ? 'SCREEN_UNLOCK' : 'SCREEN_LOCK',
            timestamp: new Date().toISOString(),
          })
        })
        ScreenReceiver.start()
        cleanups.push(() => {
          screenSub.remove()
          ScreenReceiver.stop()
        })
      }
    } catch {}

    // Boot completed
    try {
      const { BootReceiver } = NativeModules
      if (BootReceiver) {
        const bootSub = DeviceEventEmitter.addListener('BootCompleted', () => {
          reportDeviceEvent({
            type: 'BOOT_COMPLETED',
            timestamp: new Date().toISOString(),
          })
        })
        cleanups.push(() => bootSub.remove())
      }
    } catch {}

    // Airplane mode
    try {
      const { AirplaneModeReceiver } = NativeModules
      if (AirplaneModeReceiver) {
        const airplaneSub = DeviceEventEmitter.addListener('AirplaneMode', (event) => {
          reportDeviceEvent({
            type: event.enabled ? 'AIRPLANE_MODE_ON' : 'AIRPLANE_MODE_OFF',
            timestamp: new Date().toISOString(),
          })
        })
        AirplaneModeReceiver.start()
        cleanups.push(() => {
          airplaneSub.remove()
          AirplaneModeReceiver.stop()
        })
      }
    } catch {}
  }

  return () => cleanups.forEach((fn) => fn())
}

/**
 * Handle battery level change.
 */
async function handleBatteryChange(level: number): Promise<void> {
  if (lastBatteryLevel === null) {
    lastBatteryLevel = level
    return
  }

  // Battery low alert
  if (level <= BATTERY_LOW_THRESHOLD && lastBatteryLevel > BATTERY_LOW_THRESHOLD) {
    await reportDeviceEvent({
      type: 'BATTERY_LOW',
      timestamp: new Date().toISOString(),
      metadata: { level },
    })
  }

  // Battery critical alert
  if (level <= BATTERY_CRITICAL_THRESHOLD && lastBatteryLevel > BATTERY_CRITICAL_THRESHOLD) {
    await reportDeviceEvent({
      type: 'BATTERY_CRITICAL',
      timestamp: new Date().toISOString(),
      metadata: { level },
    })
  }

  lastBatteryLevel = level
}

/**
 * Handle charging state change.
 */
async function handleChargingChange(isCharging: boolean): Promise<void> {
  if (lastChargingState === null) {
    lastChargingState = isCharging
    return
  }

  if (isCharging !== lastChargingState) {
    await reportDeviceEvent({
      type: isCharging ? 'CHARGING_STARTED' : 'CHARGING_STOPPED',
      timestamp: new Date().toISOString(),
      metadata: { level: lastBatteryLevel },
    })
    lastChargingState = isCharging
  }
}

/**
 * Report a device event to the parent dashboard.
 */
async function reportDeviceEvent(event: DeviceEvent): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return
  await reportData(deviceId, 'DEVICE_EVENT', event)
}
