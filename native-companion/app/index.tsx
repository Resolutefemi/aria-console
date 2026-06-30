// ═══════════════════════════════════════════════════════════════
// Aria Companion — Pairing Screen (entry point)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Smartphone } from 'react-native-svg'
import * as SecureStore from 'expo-secure-store'
import { COLORS } from '@/constants/config'
import { verifyPairing, getStoredDeviceId, getStoredParentName } from '@/services/api'
import { getDeviceInfo, getBatteryInfo } from '@/services/device'

export default function PairingScreen() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if already paired
  useEffect(() => {
    checkExistingPairing()
  }, [])

  async function checkExistingPairing() {
    const deviceId = await getStoredDeviceId()
    if (deviceId) {
      router.replace('/paired')
      return
    }
    setChecking(false)
  }

  async function handlePair() {
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code from your parent\'s dashboard.')
      return
    }
    setLoading(true)
    try {
      const deviceInfo = await getDeviceInfo()
      const battery = await getBatteryInfo()

      const result = await verifyPairing(code, {
        name: deviceInfo.name,
        type: deviceInfo.type,
        room: 'Personal',
        os: `${deviceInfo.os} ${deviceInfo.osVersion}`,
        battery: battery.level >= 0 ? battery.level : 100,
      })

      if ('error' in result) {
        Alert.alert('Pairing failed', result.error)
      } else {
        router.replace('/paired')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to pair')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Smartphone width={24} height={24} fill={COLORS.accentFg} />
        </View>
        <Text style={styles.title}>Aria Companion</Text>
        <Text style={styles.subtitle}>Real device monitoring</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pair your device</Text>
        <Text style={styles.cardDesc}>
          Enter the 6-digit code from your parent's dashboard.
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handlePair}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Pairing…' : 'Pair Device'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.capabilitiesCard}>
        <Text style={styles.capTitle}>What this app REALLY monitors:</Text>
        {[
          'Real GPS location (background tracking)',
          'Real battery level + charging status',
          'Real device info (iPhone/Android, OS, model)',
          'Real network status (WiFi/Cellular)',
          'Push notifications (even when app closed)',
          'Receive commands: lock, ring, message, locate',
          'Vibration feedback on commands',
        ].map((cap, i) => (
          <Text key={i} style={styles.capItem}>✓ {cap}</Text>
        ))}
      </View>

      <View style={styles.limitationsCard}>
        <Text style={styles.capTitle}>What NO app can monitor without OS permissions:</Text>
        {[
          'Other apps installed (requires Screen Time API on iOS)',
          'Real app usage (requires UsageStatsManager on Android)',
          'Web browsing in other apps',
        ].map((cap, i) => (
          <Text key={i} style={[styles.capItem, { color: COLORS.destructive }]}>⚠ {cap}</Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'center',
  },
  loading: {
    color: COLORS.text,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDesc: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 28,
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.accentFg,
    fontSize: 14,
    fontWeight: '600',
  },
  capabilitiesCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  limitationsCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  capTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  capItem: {
    color: COLORS.emerald,
    fontSize: 12,
    marginVertical: 3,
  },
})
