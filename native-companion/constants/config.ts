// ═══════════════════════════════════════════════════════════════
// Aria Companion — Configuration
// ═══════════════════════════════════════════════════════════════
// Point this to your deployed Vercel URL (NOT localhost — that won't
// work on a physical phone).
//
// After deploying the web app to Vercel, replace this with your URL:
//   export const API_BASE_URL = 'https://your-app.vercel.app'
// ═══════════════════════════════════════════════════════════════

export const API_BASE_URL = 'https://aria-console.vercel.app'

// API endpoints (all relative to API_BASE_URL)
export const API = {
  pairingCreate: `${API_BASE_URL}/api/pairing/create`,
  pairingVerify: `${API_BASE_URL}/api/pairing/verify`,
  deviceReport: `${API_BASE_URL}/api/device/report`,
  deviceCommands: `${API_BASE_URL}/api/device/commands`,
}

// Polling intervals (milliseconds)
export const POLLING = {
  COMMANDS: 5000,      // Check for new commands every 5s
  HEARTBEAT: 30000,    // Send heartbeat every 30s
  LOCATION: 60000,     // Report location every 60s (also on significant movement)
}

// App theme colors (matches the web dashboard)
export const COLORS = {
  background: '#0a0a0a',
  card: '#141414',
  border: '#262626',
  text: '#ededed',
  textMuted: '#737373',
  accent: '#f0a04b',
  accentFg: '#0a0a0a',
  destructive: '#ef4444',
  emerald: '#10b981',
  amber: '#f59e0b',
  sky: '#38bdf8',
}
