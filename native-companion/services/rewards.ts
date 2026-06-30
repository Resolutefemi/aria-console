// ═══════════════════════════════════════════════════════════════
// Reward System — parent can grant extra screen time
// ═══════════════════════════════════════════════════════════════

import { reportData } from './api'
import { getStoredDeviceId } from './api'

export type Reward = {
  id: string
  type: 'EXTRA_SCREEN_TIME' | 'APP_UNLOCK' | 'BEDTIME_EXTENSION' | 'WEEKEND_BONUS'
  amountMin: number  // extra minutes
  reason: string  // "Good grades", "Finished homework", etc.
  grantedBy: string  // parent user ID
  grantedAt: string
  expiresAt?: string
  status: 'ACTIVE' | 'EXPIRED' | 'USED'
}

const REWARDS_KEY = 'aria_rewards'

/**
 * Get all active rewards.
 */
export async function getActiveRewards(): Promise<Reward[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem(REWARDS_KEY)
    if (!stored) return []
    const rewards: Reward[] = JSON.parse(stored)
    // Filter out expired
    const now = new Date()
    return rewards.filter((r) => {
      if (r.expiresAt && new Date(r.expiresAt) < now) return false
      return r.status === 'ACTIVE'
    })
  } catch {
    return []
  }
}

/**
 * Apply a reward to the screen time limits.
 * Returns the extra minutes available.
 */
export async function getBonusScreenTimeMin(): Promise<number> {
  const rewards = await getActiveRewards()
  return rewards
    .filter((r) => r.type === 'EXTRA_SCREEN_TIME' || r.type === 'WEEKEND_BONUS')
    .reduce((sum, r) => sum + r.amountMin, 0)
}

/**
 * Check if a specific app is unlocked via reward.
 */
export async function isAppUnlockedViaReward(appId: string): Promise<boolean> {
  const rewards = await getActiveRewards()
  return rewards.some((r) => r.type === 'APP_UNLOCK')
}

/**
 * Check if bedtime should be extended.
 */
export async function getBedtimeExtensionMin(): Promise<number> {
  const rewards = await getActiveRewards()
  return rewards
    .filter((r) => r.type === 'BEDTIME_EXTENSION')
    .reduce((sum, r) => sum + r.amountMin, 0)
}

/**
 * Sync rewards from the parent dashboard.
 * Called periodically to check for new rewards.
 */
export async function syncRewards(): Promise<void> {
  const deviceId = await getStoredDeviceId()
  if (!deviceId) return

  try {
    const res = await fetch(`${require('@/constants/config').API_BASE_URL}/api/device/${deviceId}/rewards`)
    if (!res.ok) return
    const data = await res.json()
    const rewards: Reward[] = data.rewards || []

    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    await AsyncStorage.setItem(REWARDS_KEY, JSON.stringify(rewards))
  } catch {}
}

/**
 * Mark a reward as used.
 */
export async function useReward(rewardId: string): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem(REWARDS_KEY)
    if (!stored) return
    const rewards: Reward[] = JSON.parse(stored)
    const reward = rewards.find((r) => r.id === rewardId)
    if (reward) {
      reward.status = 'USED'
      await AsyncStorage.setItem(REWARDS_KEY, JSON.stringify(rewards))
    }
  } catch {}
}
