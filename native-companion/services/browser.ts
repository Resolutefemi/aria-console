// ═══════════════════════════════════════════════════════════════
// Browser Service — in-app browser with web history + content filter
// ═══════════════════════════════════════════════════════════════

import * as WebBrowser from 'expo-web-browser'
import { API_BASE_URL } from '@/constants/config'
import { getStoredDeviceId } from './api'
import { reportData } from './api'

// Categories that can be blocked
export const CONTENT_CATEGORIES = {
  ADULT: ['porn', 'xxx', 'adult', 'sex', 'nude', 'nsfw'],
  SOCIAL: ['facebook.com', 'instagram.com', 'tiktok.com', 'twitter.com', 'x.com', 'snapchat.com'],
  GAMBLING: ['bet', 'casino', 'poker', 'gambling', 'lottery'],
  VIOLENCE: ['gore', 'violence', 'graphic'],
  DRUGS: ['drugs', 'cannabis', 'marijuana'],
  GAMES: ['games', 'gaming', 'steam', 'epicgames'],
  ENTERTAINMENT: ['youtube.com', 'netflix.com', 'twitch.tv', 'disney'],
}

export type WebCategory = keyof typeof CONTENT_CATEGORIES

export type WebHistoryEntry = {
  url: string
  title: string
  category: WebCategory | 'SAFE'
  blocked: boolean
  visitedAt: string
}

/**
 * Open a URL in the in-app browser and log it to the parent dashboard.
 * If the URL matches a blocked category, it's blocked and reported.
 */
export async function openUrl(
  url: string,
  blockedCategories: WebCategory[] = []
): Promise<{ opened: boolean; blocked: boolean; reason?: string }> {
  // Validate URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }

  // Check if URL should be blocked
  const category = categorizeUrl(url)
  const blocked = blockedCategories.includes(category)

  // Always log the visit (even blocked ones — parent should know)
  await logWebVisit(url, category, blocked)

  if (blocked) {
    return {
      opened: false,
      blocked: true,
      reason: `Blocked: ${category} content is filtered`,
    }
  }

  // Open in in-app browser
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: '#0a0a0a',
      controlsColor: '#f0a04b',
      enableBarCollapsing: true,
      showTitle: true,
    })
    return { opened: true, blocked: false }
  } catch (e: any) {
    return { opened: false, blocked: false, reason: e.message }
  }
}

/**
 * Categorize a URL based on its domain.
 */
export function categorizeUrl(url: string): WebCategory | 'SAFE' {
  const lower = url.toLowerCase()
  for (const [category, keywords] of Object.entries(CONTENT_CATEGORIES)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category as WebCategory
    }
  }
  return 'SAFE'
}

/**
 * Log a web visit to the parent dashboard.
 */
async function logWebVisit(
  url: string,
  category: WebCategory | 'SAFE',
  blocked: boolean
): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return

  await reportData(deviceId, 'WEB_HISTORY', {
    url,
    title: extractTitleFromUrl(url),
    category,
    isBlocked: blocked,
  })
}

function extractTitleFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '')
  } catch {
    return url
  }
}

/**
 * Get the device's browsing history (from this in-app browser only).
 * Note: Cannot access Chrome/Safari history — only what was visited
 * through this app's browser.
 */
export async function getBrowserHistory(): Promise<WebHistoryEntry[]> {
  // This would read from local storage where we cached visits
  // For now, returns empty — the backend has the full history
  return []
}
