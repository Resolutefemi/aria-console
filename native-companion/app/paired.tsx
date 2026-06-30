// ═══════════════════════════════════════════════════════════════
// Aria Companion — Main Screen (Ultimate Edition v2)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Vibration, FlatList, Switch,
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
import {
  getTodayAppUsage, hasUsageStatsPermission, requestUsageStatsPermission,
  type AppUsageSummary,
} from '@/services/app-usage'
import { triggerSOS, sendCheckIn } from '@/services/sos'
import { enforceLimits, getLimits, type ScreenTimeLimit } from '@/services/screen-time'
import { getGeofences, type Geofence } from '@/services/geofence'
import { registerBackgroundTasks, runBackgroundCycle } from '@/services/background'
import { startDrivingMonitor, getDrivingStatus, type DrivingEvent } from '@/services/driving'
import { startSocialMonitor } from '@/services/social-monitor'
import { startAppInstallMonitor } from '@/services/app-install-monitor'
import { startDeviceEventMonitor } from '@/services/device-events'
import { enablePanicShake, disablePanicShake, isPanicShakeEnabled } from '@/services/panic-shake'
import { reportContacts, getEmergencyContacts } from '@/services/contacts'
import { hasCommunicationPermissions, requestCommunicationPermissions, getCallLog, getSMSHistory } from '@/services/communications'
import { scanPhotoGallery, hasPhotoPermission, requestPhotoPermission, getLastScanResult, type PhotoScanResult } from '@/services/photo-monitor'
import { scheduleDailyReports } from '@/services/daily-report'
import { syncRewards, getActiveRewards, type Reward } from '@/services/rewards'

type Command = {
  id: string
  type: string
  payload: any
}

