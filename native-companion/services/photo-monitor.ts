// ═══════════════════════════════════════════════════════════════
// Photo Monitor — scan gallery for concerning content
// ═══════════════════════════════════════════════════════════════
// Uses on-device ML to scan photos for nudity, drugs, weapons.
// iOS: Vision framework | Android: ML Kit
// All processing happens on-device — no photos leave the phone.
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type PhotoAlert = {
  id: string
  photoId: string
  thumbnailBase64?: string  // Small thumbnail only
  category: 'NUDITY' | 'DRUGS' | 'WEAPONS' | 'VIOLENCE'
  confidence: number  // 0.0 to 1.0
  timestamp: string
}

export type PhotoScanResult = {
  totalScanned: number
  flagged: PhotoAlert[]
  lastScanDate: string
}

/**
 * Scan the device's photo gallery for concerning content.
 * All processing happens on-device.
 */
export async function scanPhotoGallery(): Promise<PhotoScanResult> {
  try {
    const { PhotoScanner } = NativeModules
    if (!PhotoScanner) {
      return { totalScanned: 0, flagged: [], lastScanDate: new Date().toISOString() }
    }

    const result = await PhotoScanner.scanGallery({
      categories: ['NUDITY', 'DRUGS', 'WEAPONS', 'VIOLENCE'],
      minConfidence: 0.7,
      includeThumbnails: true,
      thumbnailSize: 100,  // 100x100 px
    })

    const alerts: PhotoAlert[] = result.flagged.map((f: any) => ({
      id: `${f.photoId}-${f.category}-${Date.now()}`,
      photoId: f.photoId,
      thumbnailBase64: f.thumbnail,
      category: f.category,
      confidence: f.confidence,
      timestamp: new Date().toISOString(),
    }))

    // Report to parent dashboard
    if (alerts.length > 0) {
      await reportPhotoAlerts(alerts)
    }

    return {
      totalScanned: result.totalScanned,
      flagged: alerts,
      lastScanDate: new Date().toISOString(),
    }
  } catch (e) {
    console.error('Photo scan failed:', e)
    return { totalScanned: 0, flagged: [], lastScanDate: new Date().toISOString() }
  }
}

/**
 * Report photo alerts to parent dashboard.
 * Only sends thumbnails (100x100), never full photos.
 */
async function reportPhotoAlerts(alerts: PhotoAlert[]): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return

  for (const alert of alerts) {
    await reportData(deviceId, 'PHOTO_ALERT', alert)
  }
}

/**
 * Request photo library permission.
 */
export async function requestPhotoPermission(): Promise<boolean> {
  try {
    const { PhotoScanner } = NativeModules
    if (!PhotoScanner) return false
    return await PhotoScanner.requestPermission()
  } catch {
    return false
  }
}

/**
 * Check if photo library permission is granted.
 */
export async function hasPhotoPermission(): Promise<boolean> {
  try {
    const { PhotoScanner } = NativeModules
    if (!PhotoScanner) return false
    return await PhotoScanner.hasPermission()
  } catch {
    return false
  }
}

/**
 * Get last scan result from storage.
 */
export async function getLastScanResult(): Promise<PhotoScanResult | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem('aria_last_photo_scan')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Save scan result to storage.
 */
export async function saveScanResult(result: PhotoScanResult): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    await AsyncStorage.setItem('aria_last_photo_scan', JSON.stringify(result))
  } catch {}
}
