import type { JenisPerintah, Peran, Prioritas, StatusDokumen, StatusTugas } from '@prisma/client';
import { ZONA } from './waktu';

export const LABEL_PERAN: Record<Peran, string> = { admin: 'Admin', manager: 'Manager', spv: 'Supervisor', staff: 'Staff' };

export const LABEL_JENIS: Record<JenisPerintah, string> = {
  ISPK: 'ISPK · Proyek Internal',
  SPK: 'SPK · Proyek PO',
};

export const LABEL_DOKUMEN: Record<StatusDokumen, string> = {
  DRAF: 'Draf',
  MENUNGGU_PENGESAHAN: 'Menunggu Pengesahan',
  DITOLAK: 'Ditolak Manager',
  DISAHKAN: 'Disahkan',
  DITURUNKAN: 'Diturunkan',
};

export const LABEL_TUGAS: Record<StatusTugas, string> = {
  MENUNGGU_RESPON: 'Menunggu Respons',
  MENUNGGU_JAWABAN: 'Menunggu Jawaban',
  DITOLAK_STAFF: 'Ditolak Staff',
  DITERIMA: 'Diterima',
  DIKERJAKAN: 'Dikerjakan',
  DILAPORKAN: 'Laporan Akhir Dikirim',
  REVISI: 'Perlu Revisi',
  DISETUJUI: 'Disetujui',
};

export const LABEL_PRIORITAS: Record<Prioritas, string> = { RENDAH: 'Rendah', SEDANG: 'Sedang', TINGGI: 'Tinggi' };

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
