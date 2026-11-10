# Aria Console — Mobile Parent App

Flutter/Dart parent-side app for **Aria Console**, the voice-controlled
device management platform. It pairs with the **Aria Companion** agent on
phones, tablets, TVs and laptops, and gives the parent full remote
oversight — on par with FlashGet Kids and beyond.

Built by **Resolute Femi (Ariyo Oluwafemi Stephen)**.

## Features

| Area | What you can do |
| --- | --- |
| **Auth** | Sign in / sign up — accounts are created confirmed, no email step (same flow as the web console) |
| **Pairing** | Generate a 6-digit code + QR; the device pairs in realtime — the screen closes itself when linked |
| **Dashboard** | Live stats: devices online, open alerts, phones vs. computers, recent alerts |
| **Devices** | All linked device types (phone, tablet, TV, laptop, watch, smart home) with status, battery, last-seen |
| **Remote commands** | Lock / unlock, ring, screenshot request, locate now, send on-screen message, brightness pause, connectivity off, app block, time limits — all synced with the web console |
| **App control** | Per-app daily limits and one-tap block/unblock with over-limit highlighting |
| **Location** | Live OpenStreetMap view (no API key), accuracy circle, location history, on-demand locate |
| **Screen time** | Today's total, 7-day bar chart, top apps today, total daily limits and bedtime schedules |
| **Web monitoring** | Browsing history with search + one-tap domain blocking via content-filter rules |
| **Rules engine** | App block, app time limit, screen time limit, bedtime, content filter, geofence — create/activate/delete |
| **Alerts** | Realtime security alerts with severity filters, acknowledge and resolve |
| **Theming** | White + purple in light mode, black + purple in dark mode — identical palette to the web console, system/light/dark selector |

Everything is backed by the same Supabase project as the web console, so
state is shared live: commands sent from the web appear in the app's
command history, alerts arrive over realtime, and RLS keeps every parent
scoped to their own data.

## Project layout

```
mobile-app/
├── lib/
│   ├── main.dart                  # entry, Supabase init, auth gate
│   ├── core/theme.dart            # white+purple / black+purple themes
│   ├── core/utils.dart            # formatters, icons, colors
│   ├── data/models.dart           # typed models for every table
│   ├── data/supabase_service.dart # auth, CRUD, commands, realtime
│   ├── state/app_state.dart       # global state + realtime wiring
│   ├── screens/                   # auth, dashboard, devices, detail, alerts, settings, pairing
│   └── widgets/                   # shared cards, charts, badges
└── pubspec.yaml
```

## Building the APK

There is nothing to configure — a GitHub Actions workflow
(`.github/workflows/mobile-app-apk.yml`) builds a signed release APK on
every push that touches `mobile-app/**` and attaches it to the
`mobile-latest` GitHub Release. Platform folders (`android/`) are
generated in CI with `flutter create .` so the repo stays lean.

To build locally instead:

```bash
cd mobile-app
flutter create . --platforms android --org dev.ariaconsole --project-name aria_console_mobile
flutter pub get
flutter analyze
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk
```

## Pairing flow (parent ↔ companion)

1. In the parent app: **Devices → Pair device**, pick the device type,
   generate the code.
2. On the target device, install & open **Aria Companion**, tap
   *Pair with parent*, enter the 6-digit code (or scan the QR).
3. The parent app detects the pairing over Supabase Realtime and
   refreshes the device list automatically.

> Roles: controlling devices requires the signed-in account to be
> ADMIN or OPERATOR (RLS). The first account created on the project
> is ADMIN automatically.
