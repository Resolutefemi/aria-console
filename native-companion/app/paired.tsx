// ═══════════════════════════════════════════════════════════════
// Aria Companion — Main Screen (Ultimate Edition)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Vibration, FlatList, TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import * as Haptics from 'expo-haptics'
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
import {
  getTodayAppUsage, hasUsageStatsPermission, requestUsageStatsPermission,
  type AppUsageSummary,
} from '@/services/app-usage'
import { triggerSOS, sendCheckIn } from '@/services/sos'
import { enforceLimits, getLimits, type ScreenTimeLimit } from '@/services/screen-time'
import { getGeofences, type Geofence } from '@/services/geofence'
import { registerBackgroundTasks, runBackgroundCycle } from '@/services/background'

type Command = {
  id: string
  type: string
  payload: any
}

type Tab = 'home' | 'apps' | 'location' | 'rules' | 'sos'

export default function PairedScreen() {
  const router = useRouter()
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [parentName, setParentName] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [battery, setBattery] = useState<BatteryInfo | null>(null)
  const [location, setLocation] = useState<LocationInfo | null>(null)
  const [network, setNetwork] = useState<NetworkInfo | null>(null)
  const [appUsage, setAppUsage] = useState<AppUsageSummary | null>(null)
  const [limits, setLimits] = useState<ScreenTimeLimit[]>([])
  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [usagePermission, setUsagePermission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const locationSubRef = useRef<(() => void) | null>(null)

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

    // Check usage stats permission
    const hasPerm = await hasUsageStatsPermission()
    setUsagePermission(hasPerm)
    if (hasPerm) {
      const usage = await getTodayAppUsage()
      setAppUsage(usage)
    }

    // Get limits + geofences
    setLimits(await getLimits())
    setGeofences(await getGeofences())

    // Start location tracking
    startLocation(id)

    // Setup notifications
    await setupNotifications()

    // Register background tasks
    await registerBackgroundTasks()

    setLoading(false)

    // Start polling
    startCommandPolling(id)
    startHeartbeat(id, bat)
    startUsagePolling(id)
    startEnforcementPolling()
  }

  function startLocation(id: string) {
    getCurrentLocation().then((loc) => {
      if (loc) {
        setLocation(loc)
        reportData(id, 'LOCATION', {
          latitude: loc.latitude, longitude: loc.longitude,
          accuracy: loc.accuracy, battery: battery?.level,
        })
      }
    })

    startLocationTracking(id, (loc) => {
      setLocation(loc)
      reportData(id, 'LOCATION', {
        latitude: loc.latitude, longitude: loc.longitude,
        accuracy: loc.accuracy, speed: loc.speed, heading: loc.heading,
        battery: battery?.level,
      })
    }).then((unsub) => { locationSubRef.current = unsub })
  }

  async function setupNotifications() {
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status === 'granted') {
        Notifications.setNotificationHandler({
          handleNotification: () => ({
            shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
          }),
        })
      }
    } catch {}
  }

  function startCommandPolling(id: string) {
    const poll = async () => {
      const commands = await fetchCommands(id)
      for (const cmd of commands) await handleCommand(cmd)
    }
    poll()
    return setInterval(poll, POLLING.COMMANDS)
  }

  function startHeartbeat(id: string, bat: BatteryInfo | null) {
    const beat = async () => {
      await reportData(id, 'HEARTBEAT', {
        battery: bat?.level ?? 100, signal: -60,
        status: isLocked ? 'IDLE' : 'ONLINE',
      })
    }
    beat()
    return setInterval(beat, POLLING.HEARTBEAT)
  }

  function startUsagePolling(id: string) {
    const poll = async () => {
      if (usagePermission) {
        const usage = await getTodayAppUsage()
        setAppUsage(usage)
        await reportData(id, 'APP_USAGE', {
          totalTimeMs: usage.totalTimeMs,
          apps: usage.apps.map((a) => ({
            packageName: a.packageName, appName: a.appName,
            totalTimeInForeground: a.totalTimeInForeground,
          })),
        })
      }
    }
    poll()
    return setInterval(poll, 60000) // every minute
  }

  function startEnforcementPolling() {
    const poll = async () => {
      const result = await enforceLimits()
      if (result.violated) {
        for (const action of result.actions) {
          Alert.alert('Limit exceeded', action)
        }
      }
    }
    return setInterval(poll, 30000) // every 30s
  }

  async function handleCommand(cmd: Command) {
    const result: any = { executedAt: new Date().toISOString() }
    switch (cmd.type) {
      case 'LOCK_DEVICE':
        setIsLocked(true)
        result.locked = true
        Notifications.scheduleNotificationAsync({
          content: { title: '🔒 Device Locked', body: 'Your parent has locked this device.', sound: true },
          trigger: null,
        })
        break
      case 'UNLOCK_DEVICE':
        setIsLocked(false)
        result.unlocked = true
        break
      case 'RING_DEVICE':
        Vibration.vibrate([200, 100, 200, 100, 200])
        result.rang = true
        break
      case 'REQUEST_LOCATION':
        const loc = await getCurrentLocation()
        if (loc) await reportData(deviceId!, 'LOCATION', { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy })
        result.locationRequested = true
        break
      case 'SEND_MESSAGE':
        result.messageShown = cmd.payload?.message ?? ''
        Alert.alert('Message from parent', cmd.payload?.message || '')
        break
    }
    await reportCommandResult(cmd.id, 'EXECUTED', result)
  }

  async function handleSOS() {
    Alert.alert('Send SOS?', 'This will alert your parent with your location.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send SOS',
        style: 'destructive',
        onPress: async () => {
          await triggerSOS()
          Alert.alert('SOS sent', 'Your parent has been notified.')
        },
      },
    ])
  }

  async function handleCheckIn() {
    await sendCheckIn()
    Alert.alert('Checked in', 'Your parent knows you are safe.')
  }

  async function handleRequestUsagePermission() {
    const granted = await requestUsageStatsPermission()
    setUsagePermission(granted)
    if (granted) {
      const usage = await getTodayAppUsage()
      setAppUsage(usage)
      Alert.alert('Permission granted', 'App usage tracking is now active.')
    }
  }

  async function handleUnpair() {
    Alert.alert('Unpair device?', 'This will disconnect from your parent dashboard.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unpair', style: 'destructive',
        onPress: async () => { await clearStoredData(); router.replace('/') },
      },
    ])
  }

  if (loading || !deviceId || !deviceInfo) {
    return <View style={styles.container}><ActivityIndicator size="large" color={COLORS.accent} /></View>
  }

  if (isLocked) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>Device Locked</Text>
        <Text style={styles.lockedDesc}>Your parent has locked this device. Contact them.</Text>
        <TouchableOpacity onPress={() => setIsLocked(false)}>
          <Text style={styles.unlockBtn}>(Test unlock)</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'apps', label: 'Apps', icon: '📱' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'rules', label: 'Rules', icon: '⚙️' },
    { id: 'sos', label: 'SOS', icon: '🆘' },
  ]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Aria Companion</Text>
          <Text style={styles.parentName}>{parentName}'s device</Text>
        </View>
        <TouchableOpacity onPress={handleUnpair}>
          <Text style={styles.unpairBtn}>Unpair</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'home' && (
          <HomeTab
            deviceInfo={deviceInfo}
            battery={battery}
            network={network}
            appUsage={appUsage}
            usagePermission={usagePermission}
            onRequestPermission={handleRequestUsagePermission}
            onSOS={handleSOS}
            onCheckIn={handleCheckIn}
          />
        )}
        {activeTab === 'apps' && (
          <AppsTab appUsage={appUsage} usagePermission={usagePermission} onRequestPermission={handleRequestUsagePermission} />
        )}
        {activeTab === 'location' && (
          <LocationTab location={location} geofences={geofences} />
        )}
        {activeTab === 'rules' && (
          <RulesTab limits={limits} />
        )}
        {activeTab === 'sos' && (
          <SOSTab onSOS={handleSOS} onCheckIn={handleCheckIn} />
        )}
      </ScrollView>
    </View>
  )
}

