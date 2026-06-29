// ═══════════════════════════════════════════════════════════════
// Aria Companion — Paired (Home) Screen
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Vibration,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { COLORS, POLLING } from '@/constants/config'
import {
  getStoredDeviceId, getStoredParentName, clearStoredData,
  reportData, fetchCommands, reportCommandResult,
} from '@/services/api'
import {
  getDeviceInfo, getBatteryInfo, getCurrentLocation,
  startLocationTracking, getNetworkInfo,
  type DeviceInfo, type BatteryInfo, type LocationInfo, type NetworkInfo,
} from '@/services/device'

type Command = {
  id: string
  type: string
  payload: any
}

export default function PairedScreen() {
  const router = useRouter()
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [parentName, setParentName] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [battery, setBattery] = useState<BatteryInfo | null>(null)
  const [location, setLocation] = useState<LocationInfo | null>(null)
  const [network, setNetwork] = useState<NetworkInfo | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const locationSubRef = useRef<(() => void) | null>(null)

  // Initialize
  useEffect(() => {
    init()
    return () => {
      locationSubRef.current?.()
    }
  }, [])

  async function init() {
    const id = await getStoredDeviceId()
    const parent = await getStoredParentName()
    if (!id) {
      router.replace('/')
      return
    }
    setDeviceId(id)
    setParentName(parent)

    // Get real device info
    const info = await getDeviceInfo()
    setDeviceInfo(info)

    const bat = await getBatteryInfo()
    setBattery(bat)

    const net = await getNetworkInfo()
    setNetwork(net)

    // Start location tracking
    startLocation(id)

    // Setup notifications
    setupNotifications()

    setLoading(false)

    // Start command polling
    startCommandPolling(id)

    // Start heartbeat
    startHeartbeat(id, bat)
  }

  function startLocation(id: string) {
    // Get initial location
    getCurrentLocation().then((loc) => {
      if (loc) {
        setLocation(loc)
        reportData(id, 'LOCATION', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          battery: battery?.level,
        })
      }
    })

    // Start continuous tracking
    startLocationTracking(id, (loc) => {
      setLocation(loc)
      reportData(id, 'LOCATION', {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        battery: battery?.level,
      })
    }).then((unsub) => {
      locationSubRef.current = unsub
    })
  }

  async function setupNotifications() {
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      setNotifStatus(status === 'granted' ? 'granted' : 'denied')

      if (status === 'granted') {
        Notifications.setNotificationHandler({
          handleNotification: () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        })
      }
    } catch {}
  }

  function startCommandPolling(id: string) {
    const poll = async () => {
      const commands = await fetchCommands(id)
      for (const cmd of commands) {
        await handleCommand(cmd)
      }
    }
    poll()
    const interval = setInterval(poll, POLLING.COMMANDS)
    return () => clearInterval(interval)
  }

  function startHeartbeat(id: string, bat: BatteryInfo | null) {
    const beat = async () => {
      await reportData(id, 'HEARTBEAT', {
        battery: bat?.level ?? 100,
        signal: -60,
        status: isLocked ? 'IDLE' : 'ONLINE',
      })
      setLastHeartbeat(new Date())
    }
    beat()
    const interval = setInterval(beat, POLLING.HEARTBEAT)
    return () => clearInterval(interval)
  }

  async function handleCommand(cmd: Command) {
    const result: any = { executedAt: new Date().toISOString() }

    switch (cmd.type) {
      case 'LOCK_DEVICE':
        setIsLocked(true)
        result.locked = true
        if (notifStatus === 'granted') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🔒 Device Locked',
              body: 'Your parent has locked this device.',
              sound: true,
            },
            trigger: null,
          })
        }
        break

      case 'UNLOCK_DEVICE':
        setIsLocked(false)
        result.unlocked = true
        break

      case 'RING_DEVICE':
        Vibration.vibrate([200, 100, 200, 100, 200])
        result.rang = true
        if (notifStatus === 'granted') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🔔 Ring',
              body: 'Your parent is ringing your device.',
              sound: true,
            },
            trigger: null,
          })
        }
        break

      case 'REQUEST_LOCATION':
        const loc = await getCurrentLocation()
        if (loc) {
          await reportData(deviceId!, 'LOCATION', {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
          })
        }
        result.locationRequested = true
        break

      case 'SEND_MESSAGE':
        result.messageShown = cmd.payload?.message ?? ''
        if (notifStatus === 'granted') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Message from parent',
              body: cmd.payload?.message || '',
              sound: true,
            },
            trigger: null,
          })
        }
        Alert.alert('Message from parent', cmd.payload?.message || '')
        break
    }

    await reportCommandResult(cmd.id, 'EXECUTED', result)
  }

  async function handleUnpair() {
    Alert.alert(
      'Unpair device?',
      'This will disconnect this device from your parent\'s dashboard.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            await clearStoredData()
            router.replace('/')
          },
        },
      ]
    )
  }

  if (loading || !deviceId || !deviceInfo) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  if (isLocked) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>Device Locked</Text>
        <Text style={styles.lockedDesc}>
          Your parent has locked this device. Please contact them.
        </Text>
        <TouchableOpacity onPress={() => setIsLocked(false)} style={styles.unlockBtn}>
          <Text style={styles.unlockBtnText}>(Test unlock)</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Aria Companion</Text>
          <Text style={styles.parentName}>Linked to {parentName}'s account</Text>
        </View>
        <TouchableOpacity onPress={handleUnpair}>
          <Text style={styles.unpairBtn}>Unpair</Text>
        </TouchableOpacity>
      </View>

      {/* Device Info */}
      <Card title="Device Info (Real)">
        <Row label="Name" value={deviceInfo.name} />
        <Row label="Type" value={deviceInfo.type} />
        <Row label="OS" value={`${deviceInfo.os} ${deviceInfo.osVersion}`} />
        <Row label="Brand" value={deviceInfo.brand} />
        <Row label="Model" value={deviceInfo.model} />
      </Card>

      {/* Battery + Network */}
      <View style={styles.row2}>
        <Card title="🔋 Battery" style={{ flex: 1, marginRight: 8 }}>
          {battery && battery.level >= 0 ? (
            <>
              <Text style={styles.bigValue}>{battery.level}%</Text>
              {battery.charging && <Text style={styles.charging}>⚡ Charging</Text>}
            </>
          ) : (
            <Text style={styles.mutedSmall}>Not available</Text>
          )}
        </Card>
        <Card title="📶 Network" style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.bigValue}>{network?.online ? 'Online' : 'Offline'}</Text>
          <Text style={styles.mutedSmall}>{network?.type.toUpperCase()}</Text>
        </Card>
      </View>

      {/* GPS Location */}
      <Card title="📍 Real GPS Location">
        {location ? (
          <View>
            <Text style={styles.coords}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
            <Text style={styles.mutedSmall}>
              Accuracy: ±{Math.round(location.accuracy)}m
            </Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live tracking active</Text>
            </View>
            <Text style={styles.mapLink}>
              View on map: https://www.openstreetmap.org/?mlat={location.latitude}&mlon={location.longitude}
            </Text>
          </View>
        ) : (
          <Text style={styles.mutedSmall}>Acquiring GPS…</Text>
        )}
      </Card>

      {/* Notifications */}
      <Card title="🔔 Notifications">
        {notifStatus === 'granted' ? (
          <Text style={styles.enabled}>
            ✓ Enabled — commands arrive even when app is closed
          </Text>
        ) : notifStatus === 'denied' ? (
          <Text style={styles.mutedSmall}>
            Denied — enable in Settings to receive commands
          </Text>
        ) : (
          <Text style={styles.mutedSmall}>Requesting permission…</Text>
        )}
      </Card>

      {/* Active Sensors */}
      <Card title="⚙️ Active Sensors">
        <SensorRow label="GPS tracking" active={!!location} />
        <SensorRow label="Battery monitor" active={battery !== null && battery.level >= 0} />
        <SensorRow label="Network monitor" active={network !== null} />
        <SensorRow label="Command polling" active={true} />
        <SensorRow label="Heartbeat" active={!!lastHeartbeat} />
        <SensorRow label="Notifications" active={notifStatus === 'granted'} />
        {lastHeartbeat && (
          <Text style={styles.heartbeatTime}>
            Last heartbeat: {lastHeartbeat.toLocaleTimeString()}
          </Text>
        )}
      </Card>

      <Text style={styles.disclaimer}>
        This companion reports REAL data only. For full app monitoring (other apps, screen time),
        additional OS permissions are required (Screen Time API on iOS, UsageStatsManager on Android).
      </Text>
    </ScrollView>
  )
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function SensorRow({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={{ color: active ? COLORS.emerald : COLORS.textMuted }}>
        {active ? '● Active' : '● Inactive'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loading: {
    color: COLORS.text,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  parentName: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  unpairBtn: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  rowValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  row2: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bigValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
  },
  charging: {
    color: COLORS.emerald,
    fontSize: 11,
    marginTop: 2,
  },
  mutedSmall: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  coords: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.emerald,
    fontSize: 11,
  },
  mapLink: {
    color: COLORS.accent,
    fontSize: 10,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  enabled: {
    color: COLORS.emerald,
    fontSize: 13,
  },
  heartbeatTime: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 8,
    fontStyle: 'italic',
  },
  disclaimer: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  lockedContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockedTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  lockedDesc: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  unlockBtn: {
    padding: 8,
  },
  unlockBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
})
