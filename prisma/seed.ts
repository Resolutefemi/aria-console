/**
 * Aria Console — Database seed script (REAL DATA ONLY)
 *
 * Run with: bun run db:seed
 *
 * This script does NOT create any mock data. It only:
 * - Clears all existing data (for a fresh start)
 *
 * Real users are created automatically when they sign up via Supabase Auth
 * (see /api/auth/sync). Real devices are created when paired via the
 * companion app (see /api/pairing/verify). All other data (screen time,
 * location, web history) is reported by real companion apps.
 *
 * The dashboard shows ONLY real data from real paired devices.
 */
import { db } from '../src/lib/db'

async function main() {
  console.log('🧹 Clearing all data from database (real data only mode)...')

  // Clear in dependency order (FK constraints)
  await db.auditLog.deleteMany()
  await db.deviceCommand.deleteMany()
  await db.parentalRule.deleteMany()
  await db.webHistoryEntry.deleteMany()
  await db.locationPing.deleteMany()
  await db.screenTimeSession.deleteMany()
  await db.deviceApp.deleteMany()
  await db.devicePairing.deleteMany()
  await db.securityAlert.deleteMany()
  await db.energyReading.deleteMany()
  await db.voiceCommand.deleteMany()
  await db.device.deleteMany()
  await db.user.deleteMany()

  console.log('  ✓ All data cleared')
  console.log('')
  console.log('🌱 Database is now empty. To populate with real data:')
  console.log('  1. Sign up at /login (creates a real user via Supabase Auth)')
  console.log('  2. Pair a device at /pair (creates a real device via companion app)')
  console.log('  3. Use the companion app at /companion to report real activity')
  console.log('  4. Use the voice assistant to ask about your devices')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
