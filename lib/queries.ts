import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from './db';

export const includePerintah = {
  spv: true, manager: true, divisi: true,
  langkah: { orderBy: { urutan: 'asc' } },
  riwayat: { orderBy: { dibuatPada: 'asc' }, include: { oleh: true } },
} satisfies Prisma.PerintahKerjaInclude;

export type PerintahLengkap = Prisma.PerintahKerjaGetPayload<{ include: typeof includePerintah }>;

export const includePenugasan = {
  perintah: { include: includePerintah },
  staff: true,
  pertanyaan: { orderBy: { ditanyaPada: 'asc' } },
  actionPlan: { orderBy: { urutan: 'asc' } },
  laporanHarian: { orderBy: { tanggal: 'desc' }, include: { actionPlan: true } },
  laporanMingguan: { orderBy: { minggu: 'desc' }, include: { pica: { orderBy: { id: 'asc' } } } },
  laporanAkhir: { orderBy: { dikirimPada: 'asc' } },
  evaluasi: { orderBy: { dibuatPada: 'asc' } },
} satisfies Prisma.PenugasanInclude;

export type PenugasanLengkap = Prisma.PenugasanGetPayload<{ include: typeof includePenugasan }>;

export function ambilPenugasan(id: number) {
  return db.penugasan.findUnique({ where: { id }, include: includePenugasan });
}

export function ambilPerintah(id: number) {
  return db.perintahKerja.findUnique({ where: { id }, include: includePerintah });
}

/** Ringkasan penugasan untuk tabel: progres AP dan jumlah PICA terbuka. */
export const includeRingkas = {
  staff: true,
  perintah: true,
  actionPlan: { select: { selesai: true } },
  pertanyaan: { where: { jawaban: null }, select: { id: true } },
  laporanMingguan: { select: { pica: { where: { status: 'OPEN' }, select: { id: true } } } },
} satisfies Prisma.PenugasanInclude;

export type PenugasanRingkas = Prisma.PenugasanGetPayload<{ include: typeof includeRingkas }>;

export const picaTerbuka = (p: PenugasanRingkas) => p.laporanMingguan.reduce((n, l) => n + l.pica.length, 0);