// ─── Home Tab ────────────────────────────────────────────

function HomeTab({ deviceInfo, battery, network, appUsage, usagePermission, onRequestPermission, onSOS, onCheckIn }: any) {
  return (
    <View>
      {/* SOS + Check-in buttons */}
      <View style={styles.emergencyRow}>
        <TouchableOpacity style={styles.sosButton} onPress={onSOS}>
          <Text style={styles.sosButtonText}>🆘 SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkInButton} onPress={onCheckIn}>
          <Text style={styles.checkInButtonText}>✓ Check In</Text>
        </TouchableOpacity>
      </View>

      {/* Device info */}
      <Card title="Device Info (Real)">
        <Row label="Name" value={deviceInfo.name} />
        <Row label="Type" value={deviceInfo.type} />
        <Row label="OS" value={`${deviceInfo.os} ${deviceInfo.osVersion}`} />
        <Row label="Model" value={deviceInfo.model} />
      </Card>

      {/* Battery + Network */}
      <View style={styles.row2}>
        <Card title="🔋 Battery" style={{ flex: 1, marginRight: 8 }}>
          {battery?.level >= 0 ? (
            <>
              <Text style={styles.bigValue}>{battery.level}%</Text>
              {battery.charging && <Text style={styles.charging}>⚡ Charging</Text>}
            </>
          ) : <Text style={styles.mutedSmall}>N/A</Text>}
        </Card>
        <Card title="📶 Network" style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.bigValue}>{network?.online ? 'Online' : 'Offline'}</Text>
          <Text style={styles.mutedSmall}>{network?.type.toUpperCase()}</Text>
        </Card>
      </View>

      {/* Screen time summary */}
      <Card title="📊 Today's Screen Time">
        {usagePermission ? (
          appUsage ? (
            <View>
              <Text style={styles.bigValue}>
                {Math.floor(appUsage.totalTimeMs / 60000)}m total
              </Text>
              <Text style={styles.mutedSmall}>{appUsage.totalApps} apps used</Text>
              {appUsage.mostUsedApp && (
                <Text style={styles.mutedSmall}>Most used: {appUsage.mostUsedApp.appName}</Text>
              )}
            </View>
          ) : <Text style={styles.mutedSmall}>Loading…</Text>
        ) : (
          <View>
            <Text style={styles.mutedSmall}>App usage tracking not enabled</Text>
            <TouchableOpacity style={styles.permButton} onPress={onRequestPermission}>
              <Text style={styles.permButtonText}>Enable app tracking</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    </View>
  )
}

