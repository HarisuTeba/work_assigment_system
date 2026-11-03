import bcrypt from 'bcryptjs';
import { Peran } from '@prisma/client';
import { db } from '../db';
import { gagal, teks, wajib } from '../errors';
import type { Pengguna } from '../session';

function wajibAdmin(u: Pengguna) {
  if (u.peran !== Peran.admin) gagal('Anda tidak memiliki akses untuk tindakan ini.');
}

export async function login(username: string, password: string) {
  const u = await db.user.findUnique({ where: { username: teks(username).toLowerCase() } });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) gagal('Username atau password salah.');
  if (!u.aktif) gagal('Akun ini dinonaktifkan. Hubungi admin.');
  return u;
}

export async function gantiPassword(u: Pengguna, lama: string, baru: string, ulang: string) {
  if (!(await bcrypt.compare(lama, u.passwordHash))) gagal('Password lama salah.');
  if (teks(baru).length < 6) gagal('Password baru minimal 6 karakter.');
  if (baru !== ulang) gagal('Konfirmasi password tidak sama.');
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(baru, 10) } });
}

export async function simpanDivisi(admin: Pengguna, id: number | null, data: { kode: string; nama: string }) {
  wajibAdmin(admin);
  const nama = wajib(data.nama, 'Nama divisi');
  const kode = wajib(data.kode, 'Kode divisi').toUpperCase();
  if (!/^[A-Z]{2,6}$/.test(kode)) gagal('Kode divisi 2–6 huruf, mis. PMS.');
  const dup = await db.divisi.findFirst({ where: { OR: [{ nama }, { kode }], NOT: id ? { id } : undefined } });
  if (dup) gagal(dup.kode === kode ? 'Kode divisi sudah dipakai.' : 'Nama divisi sudah dipakai.');
  if (id) await db.divisi.update({ where: { id }, data: { nama, kode } });
  else await db.divisi.create({ data: { nama, kode } });
}

export async function hapusDivisi(admin: Pengguna, id: number) {
  wajibAdmin(admin);
  if (await db.user.count({ where: { divisiId: id } })) gagal('Divisi masih memiliki anggota. Pindahkan anggotanya dulu.');
  if (await db.perintahKerja.count({ where: { divisiId: id } })) gagal('Divisi sudah memiliki perintah kerja dan tidak bisa dihapus.');
  await db.divisi.delete({ where: { id } });
}

export type DataUser = {
  nama: string; username: string; peran: string; jabatan: string;
  divisiId: string; batasTugasAktif: string; password: string;
};

export async function simpanUser(admin: Pengguna, id: number | null, d: DataUser) {
  wajibAdmin(admin);
  const nama = wajib(d.nama, 'Nama');
  const username = wajib(d.username, 'Username').toLowerCase();
  if (!/^[a-z0-9._]{3,20}$/.test(username)) gagal('Username 3–20 karakter: huruf kecil, angka, titik, atau garis bawah.');
  if (await db.user.findFirst({ where: { username, NOT: id ? { id } : undefined } })) gagal('Username sudah dipakai.');
  if (!(d.peran in Peran)) gagal('Peran tidak valid.');
  const peran = d.peran as Peran;
  const jabatan = wajib(d.jabatan, 'Jabatan');
  let divisiId: number | null = null;
  if (peran !== Peran.admin) {
    divisiId = Number(d.divisiId);
    if (!divisiId || !(await db.divisi.findUnique({ where: { id: divisiId } }))) gagal('Pilih divisi.');
  }
  let batasTugasAktif = 3;
  if (peran === Peran.staff) {
    batasTugasAktif = Number(d.batasTugasAktif);
    if (!Number.isInteger(batasTugasAktif) || batasTugasAktif < 1 || batasTugasAktif > 10) gagal('Batas tugas aktif (KPI) 1 sampai 10.');
  }
  const pw = d.password || '';
  if (!id && pw.length < 6) gagal('Password minimal 6 karakter.');
  if (id && pw && pw.length < 6) gagal('Password baru minimal 6 karakter.');
  if (id === admin.id && peran !== Peran.admin) gagal('Anda tidak bisa mengubah peran akun sendiri.');

  const data = { nama, username, peran, jabatan, divisiId, batasTugasAktif, ...(pw ? { passwordHash: await bcrypt.hash(pw, 10) } : {}) };
  if (id) await db.user.update({ where: { id }, data });
  else await db.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
}

export async function setAktif(admin: Pengguna, id: number, aktif: boolean) {
  wajibAdmin(admin);
  if (id === admin.id) gagal('Anda tidak bisa menonaktifkan akun sendiri.');
  await db.user.update({ where: { id }, data: { aktif } });
}
