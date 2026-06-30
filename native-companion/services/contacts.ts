// ═══════════════════════════════════════════════════════════════
// Contacts Service — upload contacts to parent dashboard
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type Contact = {
  id: string
  name: string
  phoneNumbers: string[]
  email?: string
  isEmergency?: boolean  // whitelisted by parent
}

/**
 * Get all contacts from the device (Android + iOS).
 */
export async function getContacts(): Promise<Contact[]> {
  try {
    const { Contacts } = NativeModules
    if (!Contacts) return []
    return await Contacts.getAll()
  } catch (e) {
    console.error('Failed to get contacts:', e)
    return []
  }
}

/**
 * Upload contacts to parent dashboard.
 */
export async function reportContacts(): Promise<number> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return 0

  const contacts = await getContacts()
  await reportData(deviceId, 'CONTACTS', {
    contacts,
    count: contacts.length,
    timestamp: new Date().toISOString(),
  })

  return contacts.length
}

/**
 * Request contacts permission.
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { Contacts } = NativeModules
    if (!Contacts) return false
    return await Contacts.requestPermission()
  } catch {
    return false
  }
}

/**
 * Check if contacts permission is granted.
 */
export async function hasContactsPermission(): Promise<boolean> {
  try {
    const { Contacts } = NativeModules
    if (!Contacts) return false
    return await Contacts.hasPermission()
  } catch {
    return false
  }
}

/**
 * Set a contact as emergency (whitelisted).
 * Emergency contacts can always reach the child even when device is locked.
 */
export async function setEmergencyContact(contactId: string, isEmergency: boolean): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem('aria_emergency_contacts')
    const emergency: string[] = stored ? JSON.parse(stored) : []

    if (isEmergency && !emergency.includes(contactId)) {
      emergency.push(contactId)
    } else if (!isEmergency) {
      const idx = emergency.indexOf(contactId)
      if (idx >= 0) emergency.splice(idx, 1)
    }

    await AsyncStorage.setItem('aria_emergency_contacts', JSON.stringify(emergency))
  } catch {}
}

/**
 * Get list of emergency contact IDs.
 */
export async function getEmergencyContacts(): Promise<string[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem('aria_emergency_contacts')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}
