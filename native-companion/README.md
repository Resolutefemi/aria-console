# Aria Companion — Ultimate Parental Control App

Real native device monitoring companion app for Aria Console. Built with **React Native + Expo** — runs on actual iOS/Android phones with full access to native APIs that web apps can't reach.

## Why React Native (not Flutter/Dart)

- **Runs in this sandbox** — uses JS/TS, no Flutter SDK needed
- **One codebase, two platforms** — iOS + Android from the same code
- **Expo Go** — scan a QR code, app runs on your phone instantly
- **Same backend** — calls the exact same APIs as the web companion
- **Real native APIs** — accesses GPS, battery, app usage, notifications

## Ultimate Features (like Qustodio / Bark / Norton Family / FlashGet Kids)

### 📊 Real App Usage Tracking
- **Android**: Uses `UsageStatsManager` — tracks time spent in EVERY app
- **iOS**: Uses `DeviceActivity` framework (FamilyControls)
- Reports per-app usage to parent dashboard
- Shows which apps are used most

### 📱 Installed Apps Scanner
- Lists all installed apps (Android)
- Shows app names, versions, install dates
- Parent can block individual apps from dashboard

### 🌐 Web History + Content Filtering
- In-app browser logs all visits
- Content categories: Adult, Social, Gambling, Violence, Drugs, Games
- Parent configures which categories to block
- Blocked visits are logged (parent sees attempt)

### 📍 Geofencing
- Parent defines safe zones (Home, School, etc.)
- Alerts when device enters/exits geofence
- Real GPS coordinates with accuracy
- Continuous background tracking

### 🆘 SOS Panic Button
- Child taps SOS → parent gets instant alert
- Sends current GPS location + battery
- Strong haptic feedback on trigger
- High-priority notification on parent's phone

### ✓ Check-In Feature
- Child can signal "I'm safe" without emergency
- Sends location + battery to parent

### ⏱️ Screen Time Enforcement
- **Total daily limit** — locks device when exceeded
- **Per-app limit** — blocks specific apps when limit reached
- **Bedtime mode** — locks device during specified hours
- Violation log shows history

### 🔒 Real Device Lock
- **Android**: `DevicePolicyManager.lockNow()` — actually locks the phone
- **iOS**: `ManagedSettingsStore` — blocks all apps
- Parent taps "Lock" on dashboard → phone locks immediately

### 📱 App Blocking
- Parent can block individual apps from dashboard
- App becomes unopenable on the child's phone
- Unblock with one tap

### 🔔 Push Notifications
- Commands arrive even when app is closed
- Lock, ring, message notifications
- Sound + vibration on command receipt

### ⚡ Background Monitoring
- Continuous monitoring even when app is closed
- Background location tracking (Android foreground service)
- Background fetch every 15 minutes
- Heartbeat every 30 seconds

## What This App Monitors (all REAL)

