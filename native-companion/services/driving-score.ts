// ═══════════════════════════════════════════════════════════════
// Driving Score — acceleration, braking, cornering analysis
// ═══════════════════════════════════════════════════════════════
// Uses accelerometer + GPS to analyze driving behavior.
// Calculates a driving score (0-100) based on:
// - Hard acceleration events
// - Hard braking events
// - Sharp cornering
// - Speeding
// - Phone usage while driving
// ═══════════════════════════════════════════════════════════════

import { Accelerometer } from 'expo-sensors'
import * as Location from 'expo-location'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type DrivingScore = {
  date: string
  totalScore: number  // 0-100
  accelerationScore: number
  brakingScore: number
  corneringScore: number
  speedingScore: number
  phoneUsageScore: number
  events: DrivingEvent[]
  distanceKm: number
  durationMin: number
}

export type DrivingEvent = {
  type: 'HARD_ACCELERATION' | 'HARD_BRAKING' | 'SHARP_TURN_LEFT' | 'SHARP_TURN_RIGHT' | 'SPEEDING' | 'PHONE_PICKUP'
  timestamp: string
  latitude: number
  longitude: number
  speedKmh: number
  severity: 'low' | 'medium' | 'high'
}

const HARD_ACCEL_THRESHOLD = 0.4  // G-force
const HARD_BRAKE_THRESHOLD = -0.4
const SHARP_TURN_THRESHOLD = 0.5
const SPEEDING_THRESHOLD_KMH = 100

let isMonitoring = false
let accelSubscription: any = null
let locationSubscription: any = null
let todayEvents: DrivingEvent[] = []
let lastSpeed = 0
let lastLocation: Location.LocationObject | null = null
let isPhonePickedUp = false

/**
 * Start monitoring driving behavior.
 */
export async function startDrivingScoreMonitor(): Promise<() => void> {
  if (isMonitoring) return () => {}
  isMonitoring = true

  const cleanups: (() => void)[] = []

  // Accelerometer for accel/braking/cornering
  Accelerometer.setUpdateInterval(100)
  const accelSub = Accelerometer.addListener((data) => {
    analyzeAccel(data)
  })
  cleanups.push(() => accelSub.remove())

  // GPS for speed + distance
  const locPerm = await Location.requestForegroundPermissionsAsync()
  if (locPerm.granted) {
    const locSub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
      (loc) => {
        analyzeLocation(loc)
      }
    )
    cleanups.push(() => locSub.remove())
  }

  // Check for phone pickup (screen unlock while driving)
  const screenCheck = setInterval(() => {
    if (lastSpeed > 20 && isPhonePickedUp) {
      addEvent({
        type: 'PHONE_PICKUP',
        timestamp: new Date().toISOString(),
        latitude: lastLocation?.coords.latitude ?? 0,
        longitude: lastLocation?.coords.longitude ?? 0,
        speedKmh: lastSpeed,
        severity: 'high',
      })
    }
  }, 10000)
  cleanups.push(() => clearInterval(screenCheck))

  return () => {
    isMonitoring = false
    cleanups.forEach((fn) => fn())
  }
}

/**
 * Analyze accelerometer data for driving events.
 */
function analyzeAccel(data: { x: number; y: number; z: number }): void {
  // Remove gravity (z ≈ 1 when phone is flat)
  const x = data.x
  const y = data.y
  const z = data.z - 1  // subtract gravity

  // Forward acceleration (y axis when phone is upright in mount)
  const forwardAccel = y

  // Lateral acceleration (x axis)
  const lateralAccel = x

  // Only count events when driving
  if (lastSpeed < 10) return

  // Hard acceleration
  if (forwardAccel > HARD_ACCEL_THRESHOLD) {
    addEvent({
      type: 'HARD_ACCELERATION',
      timestamp: new Date().toISOString(),
      latitude: lastLocation?.coords.latitude ?? 0,
      longitude: lastLocation?.coords.longitude ?? 0,
      speedKmh: lastSpeed,
      severity: forwardAccel > 0.6 ? 'high' : 'medium',
    })
  }

  // Hard braking
  if (forwardAccel < HARD_BRAKE_THRESHOLD) {
    addEvent({
      type: 'HARD_BRAKING',
      timestamp: new Date().toISOString(),
      latitude: lastLocation?.coords.latitude ?? 0,
      longitude: lastLocation?.coords.longitude ?? 0,
      speedKmh: lastSpeed,
      severity: forwardAccel < -0.6 ? 'high' : 'medium',
    })
  }

  // Sharp turns
  if (lateralAccel > SHARP_TURN_THRESHOLD) {
    addEvent({
      type: 'SHARP_TURN_RIGHT',
      timestamp: new Date().toISOString(),
      latitude: lastLocation?.coords.latitude ?? 0,
      longitude: lastLocation?.coords.longitude ?? 0,
      speedKmh: lastSpeed,
      severity: lateralAccel > 0.7 ? 'high' : 'medium',
    })
  } else if (lateralAccel < -SHARP_TURN_THRESHOLD) {
    addEvent({
      type: 'SHARP_TURN_LEFT',
      timestamp: new Date().toISOString(),
      latitude: lastLocation?.coords.latitude ?? 0,
      longitude: lastLocation?.coords.longitude ?? 0,
      speedKmh: lastSpeed,
      severity: lateralAccel < -0.7 ? 'high' : 'medium',
    })
  }
}

