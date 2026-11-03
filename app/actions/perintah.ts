'use server';
import { jalankan, str, type Hasil } from '@/lib/aksi';
import * as P from '@/lib/logic/perintah';
import { wajibLogin } from '@/lib/session';
import { simpanBerkas } from '@/lib/upload';
import { dariInputLokal } from '@/lib/waktu';

/** Simpan draf atau langsung ajukan, tergantung tombol yang ditekan (name="aksi"). */
export async function simpanPerintah(id: number | null, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('spv');
  const ajukan = str(fd, 'aksi') === 'ajukan';
  return jalankan(async () => {
    const lampiranPo = str(fd, 'jenis') === 'SPK' ? await simpanBerkas(fd.get('lampiranPo')) : null;
    return P.simpanPerintah(u, id, {
      jenis: str(fd, 'jenis'), judul: str(fd, 'judul'), apa: str(fd, 'apa'), mengapa: str(fd, 'mengapa'),
      diMana: str(fd, 'diMana'), bagaimana: str(fd, 'bagaimana'), prioritas: str(fd, 'prioritas'),
      tenggat: dariInputLokal(str(fd, 'tenggat')), langkah: fd.getAll('langkah').map(String),
      noPo: str(fd, 'noPo'), tglPo: str(fd, 'tglPo'), klien: str(fd, 'klien'), nilaiPo: str(fd, 'nilaiPo'), lampiranPo,
    }, ajukan);
  }, 'Tersimpan.', r => `/spv/perintah/${(r as { id: number }).id}`);
}

export async function ajukanPerintah(id: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('spv');
  return jalankan(() => P.ajukanPerintah(u, id), 'Diajukan ke Manager untuk disahkan.');
}

export async function hapusDraf(id: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('spv');
  return jalankan(() => P.hapusDraf(u, id), 'Draf dihapus.', '/spv/perintah');
}

export async function turunkanPerintah(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('spv');
  return jalankan(() => P.turunkanPerintah(u, id, fd.getAll('staff').map(Number)), 'Perintah diturunkan ke staff.');
}

export async function sahkanPerintah(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('manager');
  return jalankan(() => P.sahkanPerintah(u, id, str(fd, 'catatan')), 'Perintah disahkan.');
}

export async function tolakPerintah(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('manager');
  return jalankan(() => P.tolakPerintah(u, id, str(fd, 'alasan')), 'Perintah ditolak dan dikembalikan ke SPV.');
}
