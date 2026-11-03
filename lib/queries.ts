import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from './db';

export const includeOrder = {
  customer: true,
  marketing: true,
  unit: true,
  silabus: true,
  rakItem: { orderBy: { id: 'asc' } },
  quotation: { orderBy: { versi: 'desc' } },
  po: true,
  spk: { include: { approver1: true, approver2: true } },
  jadwalLog: { orderBy: { dibuatPada: 'desc' }, include: { oleh: true } },
  pengajar: { orderBy: { dibuatPada: 'asc' }, include: { pengajar: { include: { unit: true } } } },
  pp: { orderBy: { dibuatPada: 'asc' } },
  booking: { include: { fasilitas: true } },
  laporan: true,
  bast: true,
  riwayat: { orderBy: { dibuatPada: 'asc' }, include: { oleh: true } },
} satisfies Prisma.OrderInclude;

export type OrderLengkap = Prisma.OrderGetPayload<{ include: typeof includeOrder }>;

export function ambilOrder(id: number) {
  return db.order.findUnique({ where: { id }, include: includeOrder });
}

/** Ringkasan untuk tabel/dasbor. */
export const includeRingkas = { customer: true, marketing: true, unit: true, silabus: { select: { diteruskanPada: true } } } satisfies Prisma.OrderInclude;
export type OrderRingkas = Prisma.OrderGetPayload<{ include: typeof includeRingkas }>;
