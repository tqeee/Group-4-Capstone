import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Reuse one client across hot reloads in dev; Next.js re-evaluates modules on
// every change and would otherwise exhaust the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