// ─── Apps Tab ────────────────────────────────────────────

function AppsTab({ appUsage, usagePermission, onRequestPermission }: any) {
  if (!usagePermission) {
    return (
      <Card title="📱 App Usage">
        <Text style={styles.mutedSmall}>App usage tracking requires permission.</Text>
        <TouchableOpacity style={styles.permButton} onPress={onRequestPermission}>
          <Text style={styles.permButtonText}>Grant permission</Text>
        </TouchableOpacity>
      </Card>
    )
  }

  if (!appUsage || appUsage.apps.length === 0) {
    return (
      <Card title="📱 App Usage">
        <Text style={styles.mutedSmall}>No app usage recorded today.</Text>
      </Card>
    )
  }

  return (
    <Card title="📱 Apps Used Today">
      <Text style={styles.bigValue}>{Math.floor(appUsage.totalTimeMs / 60000)}m total</Text>
      <FlatList
        data={appUsage.apps}
        keyExtractor={(item) => item.packageName}
        renderItem={({ item }) => (
          <View style={styles.appRow}>
            <View style={styles.appIcon}>
              <Text style={styles.appIconText}>{item.appName[0]}</Text>
            </View>
            <View style={styles.appInfo}>
              <Text style={styles.appName2}>{item.appName}</Text>
              <Text style={styles.appPackage}>{item.packageName}</Text>
            </View>
            <Text style={styles.appTime}>{Math.floor(item.totalTimeInForeground / 60000)}m</Text>
          </View>
        )}
      />
    </Card>
  )
}

// ─── Location Tab ────────────────────────────────────────

function LocationTab({ location, geofences }: any) {
  return (
    <View>
      <Card title="📍 Real GPS Location">
        {location ? (
          <View>
            <Text style={styles.coords}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
            <Text style={styles.mutedSmall}>Accuracy: ±{Math.round(location.accuracy)}m</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live tracking active</Text>
            </View>
          </View>
        ) : <Text style={styles.mutedSmall}>Acquiring GPS…</Text>}
      </Card>

      <Card title="🗺️ Geofences">
        {geofences.length > 0 ? (
          geofences.map((g: Geofence) => (
            <View key={g.id} style={styles.geofenceRow}>
              <Text style={styles.geofenceName}>{g.name}</Text>
              <Text style={styles.mutedSmall}>Radius: {g.radius}m</Text>
            </View>
          ))
        ) : (
          <Text style={styles.mutedSmall}>No geofences set. Parent can add them from the dashboard.</Text>
        )}
      </Card>
    </View>
  )
}

