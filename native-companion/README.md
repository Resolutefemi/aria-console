# Aria Companion — React Native App

Real device monitoring companion app for Aria Console. Built with **Expo** (React Native) so you can run it on your actual phone in 2 minutes — no compilation needed.

## Why React Native (not Flutter/Dart)?

- **Runs in this sandbox** — uses JS/TS, no Flutter SDK needed
- **One codebase, two platforms** — iOS + Android from the same code
- **Expo Go** — scan a QR code, app runs on your phone instantly
- **Same backend** — calls the exact same APIs as the web companion
- **Real native APIs** — accesses GPS, battery, device info, notifications that browsers can't

## What this app monitors (all REAL)

| Sensor | Source | Notes |
|--------|--------|-------|
| GPS location | `expo-location` | Real lat/lon, continuous tracking, background mode |
| Battery | `expo-battery` | Real %, charging status, live updates |
| Device info | `expo-device` | Real name, OS, brand, model |
| Network | `expo-network` | Real WiFi/Cellular, online/offline |
| Notifications | `expo-notifications` | Push notifications, even when app closed |
| Vibration | React Native built-in | Real haptic feedback on Ring command |

## What it CANNOT do (iOS/Android restrictions)

- ❌ List other installed apps (needs Screen Time API on iOS, UsageStatsManager on Android)
- ❌ Track real app usage outside this app
- ❌ Actually lock the phone OS (needs MDM/Family Controls enrollment)
- ❌ Read web browsing history from Chrome/Safari

For full monitoring, you'd need to add platform-specific native modules — see "Going Further" below.

## Quick Start (2 minutes)

### Prerequisites

- **Node.js 18+** and **npm** or **bun**
- **Expo Go app** on your phone ([iOS App Store](https://apps.apple.com/app/expo-go/id982107779) / [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Your phone and computer on the **same WiFi network**

### Step 1 — Install dependencies

```bash
cd native-companion
npm install
# or: bun install
```

### Step 2 — Set your backend URL

Edit `constants/config.ts` and replace the URL with your Vercel deployment:

```typescript
export const API_BASE_URL = 'https://your-actual-app.vercel.app'
```

### Step 3 — Start the dev server

```bash
npm start
# or: npx expo start
```

This opens the Expo DevTools in your browser.

### Step 4 — Run on your phone

1. Open the **Expo Go** app on your phone
2. Scan the **QR code** shown in the terminal/browser
3. The app loads on your phone in ~10 seconds

### Step 5 — Pair it

1. On your computer/parent device, open your web app at `/pair`
2. Generate a 6-digit code
3. On your phone (in the Aria Companion app), enter the code
4. Tap **Pair Device**
5. Your phone now reports real GPS, battery, and device info to the dashboard

## Project Structure

```
native-companion/
├── app/                          # Screens (Expo Router)
│   ├── _layout.tsx               # Root layout
│   ├── index.tsx                 # Pairing screen (entry)
│   └── paired.tsx                # Main monitoring screen
├── services/
│   ├── api.ts                    # Backend API calls
│   └── device.ts                 # Native device APIs (GPS, battery, etc.)
├── constants/
│   └── config.ts                 # Backend URL + theme colors
├── app.json                      # Expo config (permissions, app name)
├── package.json
└── tsconfig.json
```

## How it works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Aria Companion │     │   Your Vercel   │     │  Parent Web     │
│  (this app)     │     │   Backend       │     │  Dashboard      │
│  on phone       │────►│   (Next.js)     │◄────│  (browser)      │
│                 │     │                 │     │                 │
│  Reports:       │     │  Stores in:     │     │  Shows:         │
│  - GPS location │     │  - Supabase     │     │  - Real-time    │
│  - Battery      │     │    Postgres     │     │    location     │
│  - Device info  │     │                 │     │  - Battery %    │
│  - Heartbeat    │     │                 │     │  - Device info  │
│                 │◄────│                 │────►│                 │
│  Receives:      │     │                 │     │  Sends:         │
│  - Lock command │     │                 │     │  - Lock         │
│  - Ring command │     │                 │     │  - Ring         │
│  - Messages     │     │                 │     │  - Locate       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Going Further — Full Native Monitoring

To monitor **other apps** and **actually lock the phone**, you need platform-specific native code. Here's the path:

### iOS (Screen Time API)

1. Add `FamilyControls` capability to the app
2. Request `FamilyControls` authorization
3. Use `DeviceActivityMonitor` to track app usage
4. Use `ManagedSettingsStore` to block apps / lock device
5. Requires Apple Developer Program ($99/year) and App Store review

### Android (UsageStatsManager + MDM)

1. Request `PACKAGE_USAGE_STATS` permission (special access)
2. Use `UsageStatsManager` to query app usage
3. Use `DevicePolicyManager` to lock device / block apps
4. Requires setting up a Device Admin app

### Adding to this project

```bash
# Install platform-specific packages
npx expo install expo-screen-time expo-device-policy
```

Then create native modules in `modules/` to bridge to Swift/Kotlin. This is advanced — start with the web companion, then upgrade to native once you've validated the concept.

## Building for App Store / Play Store

When ready to publish:

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

This produces `.ipa` / `.aab` files you submit to the App Store / Play Store.

## Troubleshooting

**App can't connect to backend**
- Make sure `API_BASE_URL` in `constants/config.ts` points to your Vercel URL (not localhost)
- Make sure your phone has internet access

**GPS not working**
- Make sure you granted location permission
- On iOS: Settings → Aria Companion → Location → Always
- On Android: Settings → Apps → Aria Companion → Permissions → Location → Allow all the time

**Notifications not arriving**
- Make sure you granted notification permission
- On iOS: Settings → Aria Companion → Notifications → Allow
- On Android: Settings → Apps → Aria Companion → Notifications → On

**Background tracking stops**
- iOS: Make sure Background App Refresh is on
- Android: Disable battery optimization for the app
- Both: Use EAS Build to create a standalone app (Expo Go has limitations)

## License

MIT
