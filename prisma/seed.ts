/**
 * Aria Console — Database seed script
 *
 * Run with: bun run db:seed
 *
 * Populates the database with realistic-looking sample data:
 * - 8 devices (phones, speakers, watches, tablets, headphones)
 * - 7 voice commands across those devices
 * - 12 hours of energy readings
 * - 6 security alerts of varying severity
 * - 1 admin user
 */
import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding Aria Console database...')

  // Clear existing data (order matters for FK constraints)
  await db.auditLog.deleteMany()
  await db.securityAlert.deleteMany()
  await db.energyReading.deleteMany()
  await db.voiceCommand.deleteMany()
  await db.device.deleteMany()
  await db.user.deleteMany()

  console.log('  ✓ Cleared existing data')

  // Seed content added in subsequent commits
  console.log('🌱 Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
