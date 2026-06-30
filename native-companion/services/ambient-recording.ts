// ═══════════════════════════════════════════════════════════════
// Ambient Recording — record surroundings for 30 seconds
// ═══════════════════════════════════════════════════════════════
// Records audio from the microphone for 30 seconds and uploads
// to parent dashboard. Used for emergency situations.
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules, PermissionsAndroid } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

const RECORDING_DURATION_MS = 30000  // 30 seconds

export type AmbientRecording = {
  id: string
  audioBase64: string  // base64-encoded audio
  durationMs: number
  timestamp: string
  trigger: 'PARENT_REQUEST' | 'SOS' | 'CRASH_DETECTED' | 'PANIC_SHAKE'
}

/**
 * Record surroundings for 30 seconds.
 * Audio is uploaded to parent dashboard.
 */
export async function recordAmbient(
  trigger: AmbientRecording['trigger'] = 'PARENT_REQUEST'
): Promise<AmbientRecording | null> {
  // Request microphone permission
  const hasPermission = await requestMicPermission()
  if (!hasPermission) return null

  try {
    const { AudioRecorder } = NativeModules
    if (!AudioRecorder) return null

    const audioBase64 = await AudioRecorder.recordFor(RECORDING_DURATION_MS)

    const recording: AmbientRecording = {
      id: `${Date.now()}-${Math.random()}`,
      audioBase64,
      durationMs: RECORDING_DURATION_MS,
      timestamp: new Date().toISOString(),
      trigger,
    }

    // Upload to parent dashboard
    const deviceId = await getStoredDeviceId()
    if (deviceId) {
      await reportData(deviceId, 'AMBIENT_RECORDING', recording)
    }

    return recording
  } catch (e) {
    console.error('Ambient recording failed:', e)
    return null
  }
}

/**
 * Request microphone permission (Android).
 */
async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Aria Companion needs microphone access for ambient recording during emergencies.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    )
    return granted === PermissionsAndroid.RESULTS.GRANTED
  } catch {
    return false
  }
}

/**
 * Start continuous ambient listening (no recording).
 * Detects sounds above threshold (cry, scream, glass break).
 */
export async function startSoundDetection(
  onSoundDetected: (type: string, confidence: number) => void
): Promise<() => void> {
  const hasPermission = await requestMicPermission()
  if (!hasPermission) return () => {}

  try {
    const { SoundDetector } = NativeModules
    if (!SoundDetector) return () => {}

    const subscription = SoundDetector.addListener((event: any) => {
      onSoundDetected(event.type, event.confidence)
    })

    await SoundDetector.start({
      detectableSounds: ['CRY', 'SCREAM', 'GLASS_BREAK', 'GUNSHOT', 'ALARM'],
      sensitivity: 0.7,
    })

    return () => {
      subscription.remove()
      SoundDetector.stop()
    }
  } catch (e) {
    console.error('Sound detection failed:', e)
    return () => {}
  }
}
