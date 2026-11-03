import { StatusTugas, type Prisma, type PrismaClient } from '@prisma/client';
import { HARI } from '../waktu';

export type Db = Prisma.TransactionClient | PrismaClient;

/** Tugas yang dihitung terhadap batas KPI staff. */
export const STATUS_AKTIF: StatusTugas[] = [StatusTugas.DITERIMA, StatusTugas.DIKERJAKAN, StatusTugas.DILAPORKAN, StatusTugas.REVISI];
/** Tugas yang sedang dikerjakan (boleh mengisi AP dan laporan). */
export const STATUS_KERJA: StatusTugas[] = [StatusTugas.DITERIMA, StatusTugas.DIKERJAKAN, StatusTugas.REVISI];
/** Belum direspons staff. */
export const STATUS_RESPON: StatusTugas[] = [StatusTugas.MENUNGGU_RESPON, StatusTugas.MENUNGGU_JAWABAN];
/** Tidak lagi bisa terlambat. */
export const STATUS_TUTUP: StatusTugas[] = [StatusTugas.DILAPORKAN, StatusTugas.DISETUJUI, StatusTugas.DITOLAK_STAFF];

export const BATAS_LAMPIRAN = 2 * 1024 * 1024;
export const JENDELA_EVALUASI = 30 * HARI; // rentang untuk saran teguran
export const JEDA_TEGURAN = 14 * HARI;     // saran disembunyikan bila baru saja ditegur
export const BATAS_BOLONG = 3;             // hari kerja tanpa laporan harian dalam 30 hari
export const TINGKAT_TEGURAN = ['Lisan', 'SP1', 'SP2'] as const;

export function hitungPoin(rataSkor: number, tepatWaktu: boolean): number {
  return Math.round(rataSkor * 10) + (tepatWaktu ? 10 : 0);
}

export function skorRata(e: { skorWaktu: number; skorKualitas: number; skorKesesuaian: number }): number {
  return (e.skorWaktu + e.skorKualitas + e.skorKesesuaian) / 3;
}

export async function notify(tx: Db, userId: number, pesan: string, tautan: string) {
  await tx.notifikasi.create({ data: { userId, pesan: pesan.slice(0, 255), tautan } });
}

export async function notifyBanyak(tx: Db, userIds: number[], pesan: string, tautan: string) {
  if (!userIds.length) return;
  await tx.notifikasi.createMany({ data: userIds.map(userId => ({ userId, pesan: pesan.slice(0, 255), tautan })) });
}
