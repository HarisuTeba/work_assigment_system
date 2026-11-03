import bcrypt from 'bcryptjs';
import { JenisCustomer, JenisFasilitas, Peran, StatusOrder } from '@prisma/client';
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

// ---------- Pengguna ----------

export type DataUser = { nama: string; username: string; peran: string; jabatan: string; unitId: string; eksternal: boolean; password: string };

export async function simpanUser(admin: Pengguna, id: number | null, d: DataUser) {
  wajibAdmin(admin);
  const nama = wajib(d.nama, 'Nama');
  const username = wajib(d.username, 'Username').toLowerCase();
  if (!/^[a-z0-9._]{3,20}$/.test(username)) gagal('Username 3–20 karakter: huruf kecil, angka, titik, atau garis bawah.');
  if (await db.user.findFirst({ where: { username, NOT: id ? { id } : undefined } })) gagal('Username sudah dipakai.');
  if (!(d.peran in Peran)) gagal('Peran tidak valid.');
  const peran = d.peran as Peran;
  const jabatan = wajib(d.jabatan, 'Jabatan');
  const eksternal = peran === Peran.pengajar && d.eksternal;
  let unitId: number | null = null;
  if (peran === Peran.upt || (peran === Peran.pengajar && !eksternal)) {
    unitId = Number(d.unitId);
    if (!unitId || !(await db.unit.findUnique({ where: { id: unitId } }))) gagal('Pilih UPT/Prodi untuk peran ini.');
  }
  const pw = d.password || '';
  if (!id && pw.length < 6) gagal('Password minimal 6 karakter.');
  if (id && pw && pw.length < 6) gagal('Password baru minimal 6 karakter.');
  if (id === admin.id && peran !== Peran.admin) gagal('Anda tidak bisa mengubah peran akun sendiri.');

  const data = { nama, username, peran, jabatan, unitId, eksternal, ...(pw ? { passwordHash: await bcrypt.hash(pw, 10) } : {}) };
  if (id) await db.user.update({ where: { id }, data });
  else await db.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
}

export async function setAktif(admin: Pengguna, id: number, aktif: boolean) {
  wajibAdmin(admin);
  if (id === admin.id) gagal('Anda tidak bisa menonaktifkan akun sendiri.');
  await db.user.update({ where: { id }, data: { aktif } });
}

// ---------- Data master ----------

export async function simpanUnit(admin: Pengguna, id: number | null, d: { kode: string; nama: string }) {
  wajibAdmin(admin);
  const nama = wajib(d.nama, 'Nama UPT/Prodi');
  const kode = wajib(d.kode, 'Kode').toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(kode)) gagal('Kode 2–8 huruf/angka, mis. INF.');
  const dup = await db.unit.findFirst({ where: { OR: [{ nama }, { kode }], NOT: id ? { id } : undefined } });
  if (dup) gagal(dup.kode === kode ? 'Kode sudah dipakai.' : 'Nama sudah dipakai.');
  if (id) await db.unit.update({ where: { id }, data: { nama, kode } });
  else await db.unit.create({ data: { nama, kode } });
}

export type DataCustomer = { nama: string; jenis: string; pic: string; email: string; telepon: string; alamat: string };

export function customerValid(d: DataCustomer) {
  if (!(d.jenis in JenisCustomer)) gagal('Pilih jenis customer.');
  const email = teks(d.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) gagal('Format email customer tidak valid.');
  return {
    nama: wajib(d.nama, 'Nama customer'), jenis: d.jenis as JenisCustomer, pic: wajib(d.pic, 'Nama PIC customer'),
    email: email || null, telepon: teks(d.telepon) || null, alamat: teks(d.alamat) || null,
  };
}

export async function simpanCustomer(u: Pengguna, id: number | null, d: DataCustomer) {
  if (u.peran !== Peran.admin && u.peran !== Peran.marketing) gagal('Anda tidak memiliki akses untuk tindakan ini.');
  const data = customerValid(d);
  if (await db.customer.findFirst({ where: { nama: data.nama, NOT: id ? { id } : undefined } })) gagal('Customer dengan nama ini sudah ada.');
  if (id) await db.customer.update({ where: { id }, data });
  else await db.customer.create({ data });
}

export async function simpanFasilitas(admin: Pengguna, id: number | null, d: { nama: string; jenis: string; kapasitas: string }) {
  wajibAdmin(admin);
  const nama = wajib(d.nama, 'Nama fasilitas');
  if (!(d.jenis in JenisFasilitas)) gagal('Pilih jenis fasilitas.');
  const kapasitas = Number(d.kapasitas);
  if (!Number.isInteger(kapasitas) || kapasitas < 1) gagal('Kapasitas minimal 1 orang.');
  if (await db.fasilitas.findFirst({ where: { nama, NOT: id ? { id } : undefined } })) gagal('Nama fasilitas sudah dipakai.');
  const data = { nama, jenis: d.jenis as JenisFasilitas, kapasitas };
  if (id) await db.fasilitas.update({ where: { id }, data });
  else await db.fasilitas.create({ data });
}

export async function simpanSla(admin: Pengguna, nilai: Partial<Record<StatusOrder, string>>) {
  wajibAdmin(admin);
  const baris = Object.entries(nilai).map(([status, v]) => {
    const hari = Number(v);
    if (!Number.isInteger(hari) || hari < 1 || hari > 60) gagal('SLA tiap tahap 1 sampai 60 hari.');
    return { status: status as StatusOrder, hari };
  });
  await db.$transaction(baris.map(b => db.sla.upsert({ where: { status: b.status }, create: b, update: { hari: b.hari } })));
}
