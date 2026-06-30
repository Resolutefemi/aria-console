// ═══════════════════════════════════════════════════════════════
// Communication Service — Call + SMS logging (Android only)
// ═══════════════════════════════════════════════════════════════
// iOS does not allow apps to access call logs or SMS — this is
// Android-only and requires READ_CALL_LOG + READ_SMS permissions.
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type CallLogEntry = {
  id: string
  phoneNumber: string
  callType: 'INCOMING' | 'OUTGOING' | 'MISSED' | 'REJECTED'
  duration: number  // seconds
  timestamp: number
  contactName?: string
}

export type SMSEntry = {
  id: string
  phoneNumber: string
  message: string
  type: 'INCOMING' | 'OUTGOING'
  timestamp: number
  contactName?: string
  flagged?: boolean
  flagReason?: string
}

/**
 * Get call log history (Android only).
 * Requires READ_CALL_LOG permission.
 */
export async function getCallLog(limit: number = 100): Promise<CallLogEntry[]> {
  if (Platform.OS !== 'android') return []

  try {
    const { CallLog } = NativeModules
    if (!CallLog) return []
    return await CallLog.getAll(limit)
  } catch (e) {
    console.error('Failed to get call log:', e)
    return []
  }
}

/**
 * Get SMS history (Android only).
 * Requires READ_SMS permission.
 */
export async function getSMSHistory(limit: number = 100): Promise<SMSEntry[]> {
  if (Platform.OS !== 'android') return []

  try {
    const { SMS } = NativeModules
    if (!SMS) return []
    const messages = await SMS.getAll(limit)
    return messages.map((m: any) => ({
      ...m,
      flagged: checkFlaggedContent(m.message),
      flagReason: checkFlaggedContent(m.message) ? getFlagReason(m.message) : undefined,
    }))
  } catch (e) {
    console.error('Failed to get SMS:', e)
    return []
  }
}

/**
 * Check if a message contains concerning content.
 * Returns true if any keyword is found.
 */
function checkFlaggedContent(message: string): boolean {
  const lower = message.toLowerCase()
  return FLAGGED_KEYWORDS.some((kw) => lower.includes(kw))
}

function getFlagReason(message: string): string {
  const lower = message.toLowerCase()
  for (const [category, keywords] of Object.entries(FLAGGED_CATEGORIES)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return `Flagged: ${category} content`
    }
  }
  return 'Flagged content detected'
}

// Bark-style keyword detection
const FLAGGED_CATEGORIES = {
  CYBERBULLYING: ['hate you', 'kill yourself', 'nobody likes you', 'ugly', 'stupid', 'loser', 'pathetic'],
  DRUGS: ['weed', 'cocaine', 'heroin', 'pills', 'mdma', 'lsd', 'shrooms', 'deal', 'dealer', 'high on'],
  VIOLENCE: ['fight', 'beat up', 'punch', 'knife', 'gun', 'shoot', 'kill', 'blood', 'weapon'],
  SELF_HARM: ['cut myself', 'hurt myself', 'suicide', 'kill myself', 'end it all', 'no reason to live', 'depressed'],
  EXPLICIT: ['sex', 'nude', 'nudes', 'send pic', 'send picture', 'hookup', 'tinder'],
  PREDATOR: ['meet up', 'where do you live', 'your address', "don't tell your parents", 'secret between us'],
  ALCOHOL: ['drunk', 'beer', 'vodka', 'whiskey', 'tequila', 'wine', 'drinking'],
  GAMBLING: ['bet', 'casino', 'poker', 'lottery'],
}

const FLAGGED_KEYWORDS = Object.values(FLAGGED_CATEGORIES).flat()

/**
 * Report call log + SMS to parent dashboard.
 */
export async function reportCommunications(): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return

  const calls = await getCallLog(50)
  const sms = await getSMSHistory(50)

  await reportData(deviceId, 'COMMUNICATIONS', {
    calls,
    sms,
    flaggedMessages: sms.filter((s) => s.flagged),
    timestamp: new Date().toISOString(),
  })
}

/**
 * Request permissions for call log + SMS (Android only).
 */
export async function requestCommunicationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  try {
    const { Permissions } = NativeModules
    if (!Permissions) return false
    const callPerm = await Permissions.request('READ_CALL_LOG')
    const smsPerm = await Permissions.request('READ_SMS')
    return callPerm && smsPerm
  } catch {
    return false
  }
}

/**
 * Check if communication permissions are granted.
 */
export async function hasCommunicationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  try {
    const { Permissions } = NativeModules
    if (!Permissions) return false
    return await Permissions.check('READ_CALL_LOG') && await Permissions.check('READ_SMS')
  } catch {
    return false
  }
}
