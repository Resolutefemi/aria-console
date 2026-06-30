// ═══════════════════════════════════════════════════════════════
// Social Media Monitor — Bark-style keyword alerts
// ═══════════════════════════════════════════════════════════════
// Scans notifications from social apps for concerning keywords.
// When a flagged keyword is detected, alerts the parent dashboard.
// ═══════════════════════════════════════════════════════════════

import { Platform, NativeModules } from 'react-native'
import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type SocialAlert = {
  id: string
  app: string  // 'Instagram', 'WhatsApp', 'TikTok', etc.
  category: AlertCategory
  keyword: string
  context: string  // surrounding text
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
}

export type AlertCategory =
  | 'CYBERBULLYING'
  | 'DRUGS'
  | 'VIOLENCE'
  | 'SELF_HARM'
  | 'EXPLICIT'
  | 'PREDATOR'
  | 'ALCOHOL'
  | 'GAMBLING'
  | 'DEPRESSION'
  | 'ANXIETY'

// Flagged keyword database (extends the SMS one)
const KEYWORDS: Record<AlertCategory, string[]> = {
  CYBERBULLYING: [
    'hate you', 'kill yourself', 'nobody likes you', 'ugly', 'stupid',
    'loser', 'pathetic', 'worthless', 'everyone hates you', 'freak',
    'weirdo', 'disgusting', 'shut up', 'go away', 'leave me alone',
  ],
  DRUGS: [
    'weed', 'cocaine', 'heroin', 'pills', 'mdma', 'lsd', 'shrooms',
    'deal', 'dealer', 'high on', 'stoned', 'rolling', 'trip',
    'edibles', 'gummies', 'vape', 'juul', 'dab',
  ],
  VIOLENCE: [
    'fight', 'beat up', 'punch', 'knife', 'gun', 'shoot', 'kill',
    'blood', 'weapon', 'hurt him', 'hurt her', 'attack', 'threat',
  ],
  SELF_HARM: [
    'cut myself', 'hurt myself', 'suicide', 'kill myself',
    'end it all', 'no reason to live', 'depressed', 'want to die',
    'self harm', 'razor', 'blades', 'burns on',
  ],
  EXPLICIT: [
    'sex', 'nude', 'nudes', 'send pic', 'send picture', 'hookup',
    'tinder', 'onlyfans', 'snapchat me', 'dick pic', 'boobs',
    'naked', 'bra', 'panties',
  ],
  PREDATOR: [
    'meet up', 'where do you live', 'your address', "don't tell your parents",
    'secret between us', 'i love you', 'send me pics', 'how old are you',
    'are you alone', 'parents home', 'skip school',
  ],
  ALCOHOL: [
    'drunk', 'beer', 'vodka', 'whiskey', 'tequila', 'wine',
    'drinking', 'party at', 'got wasted', 'buzzed', 'tipsy',
    'shot of', 'chug', 'beer pong',
  ],
  GAMBLING: [
    'bet', 'casino', 'poker', 'lottery', 'sportsbook', 'draftkings',
    'fan duel', 'gambling', 'jackpot', 'slots',
  ],
  DEPRESSION: [
    'sad all the time', 'empty inside', 'no point', 'give up',
    "can't do this", 'tired of life', 'hopeless', 'alone',
    'nobody cares', 'broken',
  ],
  ANXIETY: [
    'panic attack', 'anxiety', 'stress', 'overwhelmed', 'freaking out',
    'can\'t breathe', 'heart racing', 'scared', 'nervous',
  ],
}

// Severity mapping
const SEVERITY: Record<AlertCategory, 'low' | 'medium' | 'high' | 'critical'> = {
  SELF_HARM: 'critical',
  PREDATOR: 'critical',
  CYBERBULLYING: 'high',
  DRUGS: 'high',
  VIOLENCE: 'high',
  EXPLICIT: 'medium',
  ALCOHOL: 'medium',
  DEPRESSION: 'high',
  ANXIETY: 'medium',
  GAMBLING: 'low',
}

/**
 * Scan a notification text for flagged keywords.
 * Returns alerts for each match.
 */
export function scanContent(
  text: string,
  app: string
): SocialAlert[] {
  const lower = text.toLowerCase()
  const alerts: SocialAlert[] = []

  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Extract context (50 chars before and after the keyword)
        const idx = lower.indexOf(kw)
        const start = Math.max(0, idx - 50)
        const end = Math.min(text.length, idx + kw.length + 50)
        const context = text.slice(start, end)

        alerts.push({
          id: `${app}-${category}-${Date.now()}-${Math.random()}`,
          app,
          category: category as AlertCategory,
          keyword: kw,
          context,
          severity: SEVERITY[category as AlertCategory],
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  return alerts
}

/**
 * Start monitoring notifications from social apps (Android only).
 * Requires notification listener permission.
 */
export async function startSocialMonitor(): Promise<() => void> {
  if (Platform.OS !== 'android') return () => {}

  try {
    const { NotificationListener } = NativeModules
    if (!NotificationListener) return () => {}

    // Request notification listener permission
    const granted = await NotificationListener.requestPermission()
    if (!granted) return () => {}

    // Subscribe to notifications
    const subscription = NotificationListener.addListener((notification: any) => {
      const text = `${notification.title || ''} ${notification.text || ''}`
      const app = notification.packageName || 'Unknown'

      const alerts = scanContent(text, app)
      if (alerts.length > 0) {
        reportSocialAlerts(alerts)
      }
    })

    return () => {
      subscription.remove()
    }
  } catch (e) {
    console.error('Failed to start social monitor:', e)
    return () => {}
  }
}

/**
 * Report social alerts to the parent dashboard.
 */
async function reportSocialAlerts(alerts: SocialAlert[]): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return

  for (const alert of alerts) {
    await reportData(deviceId, 'SOCIAL_ALERT', alert)
  }
}

/**
 * Get the list of flagged keywords (for display in settings).
 */
export function getFlaggedKeywords(): Record<AlertCategory, string[]> {
  return KEYWORDS
}

/**
 * Add a custom keyword to monitor.
 */
export function addCustomKeyword(category: AlertCategory, keyword: string): void {
  KEYWORDS[category].push(keyword.toLowerCase())
}