// ─── Rules Tab ───────────────────────────────────────────

function RulesTab({ limits }: any) {
  return (
    <Card title="⚙️ Active Rules">
      {limits.length > 0 ? (
        limits.map((limit: ScreenTimeLimit, i: number) => (
          <View key={i} style={styles.ruleRow}>
            <Text style={styles.ruleType}>{limit.type.replace(/_/g, ' ')}</Text>
            <Text style={styles.ruleDetail}>
              {limit.type === 'BEDTIME'
                ? `${limit.bedtimeStart} - ${limit.bedtimeEnd}`
                : `${limit.limitMin} min${limit.appId ? ' per app' : ''}`}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.mutedSmall}>No rules set. Parent can add them from the dashboard.</Text>
      )}
    </Card>
  )
}

// ─── SOS Tab ─────────────────────────────────────────────

function SOSTab({ onSOS, onCheckIn }: any) {
  return (
    <View>
      <Card title="🆘 Emergency SOS">
        <Text style={styles.sosDesc}>
          Press the SOS button to immediately alert your parent with your current location and battery status.
        </Text>
        <TouchableOpacity style={styles.bigSosButton} onPress={onSOS}>
          <Text style={styles.bigSosText}>🆘 SEND SOS</Text>
        </TouchableOpacity>
      </Card>

      <Card title="✓ Check In">
        <Text style={styles.sosDesc}>
          Let your parent know you're safe without an emergency.
        </Text>
        <TouchableOpacity style={styles.bigCheckInButton} onPress={onCheckIn}>
          <Text style={styles.bigCheckInText}>✓ CHECK IN</Text>
        </TouchableOpacity>
      </Card>
    </View>
  )
}

// ─── Shared components ───────────────────────────────────

function Card({ title, children, style }: any) {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  appName: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  parentName: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  unpairBtn: { color: COLORS.textMuted, fontSize: 12 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { color: COLORS.textMuted, fontSize: 10 },
  tabLabelActive: { color: COLORS.accent, fontWeight: '600' },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: COLORS.textMuted, fontSize: 14 },
  rowValue: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  row2: { flexDirection: 'row', marginBottom: 12 },
  bigValue: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  charging: { color: COLORS.emerald, fontSize: 11, marginTop: 2 },
  mutedSmall: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  coords: { color: COLORS.text, fontSize: 14, fontFamily: 'monospace' },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.emerald, marginRight: 6 },
  liveText: { color: COLORS.emerald, fontSize: 11 },
  emergencyRow: { flexDirection: 'row', marginBottom: 12 },
  sosButton: { flex: 1, backgroundColor: COLORS.destructive, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginRight: 8 },
  sosButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  checkInButton: { flex: 1, backgroundColor: COLORS.emerald, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginLeft: 8 },
  checkInButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  permButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 8 },
  permButtonText: { color: COLORS.accentFg, fontSize: 12, fontWeight: '600' },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  appIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  appIconText: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
  appInfo: { flex: 1 },
  appName2: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  appPackage: { color: COLORS.textMuted, fontSize: 10, fontFamily: 'monospace' },
  appTime: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  geofenceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  geofenceName: { color: COLORS.text, fontSize: 14 },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  ruleType: { color: COLORS.text, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  ruleDetail: { color: COLORS.textMuted, fontSize: 12 },
  sosDesc: { color: COLORS.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 20 },
  bigSosButton: { backgroundColor: COLORS.destructive, borderRadius: 16, paddingVertical: 24, alignItems: 'center' },
  bigSosText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  bigCheckInButton: { backgroundColor: COLORS.emerald, borderRadius: 16, paddingVertical: 24, alignItems: 'center' },
  bigCheckInText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  lockedContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 32 },
  lockedIcon: { fontSize: 48, marginBottom: 16 },
  lockedTitle: { color: COLORS.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
  lockedDesc: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  unlockBtn: { color: COLORS.textMuted, fontSize: 12, textDecorationLine: 'underline' },
})
