import type { JenisCustomer, Peran, StatusOrder, StatusPengajar, StatusPp } from '@prisma/client';
import { ZONA } from './waktu';

export const LABEL_PERAN: Record<Peran, string> = {
  admin: 'Admin',
  marketing: 'Marketing',
  kadep_marketing: 'Kadep Marketing',
  dps: 'DPS',
  kadep_dps: 'Kadep DPS',
  upt: 'UPT / Prodi',
};

export const LABEL_STATUS: Record<StatusOrder, string> = {
  RFQ: 'RFQ masuk',
  SILABUS_RAK: 'Silabus & RAK',
  QUOTATION: 'Quotation',
  SPK_DRAF: 'Draf SPK',
  APPROVAL_1: 'Approval Kadep Marketing',
  APPROVAL_2: 'Approval Kadep DPS',
  PERSIAPAN: 'Persiapan',
  PELAKSANAAN: 'Pelaksanaan',
  LAPORAN: 'Menunggu BAST',
  SELESAI: 'Selesai',
  DITOLAK: 'Tidak sanggup',
  BATAL: 'Batal',
};

export const LABEL_CUSTOMER: Record<JenisCustomer, string> = { SWASTA: 'Swasta', BUMN: 'BUMN', INSTITUSI: 'Institusi' };

export const LABEL_PENGAJAR: Record<StatusPengajar, string> = {
  USULAN: 'Usulan UPT', MENUNGGU: 'Menunggu konfirmasi', BERSEDIA: 'Bersedia', MENOLAK: 'Menolak',
};

export const LABEL_PP: Record<StatusPp, string> = { DIAJUKAN: 'Diajukan', DIPROSES: 'Diproses Purchasing', DITERIMA: 'Barang diterima' };

/** Kelas CSS dari kode enum, mis. MENUNGGU_RESPON → s-menunggu-respon. */
export function kelasStatus(kode: string): string {
  return 's-' + kode.toLowerCase().replace(/_/g, '-');
}

const fTanggal = new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric' });
const fWaktu = new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fPanjang = new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
// Kolom @db.Date disimpan tengah malam UTC; tampilkan apa adanya tanpa geser zona.
const fTanggalDb = new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
const fHariDb = new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

export const tanggal = (d: Date | null | undefined) => (d ? fTanggal.format(d) : '—');
export const waktu = (d: Date | null | undefined) => (d ? fWaktu.format(d).replace('.', ':') : '—');
export const tanggalPanjang = (d: Date) => fPanjang.format(d);
export const tanggalDb = (d: Date | null | undefined) => (d ? fTanggalDb.format(d) : '—');
export const hariDb = (d: Date) => fHariDb.format(d);

export function rupiah(v: unknown): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v));
}

/** Sisa waktu menuju tenggat dalam kalimat pendek. */
export function sisaWaktu(tenggat: Date, now = Date.now()): string {
  const ms = tenggat.getTime() - now;
  const jam = Math.round(Math.abs(ms) / 3_600_000);
  const teks = jam < 24 ? `${jam} jam` : `${Math.round(jam / 24)} hari`;
  return ms >= 0 ? `${teks} lagi` : `lewat ${teks}`;
}

export function namaTampil(nama: string): string {
  return nama.includes('__') ? nama.split('__').slice(1).join('__') : nama;
}

export function inisial(nama: string): string {
  return nama.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('');
}
