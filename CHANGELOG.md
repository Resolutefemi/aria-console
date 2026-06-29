# Changelog

All notable changes to Aria Console are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Real-time WebSocket updates (instead of polling)
- Multi-user authentication via Supabase Auth
- Customizable dashboard layout (drag-and-drop widgets)
- Dark/light theme toggle (tokens are already in place)
- Mobile responsive sidebar (slide-in drawer)
- Push notification support (PWA)

## [0.4.2] — 2026-06-29

### Added
- Device detail drawer with recent voice commands
- Device type breakdown component
- Permissions posture section (separated from security alerts)
- Keyboard shortcuts help dialog (Shift + ?)
- CSV export for security alerts
- Audit log API endpoints (GET, POST)
- Audit log entries for alert acknowledge/dismiss actions
- Toast notifications for alert actions
- Device filters (status pills, room dropdown, free-text search)
- 22 additional devices in seed (D-009 through D-030)
- Supabase SQL schema with 7 migrations
- Comprehensive README, CONTRIBUTING, CHANGELOG

### Changed
- Dashboard grid restructured to 3 columns on XL screens
- Stats cards now fetch from /api/stats/overview (was hardcoded)
- Device monitoring now fetches from /api/devices (was hardcoded)
- Voice interaction now fetches from /api/voice/* endpoints
- Energy usage now fetches from /api/energy
- Security alerts now fetch from /api/security/alerts

### Fixed
- Duplicate useSyncExternalStore import in top-bar
- Non-existent Display icon (replaced with Monitor)
- Prisma schema missing bidirectional securityAlerts relation on Device
- .env.example was being blocked by overly broad .env* gitignore pattern

## [0.4.1] — 2026-06-28

### Added
- Collapsible design principles panel
- Footer with build version and legal links
- Live sync indicator with pulsing dot

## [0.4.0] — 2026-06-28

### Added
- Initial dashboard with sidebar, top bar, stats cards
- Device monitoring with 8 devices
- Voice interaction with animated waveform and command log
- Energy usage with area chart and bar chart
- Security alerts with severity-ordered feed
- Warm dark theme (amber accent, earthy palette)
- Custom scrollbar styling
- Waveform, pulse, and glow animations
- Accessible focus rings
