import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reloading can create multiple PrismaClient
 * instances, exhausting database connections. We cache the client on
 * globalThis to prevent this.
 *
 * In production, we create a new client per server process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
