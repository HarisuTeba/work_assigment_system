import { StatusOrder, type Prisma, type PrismaClient } from '@prisma/client';

export type Db = Prisma.TransactionClient | PrismaClient;

/** Urutan tahap normal sebuah order. */
export const TAHAP: StatusOrder[] = [
  StatusOrder.RFQ, StatusOrder.SILABUS_RAK, StatusOrder.QUOTATION, StatusOrder.SPK_DRAF,
  StatusOrder.APPROVAL_1, StatusOrder.APPROVAL_2, StatusOrder.PERSIAPAN, StatusOrder.PELAKSANAAN,
  StatusOrder.LAPORAN, StatusOrder.SELESAI,
];
export const STATUS_TUTUP: StatusOrder[] = [StatusOrder.SELESAI, StatusOrder.DITOLAK, StatusOrder.BATAL];
/** Jadwal masih boleh diubah sebelum laporan kegiatan dibuat. */
export const BOLEH_UBAH_JADWAL: StatusOrder[] = TAHAP.slice(0, TAHAP.indexOf(StatusOrder.PELAKSANAAN) + 1);

/** Default SLA (hari) bila tabel sla belum diisi. PERSIAPAN/PELAKSANAAN mengikuti tanggal pelaksanaan. */
export const SLA_DEFAULT: Partial<Record<StatusOrder, number>> = {
  RFQ: 2, SILABUS_RAK: 7, QUOTATION: 7, SPK_DRAF: 2, APPROVAL_1: 2, APPROVAL_2: 2, LAPORAN: 5,
};
/** Lead time ideal PP sebelum pelaksanaan. */
export const LEAD_TIME_PP = 14;
export const BATAS_LAMPIRAN = 2 * 1024 * 1024;

export async function notify(tx: Db, userId: number, pesan: string, tautan: string) {
  await tx.notifikasi.create({ data: { userId, pesan: pesan.slice(0, 255), tautan } });
}

export async function notifyBanyak(tx: Db, userIds: number[], pesan: string, tautan: string) {
  const unik = [...new Set(userIds)];
  if (!unik.length) return;
  await tx.notifikasi.createMany({ data: unik.map(userId => ({ userId, pesan: pesan.slice(0, 255), tautan })) });
}
