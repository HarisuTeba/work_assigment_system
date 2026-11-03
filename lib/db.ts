import { PrismaClient } from '@prisma/client';

// Satu instance Prisma per proses; saat dev, simpan di global agar tidak bocor saat HMR.
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.prisma = db;
