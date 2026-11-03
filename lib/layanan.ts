// Atribut khusus tiap jenis layanan SPK Eksternal (bab 6 dokumen analisis).
// Dipakai bersama oleh form (klien) dan validasi server; disimpan di kolom JSON order.detail.
import type { JenisLayanan } from '@prisma/client';

export type Atribut = {
  key: string;
  label: string;
  tipe: 'text' | 'number' | 'textarea' | 'select';
  opsi?: string[];
  wajib: boolean;
  hint?: string;
};

const PAX: Atribut = { key: 'paxRate', label: 'Pax rate (Rp per peserta)', tipe: 'number', wajib: true };
const SKEMA: Atribut[] = [
  { key: 'skema', label: 'Skema sertifikasi', tipe: 'text', wajib: true },
  { key: 'lembaga', label: 'Lembaga sertifikasi (LSP/Asosiasi)', tipe: 'text', wajib: true },
  { key: 'nilaiPerPeserta', label: 'Nilai ujian per peserta (Rp)', tipe: 'number', wajib: true },
];

export const LAYANAN: Record<JenisLayanan, { label: string; kode: string; atribut: Atribut[] }> = {
  TRAINING: {
    label: 'Training / Workshop', kode: 'TRN',
    atribut: [
      PAX,
      { key: 'tempat', label: 'Jenis lokasi', tipe: 'select', opsi: ['In-house (lokasi customer)', 'Astratek'], wajib: true },
    ],
  },
  SERTIFIKASI: {
    label: 'Sertifikasi', kode: 'SRT',
    atribut: [...SKEMA, { key: 'syaratLulus', label: 'Syarat kelulusan / ujian', tipe: 'textarea', wajib: true }],
  },
  KOMBINASI: {
    label: 'Training + Sertifikasi', kode: 'KMB',
    atribut: [
      { key: 'modulTraining', label: 'Modul pelatihan', tipe: 'textarea', wajib: true },
      PAX,
      ...SKEMA,
    ],
  },
  KONSULTASI: {
    label: 'Konsultasi', kode: 'KNS',
    atribut: [
      { key: 'lingkup', label: 'Lingkup pekerjaan (scope of work)', tipe: 'textarea', wajib: true },
      { key: 'metode', label: 'Metode konsultasi', tipe: 'select', opsi: ['FGD', 'Gemba / Field Visit', 'Penyusunan Laporan Solusi'], wajib: true },
      { key: 'milestone', label: 'Milestone penyerahan output', tipe: 'textarea', wajib: true },
      { key: 'jadwalMonitoring', label: 'Jadwal monitoring', tipe: 'text', wajib: true },
    ],
  },
  SEWA_RUANG: {
    label: 'Penyewaan Ruangan / Fasilitas', kode: 'SWR',
    atribut: [
      { key: 'ruangan', label: 'Nama ruangan / laboratorium', tipe: 'text', wajib: true },
      { key: 'durasi', label: 'Durasi sewa', tipe: 'text', wajib: true, hint: 'mis. 3 hari atau 8 jam' },
      { key: 'fasilitasPendukung', label: 'Fasilitas pendukung', tipe: 'textarea', wajib: false },
    ],
  },
};

/** Layanan yang wajib mencantumkan jumlah peserta/pengguna. */
export const BUTUH_PESERTA: JenisLayanan[] = ['TRAINING', 'SERTIFIKASI', 'KOMBINASI', 'SEWA_RUANG'];

export type Detail = Record<string, string>;