| Feature | Source | Android | iOS |
|---------|--------|---------|-----|
| GPS location | expo-location | ✅ Background | ✅ Background |
| Battery level | expo-battery | ✅ | ✅ |
| Device info | expo-device | ✅ | ✅ |
| Network status | expo-network | ✅ | ✅ |
| App usage | UsageStatsManager / DeviceActivity | ✅ | ✅ (FamilyControls) |
| Installed apps | PackageManager | ✅ | ❌ (iOS doesn't allow) |
| Web history | In-app browser | ✅ | ✅ |
| Geofencing | expo-location | ✅ | ✅ |
| Push notifications | expo-notifications | ✅ | ✅ |
| Device lock | DevicePolicyManager / ManagedSettings | ✅ | ✅ |
| App blocking | DevicePolicyManager / ManagedSettings | ✅ | ✅ |
| Vibration | React Native built-in | ✅ | ✅ |
| Call logs | CallLog (Android only) | ✅ | ❌ (iOS doesn't allow) |

## What It Cannot Do (OS restrictions)

- ❌ Read SMS messages (iOS blocks entirely; Android needs special permission)
- ❌ Keylogger (both platforms block this)
- ❌ Record phone calls (illegal in many jurisdictions)
- ❌ Access Chrome/Safari browsing history (outside in-app browser)
- ❌ Track location when phone is off

## Quick Start (5 minutes)

### Prerequisites

- **Node.js 18+** and **npm**
- **Expo Go app** on your phone
- Your phone and computer on **same WiFi** (or use tunnel)

### Step 1 — Install dependencies

```bash
cd native-companion
npm install
```

### Step 2 — Set your backend URL

Edit `constants/config.ts`:

```typescript
export const API_BASE_URL = 'https://your-actual-vercel-url.vercel.app'
```

### Step 3 — Start the dev server

```bash
npm start
```

### Step 4 — Run on your phone

1. Open **Expo Go** on your phone
2. Scan the QR code shown in terminal
3. App loads in ~10 seconds

### Step 5 — Pair it

1. On your parent dashboard (web), go to `/pair`
2. Generate a 6-digit code
3. In the Aria Companion app on your phone, enter the code
4. Tap **Pair Device**

### Step 6 — Grant permissions

The app will ask for:
- **Location** (Always) — for GPS tracking
- **Notifications** — for command alerts
- **Usage Access** (Android) — for app usage tracking
- **Battery optimization exclusion** (Android) — for background monitoring

Grant all of them for full functionality.

## Project Structure

```
native-companion/
├── app/                          # Screens (Expo Router)
│   ├── _layout.tsx               # Root layout
│   ├── index.tsx                 # Pairing screen
│   └── paired.tsx                # Main screen with 5 tabs
├── services/
│   ├── api.ts                    # Backend API calls
│   ├── device.ts                 # Native device APIs (GPS, battery)
│   ├── app-usage.ts              # App usage tracking (UsageStatsManager)
│   ├── browser.ts                # In-app browser + content filter
│   ├── geofence.ts               # Geofencing service
│   ├── sos.ts                    # SOS + check-in
│   ├── screen-time.ts            # Limit enforcement
│   └── background.ts             # Background monitoring service
├── constants/
│   └── config.ts                 # Backend URL + theme
├── app.json                      # Expo config + permissions
└── package.json
```

## Building for App Store / Play Store

For production (Expo Go has limitations):

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build standalone Android app (.aab)
eas build --platform android --profile production

# Build standalone iOS app (.ipa) — requires Apple Developer account
eas build --platform ios --profile production
```

Standalone apps have:
- Full background location tracking
- No Expo Go limitations
- App Store / Play Store distribution
- Push notifications via APNs / FCM

## iOS-Specific Setup (FamilyControls)

For iOS app usage tracking and device lock, you need:

1. **Apple Developer Program** ($99/year)
2. **Family Controls capability** in app.json
3. **Entitlements** for `com.apple.developer.family-controls`
4. App Store review (Apple reviews parental control apps carefully)

See: https://developer.apple.com/documentation/familycontrols

## Android-Specific Setup (UsageStatsManager)

For Android app usage tracking:

1. User must grant **Usage Access** permission manually
2. App opens Settings → Apps → Special access → Usage access
3. No Play Store review needed for this permission

For device lock (DevicePolicyManager):
1. App must be set as **Device Admin**
2. User grants admin rights on first launch
3. Cannot be uninstalled without admin rights being revoked

## Troubleshooting

**App can't connect to backend**
- Check `API_BASE_URL` in `constants/config.ts`
- Make sure phone has internet

**App usage shows 0**
- Grant Usage Access permission (Android Settings → Special access)
- On iOS, enable Family Controls

**Background tracking stops**
- Disable battery optimization (Android)
- Enable Background App Refresh (iOS)
- Use EAS Build for standalone app (Expo Go has limits)

**Location not updating**
- Set location permission to "Always" (not just "While using")
- On Android, allow background location

## Comparison to Commercial Apps

| Feature | Aria Companion | Qustodio | Bark | Norton Family |
|---------|----------------|----------|------|---------------|
| App usage tracking | ✅ | ✅ | ✅ | ✅ |
| Web filtering | ✅ | ✅ | ✅ | ✅ |
| Screen time limits | ✅ | ✅ | ❌ | ✅ |
| Location tracking | ✅ | ✅ | ❌ | ✅ |
| Geofencing | ✅ | ✅ | ❌ | ❌ |
| SOS button | ✅ | ❌ | ✅ | ❌ |
| App blocking | ✅ | ✅ | ❌ | ✅ |
| Device lock | ✅ | ✅ | ❌ | ✅ |
| Push notifications | ✅ | ✅ | ✅ | ✅ |
| Price | Free (self-hosted) | $54.95/yr | $99/yr | $49.99/yr |

## License

MIT