type Tab = 'home' | 'apps' | 'location' | 'rules' | 'activity' | 'sos' | 'settings'

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
  const [rewards, setRewards] = useState<Reward[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [usagePermission, setUsagePermission] = useState(false)
  const [commPermission, setCommPermission] = useState(false)
  const [photoPermission, setPhotoPermission] = useState(false)
  const [panicShakeEnabled, setPanicShakeEnabled] = useState(false)
  const [drivingStatus, setDrivingStatus] = useState(getDrivingStatus())
  const [photoScan, setPhotoScan] = useState<PhotoScanResult | null>(null)
  const [calls, setCalls] = useState<any[]>([])
  const [sms, setSms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const locationSubRef = useRef<(() => void) | null>(null)
  const drivingSubRef = useRef<(() => void) | null>(null)
  const socialSubRef = useRef<(() => void) | null>(null)
  const appInstallSubRef = useRef<(() => void) | null>(null)
  const deviceEventSubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    init()
    return () => {
      locationSubRef.current?.()
      drivingSubRef.current?.()
      socialSubRef.current?.()
      appInstallSubRef.current?.()
      deviceEventSubRef.current?.()
    }
  }, [])

  async function init() {
    const id = await getStoredDeviceId()
    const parent = await getStoredParentName()
    if (!id) { router.replace('/'); return }
    setDeviceId(id)
    setParentName(parent)

    const info = await getDeviceInfo()
    setDeviceInfo(info)
    const bat = await getBatteryInfo()
    setBattery(bat)
    const net = await getNetworkInfo()
    setNetwork(net)

    const hasPerm = await hasUsageStatsPermission()
    setUsagePermission(hasPerm)
    if (hasPerm) {
      const usage = await getTodayAppUsage()
      setAppUsage(usage)
    }

    const hasCommPerm = await hasCommunicationPermissions()
    setCommPermission(hasCommPerm)
    if (hasCommPerm) {
      setCalls(await getCallLog(20))
      setSms(await getSMSHistory(20))
    }

    const hasPhotoPerm = await hasPhotoPermission()
    setPhotoPermission(hasPhotoPerm)
    setPhotoScan(await getLastScanResult())

    setLimits(await getLimits())
    setGeofences(await getGeofences())
    setRewards(await getActiveRewards())

    startLocation(id)
    await setupNotifications()
    await registerBackgroundTasks()

    // Start all monitoring services
    drivingSubRef.current = await startDrivingMonitor()
    socialSubRef.current = await startSocialMonitor()
    appInstallSubRef.current = await startAppInstallMonitor()
    deviceEventSubRef.current = await startDeviceEventMonitor()

    // Schedule daily reports
    scheduleDailyReports()

    setLoading(false)

    startCommandPolling(id)
    startHeartbeat(id, bat)
    startUsagePolling(id)
    startEnforcementPolling()
    startRewardsSync()
    startDrivingStatusPolling()
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
    return setInterval(poll, 60000)
  }

  function startEnforcementPolling() {
    const poll = async () => {
      const result = await enforceLimits()
      if (result.violated) {
        for (const action of result.actions) Alert.alert('Limit exceeded', action)
      }
    }
    return setInterval(poll, 30000)
  }

  function startRewardsSync() {
    const poll = async () => {
      await syncRewards()
      setRewards(await getActiveRewards())
    }
    poll()
    return setInterval(poll, 60000)
  }

  function startDrivingStatusPolling() {
    const poll = () => setDrivingStatus(getDrivingStatus())
    return setInterval(poll, 5000)
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
        text: 'Send SOS', style: 'destructive',
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
    }
  }

  async function handleRequestCommPermission() {
    const granted = await requestCommunicationPermissions()
    setCommPermission(granted)
    if (granted) {
      setCalls(await getCallLog(20))
      setSms(await getSMSHistory(20))
      await reportData(deviceId!, 'COMMUNICATIONS', {
        calls: await getCallLog(50),
        sms: await getSMSHistory(50),
      })
    }
  }

  async function handleRequestPhotoPermission() {
    const granted = await requestPhotoPermission()
    setPhotoPermission(granted)
  }

  async function handleScanPhotos() {
    Alert.alert('Scan photos?', 'This may take a few minutes. Photos are scanned on-device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Scan', onPress: async () => {
          const result = await scanPhotoGallery()
          setPhotoScan(result)
          if (result.flagged.length > 0) {
            Alert.alert('Photos flagged', `${result.flagged.length} concerning photos detected. Your parent has been notified.`)
          } else {
            Alert.alert('Scan complete', `Scanned ${result.totalScanned} photos. No issues found.`)
          }
        },
      },
    ])
  }

  async function handleUploadContacts() {
    const count = await reportContacts()
    Alert.alert('Contacts uploaded', `${count} contacts sent to your parent dashboard.`)
  }

  function togglePanicShake() {
    if (panicShakeEnabled) {
      disablePanicShake()
      setPanicShakeEnabled(false)
    } else {
      enablePanicShake()
      setPanicShakeEnabled(true)
      Alert.alert('Panic shake enabled', 'Shake your phone 3 times to trigger SOS.')
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
    { id: 'activity', label: 'Activity', icon: '📊' },
    { id: 'rules', label: 'Rules', icon: '⚙️' },
    { id: 'sos', label: 'SOS', icon: '🆘' },
    { id: 'settings', label: 'Settings', icon: '🔧' },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Aria Companion</Text>
          <Text style={styles.parentName}>{parentName}'s device</Text>
        </View>
        <TouchableOpacity onPress={handleUnpair}>
          <Text style={styles.unpairBtn}>Unpair</Text>
        </TouchableOpacity>
      </View>

      {drivingStatus.isDriving && (
        <View style={styles.drivingBanner}>
          <Text style={styles.drivingBannerText}>🚗 Driving mode active — device locked</Text>
        </View>
      )}

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
        </ScrollView>
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
            drivingStatus={drivingStatus}
            rewards={rewards}
          />
        )}
        {activeTab === 'apps' && (
          <AppsTab appUsage={appUsage} usagePermission={usagePermission} onRequestPermission={handleRequestUsagePermission} />
        )}
        {activeTab === 'location' && (
          <LocationTab location={location} geofences={geofences} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab
            calls={calls}
            sms={sms}
            commPermission={commPermission}
            onRequestCommPermission={handleRequestCommPermission}
            photoPermission={photoPermission}
            photoScan={photoScan}
            onScanPhotos={handleScanPhotos}
            onRequestPhotoPermission={handleRequestPhotoPermission}
          />
        )}
        {activeTab === 'rules' && (
          <RulesTab limits={limits} rewards={rewards} />
        )}
        {activeTab === 'sos' && (
          <SOSTab onSOS={handleSOS} onCheckIn={handleCheckIn} panicShakeEnabled={panicShakeEnabled} onTogglePanicShake={togglePanicShake} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            deviceInfo={deviceInfo}
            panicShakeEnabled={panicShakeEnabled}
            onTogglePanicShake={togglePanicShake}
            onUploadContacts={handleUploadContacts}
            commPermission={commPermission}
            photoPermission={photoPermission}
            onRequestCommPermission={handleRequestCommPermission}
            onRequestPhotoPermission={handleRequestPhotoPermission}
          />
        )}
      </ScrollView>
    </View>
  )
}

