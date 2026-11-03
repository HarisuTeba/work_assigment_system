'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { jalankan, str, type Hasil } from '@/lib/aksi';
import * as Akun from '@/lib/logic/akun';
import { akhiriSesi, mulaiSesi, wajibLogin } from '@/lib/session';

export async function login(_: Hasil, fd: FormData): Promise<Hasil> {
  return jalankan(async () => {
    const u = await Akun.login(str(fd, 'username'), str(fd, 'password'));
    await mulaiSesi(u.id, u.peran);
    return u.peran;
  }, 'Berhasil masuk.', peran => `/${peran}`);
}

export async function logout() {
  await akhiriSesi();
  redirect('/login');
}

export async function gantiPassword(_: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin();
  return jalankan(() => Akun.gantiPassword(u, str(fd, 'lama'), str(fd, 'baru'), str(fd, 'ulang')), 'Password berhasil diganti.');
}

export async function simpanDivisi(id: number | null, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('admin');
  return jalankan(() => Akun.simpanDivisi(u, id, { kode: str(fd, 'kode'), nama: str(fd, 'nama') }), id ? 'Divisi diperbarui.' : 'Divisi ditambahkan.');
}

export async function hapusDivisi(id: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('admin');
  return jalankan(() => Akun.hapusDivisi(u, id), 'Divisi dihapus.');
}

export async function simpanUser(id: number | null, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('admin');
  const d = Object.fromEntries(['nama', 'username', 'peran', 'jabatan', 'divisiId', 'batasTugasAktif', 'password'].map(k => [k, str(fd, k)])) as Akun.DataUser;
  return jalankan(() => Akun.simpanUser(u, id, d), id ? 'Pengguna diperbarui.' : 'Pengguna ditambahkan.', id ? '/admin/pengguna' : undefined);
}

export async function setAktif(id: number, aktif: boolean, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('admin');
  return jalankan(() => Akun.setAktif(u, id, aktif), aktif ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.');
}

export async function bacaSemuaNotif(_: Hasil): Promise<Hasil> {
  const u = await wajibLogin();
  return jalankan(() => db.notifikasi.updateMany({ where: { userId: u.id, dibaca: false }, data: { dibaca: true } }), 'Semua notifikasi ditandai dibaca.');
}