/**
 * Analyze GPS location for speed + distance.
 */
function analyzeLocation(loc: Location.LocationObject): void {
  const speedMs = loc.coords.speed || 0
  const speedKmh = speedMs > 0 ? speedMs * 3.6 : 0
  lastSpeed = speedKmh
  lastLocation = loc

  // Speeding
  if (speedKmh > SPEEDING_THRESHOLD_KMH) {
    addEvent({
      type: 'SPEEDING',
      timestamp: new Date().toISOString(),
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speedKmh,
      severity: speedKmh > 120 ? 'high' : 'medium',
    })
  }
}

/**
 * Add a driving event (with deduplication).
 */
let lastEventTime: Record<string, number> = {}

function addEvent(event: DrivingEvent): void {
  // Dedupe: don't add same type within 5 seconds
  const lastTime = lastEventTime[event.type] || 0
  if (Date.now() - lastTime < 5000) return
  lastEventTime[event.type] = Date.now()

  todayEvents.push(event)
}

/**
 * Calculate today's driving score.
 */
export async function calculateDrivingScore(): Promise<DrivingScore> {
  const today = new Date().toISOString().slice(0, 10)
  const todayEventList = todayEvents.filter((e) => e.timestamp.startsWith(today))

  // Count events by type
  const hardAccels = todayEventList.filter((e) => e.type === 'HARD_ACCELERATION').length
  const hardBrakes = todayEventList.filter((e) => e.type === 'HARD_BRAKING').length
  const sharpTurns = todayEventList.filter((e) => e.type.startsWith('SHARP_TURN')).length
  const speeding = todayEventList.filter((e) => e.type === 'SPEEDING').length
  const phonePickups = todayEventList.filter((e) => e.type === 'PHONE_PICKUP').length

  // Calculate subscores (100 = perfect, lower = worse)
  const accelerationScore = Math.max(0, 100 - hardAccels * 10)
  const brakingScore = Math.max(0, 100 - hardBrakes * 15)
  const corneringScore = Math.max(0, 100 - sharpTurns * 8)
  const speedingScore = Math.max(0, 100 - speeding * 20)
  const phoneUsageScore = Math.max(0, 100 - phonePickups * 25)

  // Weighted average
  const totalScore = Math.round(
    accelerationScore * 0.2 +
    brakingScore * 0.25 +
    corneringScore * 0.15 +
    speedingScore * 0.25 +
    phoneUsageScore * 0.15
  )

  const score: DrivingScore = {
    date: today,
    totalScore,
    accelerationScore,
    brakingScore,
    corneringScore,
    speedingScore,
    phoneUsageScore,
    events: todayEventList,
    distanceKm: 0, // would track via GPS distance accumulation
    durationMin: 0, // would track via driving session duration
  }

  // Report to backend
  const deviceId = await getStoredDeviceId()
  if (deviceId) {
    await reportData(deviceId, 'DRIVING_SCORE', score)
  }

  return score
}

/**
 * Set phone picked up state (called when screen unlocks).
 */
export function setPhonePickedUp(pickedUp: boolean): void {
  isPhonePickedUp = pickedUp
}

/**
 * Get current driving score.
 */
export function getCurrentScore(): DrivingScore | null {
  if (todayEvents.length === 0) return null
  // Return a synchronous approximation
  return {
    date: new Date().toISOString().slice(0, 10),
    totalScore: Math.max(0, 100 - todayEvents.length * 5),
    accelerationScore: 100,
    brakingScore: 100,
    corneringScore: 100,
    speedingScore: 100,
    phoneUsageScore: 100,
    events: todayEvents,
    distanceKm: 0,
    durationMin: 0,
  }
}