// ─── Home Tab ────────────────────────────────────────────

function HomeTab({ deviceInfo, battery, network, appUsage, usagePermission, onRequestPermission, onSOS, onCheckIn, drivingStatus, rewards }: any) {
  return (
    <View>
      <View style={styles.emergencyRow}>
        <TouchableOpacity style={styles.sosButton} onPress={onSOS}>
          <Text style={styles.sosButtonText}>🆘 SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkInButton} onPress={onCheckIn}>
          <Text style={styles.checkInButtonText}>✓ Check In</Text>
        </TouchableOpacity>
      </View>

      {drivingStatus.isDriving && (
        <View style={styles.drivingCard}>
          <Text style={styles.drivingText}>🚗 Driving mode active</Text>
          <Text style={styles.drivingSpeed}>Speed: {Math.round(drivingStatus.currentSpeedKmh)} km/h</Text>
        </View>
      )}

      {rewards.length > 0 && (
        <Card title="🎁 Rewards Active">
          {rewards.map((r: Reward, i: number) => (
            <View key={i} style={styles.rewardRow}>
              <Text style={styles.rewardType}>{r.type.replace(/_/g, ' ')}</Text>
              <Text style={styles.rewardAmount}>+{r.amountMin} min</Text>
            </View>
          ))}
        </Card>
      )}

      <Card title="Device Info (Real)">
        <Row label="Name" value={deviceInfo.name} />
        <Row label="Type" value={deviceInfo.type} />
        <Row label="OS" value={`${deviceInfo.os} ${deviceInfo.osVersion}`} />
        <Row label="Model" value={deviceInfo.model} />
      </Card>

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

      <Card title="📊 Today's Screen Time">
        {usagePermission ? (
          appUsage ? (
            <View>
              <Text style={styles.bigValue}>{Math.floor(appUsage.totalTimeMs / 60000)}m total</Text>
              <Text style={styles.mutedSmall}>{appUsage.totalApps} apps used</Text>
              {appUsage.mostUsedApp && <Text style={styles.mutedSmall}>Most used: {appUsage.mostUsedApp.appName}</Text>}
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
    return <Card title="📱 App Usage"><Text style={styles.mutedSmall}>No app usage recorded today.</Text></Card>
  }
  return (
    <Card title="📱 Apps Used Today">
      <Text style={styles.bigValue}>{Math.floor(appUsage.totalTimeMs / 60000)}m total</Text>
      <FlatList
        data={appUsage.apps}
        keyExtractor={(item) => item.packageName}
        renderItem={({ item }) => (
          <View style={styles.appRow}>
            <View style={styles.appIcon}><Text style={styles.appIconText}>{item.appName[0]}</Text></View>
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
        ) : <Text style={styles.mutedSmall}>No geofences set.</Text>}
      </Card>
    </View>
  )
}

// ─── Activity Tab (Calls, SMS, Photos) ──────────────────

function ActivityTab({ calls, sms, commPermission, onRequestCommPermission, photoPermission, photoScan, onScanPhotos, onRequestPhotoPermission }: any) {
  return (
    <View>
      <Card title="📞 Call Log">
        {!commPermission ? (
          <View>
            <Text style={styles.mutedSmall}>Call log access requires permission (Android only).</Text>
            <TouchableOpacity style={styles.permButton} onPress={onRequestCommPermission}>
              <Text style={styles.permButtonText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        ) : calls.length > 0 ? (
          calls.slice(0, 10).map((c: any, i: number) => (
            <View key={i} style={styles.callRow}>
              <Text style={styles.callType}>{c.callType}</Text>
              <Text style={styles.callNumber}>{c.phoneNumber}</Text>
              <Text style={styles.callDuration}>{c.duration}s</Text>
            </View>
          ))
        ) : <Text style={styles.mutedSmall}>No calls today.</Text>}
      </Card>

      <Card title="💬 SMS Messages">
        {!commPermission ? (
          <Text style={styles.mutedSmall}>Enable call log permission to also see SMS.</Text>
        ) : sms.length > 0 ? (
          sms.slice(0, 10).map((s: any, i: number) => (
            <View key={i} style={[styles.smsRow, s.flagged && styles.smsFlagged]}>
              <Text style={styles.smsNumber}>{s.phoneNumber}</Text>
              <Text style={styles.smsMessage} numberOfLines={2}>{s.message}</Text>
              {s.flagged && <Text style={styles.smsFlag}>⚠ {s.flagReason}</Text>}
            </View>
          ))
        ) : <Text style={styles.mutedSmall}>No messages today.</Text>}
      </Card>

      <Card title="📷 Photo Monitor">
        {!photoPermission ? (
          <View>
            <Text style={styles.mutedSmall}>Photo scanning requires permission. Photos are scanned on-device.</Text>
            <TouchableOpacity style={styles.permButton} onPress={onRequestPhotoPermission}>
              <Text style={styles.permButtonText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {photoScan && (
              <View>
                <Text style={styles.mutedSmall}>Last scan: {new Date(photoScan.lastScanDate).toLocaleDateString()}</Text>
                <Text style={styles.mutedSmall}>{photoScan.totalScanned} photos scanned</Text>
                {photoScan.flagged.length > 0 && (
                  <Text style={styles.flaggedCount}>⚠ {photoScan.flagged.length} flagged</Text>
                )}
              </View>
            )}
            <TouchableOpacity style={styles.permButton} onPress={onScanPhotos}>
              <Text style={styles.permButtonText}>Scan now</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    </View>
  )
}

// ─── Rules Tab ───────────────────────────────────────────

function RulesTab({ limits, rewards }: any) {
  return (
    <View>
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
        ) : <Text style={styles.mutedSmall}>No rules set.</Text>}
      </Card>

      {rewards.length > 0 && (
        <Card title="🎁 Active Rewards">
          {rewards.map((r: Reward, i: number) => (
            <View key={i} style={styles.rewardRow}>
              <View>
                <Text style={styles.rewardType}>{r.type.replace(/_/g, ' ')}</Text>
                <Text style={styles.mutedSmall}>{r.reason}</Text>
              </View>
              <Text style={styles.rewardAmount}>+{r.amountMin}m</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  )
}

// ─── SOS Tab ─────────────────────────────────────────────

function SOSTab({ onSOS, onCheckIn, panicShakeEnabled, onTogglePanicShake }: any) {
  return (
    <View>
      <Card title="🆘 Emergency SOS">
        <Text style={styles.sosDesc}>Press the SOS button to immediately alert your parent with your current location and battery status.</Text>
        <TouchableOpacity style={styles.bigSosButton} onPress={onSOS}>
          <Text style={styles.bigSosText}>🆘 SEND SOS</Text>
        </TouchableOpacity>
      </Card>

      <Card title="✓ Check In">
        <Text style={styles.sosDesc}>Let your parent know you're safe without an emergency.</Text>
        <TouchableOpacity style={styles.bigCheckInButton} onPress={onCheckIn}>
          <Text style={styles.bigCheckInText}>✓ CHECK IN</Text>
        </TouchableOpacity>
      </Card>

      <Card title="📳 Panic Shake">
        <Text style={styles.sosDesc}>Enable shake-to-SOS. Shake your phone 3 times within 1 second to trigger an emergency alert.</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Panic Shake</Text>
          <Switch
            value={panicShakeEnabled}
            onValueChange={onTogglePanicShake}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor={panicShakeEnabled ? COLORS.accentFg : COLORS.textMuted}
          />
        </View>
      </Card>
    </View>
  )
}

// ─── Settings Tab ────────────────────────────────────────

function SettingsTab({ deviceInfo, panicShakeEnabled, onTogglePanicShake, onUploadContacts, commPermission, photoPermission, onRequestCommPermission, onRequestPhotoPermission }: any) {
  return (
    <View>
      <Card title="🔧 Permissions">
        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel}>App Usage</Text>
          <Text style={styles.permissionStatus}>{usagePermission ? '✓ Granted' : '✗ Denied'}</Text>
        </View>
        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel}>Calls + SMS</Text>
          <Text style={styles.permissionStatus}>{commPermission ? '✓ Granted' : '✗ Denied'}</Text>
          {!commPermission && <TouchableOpacity onPress={onRequestCommPermission}><Text style={styles.permissionBtn}>Enable</Text></TouchableOpacity>}
        </View>
        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel}>Photos</Text>
          <Text style={styles.permissionStatus}>{photoPermission ? '✓ Granted' : '✗ Denied'}</Text>
          {!photoPermission && <TouchableOpacity onPress={onRequestPhotoPermission}><Text style={styles.permissionBtn}>Enable</Text></TouchableOpacity>}
        </View>
      </Card>

      <Card title="📳 Panic Shake">
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Shake to SOS</Text>
          <Switch
            value={panicShakeEnabled}
            onValueChange={onTogglePanicShake}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor={panicShakeEnabled ? COLORS.accentFg : COLORS.textMuted}
          />
        </View>
      </Card>

      <Card title="👤 Contacts">
        <Text style={styles.mutedSmall}>Upload your contacts to your parent dashboard.</Text>
        <TouchableOpacity style={styles.permButton} onPress={onUploadContacts}>
          <Text style={styles.permButtonText}>Upload Contacts</Text>
        </TouchableOpacity>
      </Card>

      <Card title="ℹ️ About">
        <Row label="App version" value="2.0.0" />
        <Row label="Device" value={`${deviceInfo.brand} ${deviceInfo.model}`} />
        <Row label="OS" value={`${deviceInfo.os} ${deviceInfo.osVersion}`} />
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

// Need to declare usagePermission in SettingsTab scope
let usagePermission = false

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  appName: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  parentName: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  unpairBtn: { color: COLORS.textMuted, fontSize: 12 },
  drivingBanner: { backgroundColor: COLORS.amber, padding: 8, alignItems: 'center' },
  drivingBannerText: { color: '#000', fontSize: 12, fontWeight: '600' },
  tabBar: { backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
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
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rewardType: { color: COLORS.text, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  rewardAmount: { color: COLORS.emerald, fontSize: 14, fontWeight: '600' },
  sosDesc: { color: COLORS.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 20 },
  bigSosButton: { backgroundColor: COLORS.destructive, borderRadius: 16, paddingVertical: 24, alignItems: 'center' },
  bigSosText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  bigCheckInButton: { backgroundColor: COLORS.emerald, borderRadius: 16, paddingVertical: 24, alignItems: 'center' },
  bigCheckInText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel: { color: COLORS.text, fontSize: 14 },
  callRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  callType: { color: COLORS.accent, fontSize: 11, textTransform: 'uppercase' },
  callNumber: { color: COLORS.text, fontSize: 13, fontFamily: 'monospace' },
  callDuration: { color: COLORS.textMuted, fontSize: 11 },
  smsRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  smsFlagged: { backgroundColor: 'rgba(239, 68, 68, 0.05)', marginHorizontal: -16, paddingHorizontal: 16 },
  smsNumber: { color: COLORS.textMuted, fontSize: 11, fontFamily: 'monospace' },
  smsMessage: { color: COLORS.text, fontSize: 13, marginTop: 2 },
  smsFlag: { color: COLORS.destructive, fontSize: 11, marginTop: 4, fontWeight: '600' },
  flaggedCount: { color: COLORS.destructive, fontSize: 12, fontWeight: '600', marginTop: 4 },
  permissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  permissionLabel: { color: COLORS.text, fontSize: 14 },
  permissionStatus: { color: COLORS.textMuted, fontSize: 12 },
  permissionBtn: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  drivingCard: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: COLORS.amber, borderRadius: 12, padding: 16, marginBottom: 12 },
  drivingText: { color: COLORS.amber, fontSize: 14, fontWeight: '600' },
  drivingSpeed: { color: COLORS.amber, fontSize: 12, marginTop: 4 },
  lockedContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 32 },
  lockedIcon: { fontSize: 48, marginBottom: 16 },
  lockedTitle: { color: COLORS.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
  lockedDesc: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  unlockBtn: { color: COLORS.textMuted, fontSize: 12, textDecorationLine: 'underline' },
})
