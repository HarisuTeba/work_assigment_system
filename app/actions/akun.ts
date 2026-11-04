'use server';
import { redirect } from 'next/navigation';
import { StatusOrder } from '@prisma/client';
import { db } from '@/lib/db';
import { jalankan, str, type Hasil } from '@/lib/aksi';
import * as Akun from '@/lib/logic/akun';
import { beranda } from '@/lib/peran';
import { akhiriSesi, mulaiSesi, wajibLogin } from '@/lib/session';

export async function login(_: Hasil, fd: FormData): Promise<Hasil> {
  return jalankan(async () => {
    const u = await Akun.login(str(fd, 'username'), str(fd, 'password'));
    await mulaiSesi(u.id, u.peran);
    return u.peran;
  }, 'Berhasil masuk.', peran => beranda(peran as Parameters<typeof beranda>[0]));
}

export async function logout() {
  await akhiriSesi();
  redirect('/login');
}

export async function gantiPassword(_: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin();
  return jalankan(() => Akun.gantiPassword(u, str(fd, 'lama'), str(fd, 'baru'), str(fd, 'ulang')), 'Password berhasil diganti.');
}

export async function simpanUser(id: number | null, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('admin');
  const d: Akun.DataUser = {
    nama: str(fd, 'nama'), username: str(fd, 'username'), peran: str(fd, 'peran'), jabatan: str(fd, 'jabatan'),
    unitId: str(fd, 'unitId'), password: str(fd, 'password'),
  };
  return jalankan(() => Akun.simpanUser(u, id, d), id ? 'Pengguna diperbarui.' : 'Pengguna ditambahkan.', id ? '/admin' : undefined);
}

export async function setAktif(id: number, aktif: boolean, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('admin');
  return jalankan(() => Akun.setAktif(u, id, aktif), aktif ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.');
}

export async function simpanUnit(id: number | null, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('admin');
  return jalankan(() => Akun.simpanUnit(u, id, { kode: str(fd, 'kode'), nama: str(fd, 'nama') }), 'UPT/Prodi tersimpan.');
}

export async function simpanCustomer(id: number | null, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('admin', 'marketing');
  const d = Object.fromEntries(['nama', 'jenis', 'pic', 'email', 'telepon', 'alamat'].map(k => [k, str(fd, k)])) as Akun.DataCustomer;
  return jalankan(() => Akun.simpanCustomer(u, id, d), 'Customer tersimpan.');
}

export async function simpanFasilitas(id: number | null, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('admin');
  return jalankan(() => Akun.simpanFasilitas(u, id, { nama: str(fd, 'nama'), jenis: str(fd, 'jenis'), kapasitas: str(fd, 'kapasitas') }), 'Fasilitas tersimpan.');
}

export async function simpanSla(_: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('admin');
  const nilai = Object.fromEntries(Object.values(StatusOrder).filter(s => fd.has(`sla_${s}`)).map(s => [s, str(fd, `sla_${s}`)]));
  return jalankan(() => Akun.simpanSla(u, nilai), 'SLA tersimpan.');
}

export async function bacaSemuaNotif(_: Hasil): Promise<Hasil> {
  const u = await wajibLogin();
  return jalankan(() => db.notifikasi.updateMany({ where: { userId: u.id, dibaca: false }, data: { dibaca: true } }), 'Semua notifikasi ditandai dibaca.');
}

export async function simpanPengajar(id: number | null, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('admin');
  return jalankan(() => Akun.simpanPengajar(u, id, {
    nama: str(fd, 'nama'), jabatan: str(fd, 'jabatan'), unitId: str(fd, 'unitId'), telepon: str(fd, 'telepon'),
    eksternal: fd.get('eksternal') === 'on', aktif: id ? fd.get('aktif') === 'on' : true,
  }), 'Pengajar tersimpan.');
}
