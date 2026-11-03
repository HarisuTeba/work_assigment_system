'use server';
import { jalankan, str, type Hasil } from '@/lib/aksi';
import * as E from '@/lib/logic/evaluasi';
import * as L from '@/lib/logic/laporan';
import * as T from '@/lib/logic/penugasan';
import { wajibLogin } from '@/lib/session';
import { simpanBerkas } from '@/lib/upload';

const pica = (fd: FormData): L.DataPica => ({
  problem: str(fd, 'problem'), identifikasi: str(fd, 'identifikasi'), correctiveAction: str(fd, 'correctiveAction'),
  pic: str(fd, 'pic'), dueDate: str(fd, 'dueDate'),
});

// ---------- Staff ----------
export async function tanya(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => T.tanya(u, id, str(fd, 'isi')), 'Pertanyaan terkirim ke SPV.');
}

export async function terima(id: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => T.terima(u, id), 'Perintah diterima. Sesuaikan Action Plan Anda.');
}

export async function tolak(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => T.tolak(u, id, str(fd, 'alasan')), 'Penolakan terkirim ke SPV.');
}

export async function tambahAp(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => L.tambahAp(u, id, str(fd, 'kegiatan'), str(fd, 'target')), 'AP ditambahkan.');
}

export async function ubahTargetAp(apId: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => L.ubahTargetAp(u, apId, str(fd, 'target')), 'Target diperbarui.');
}

export async function selesaikanAp(apId: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => L.selesaikanAp(u, apId), 'AP ditandai selesai.');
}

export async function hapusAp(apId: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => L.hapusAp(u, apId), 'AP dihapus.');
}

export async function laporanHarian(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(async () => L.kirimLaporanHarian(u, id, {
    actionPlanId: str(fd, 'actionPlanId'), kegiatan: str(fd, 'kegiatan'), apSelesai: fd.get('apSelesai') === 'on',
    lampiran: await simpanBerkas(fd.get('lampiran')),
  }), 'Laporan harian terkirim.');
}

export async function laporanMingguan(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(
    () => L.kirimLaporanMingguan(u, id, { ringkasan: str(fd, 'ringkasan'), adaKendala: str(fd, 'adaKendala'), pica: pica(fd) }),
    'Laporan mingguan terkirim.',
  );
}

export async function tambahPica(lmId: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => L.tambahPica(u, lmId, pica(fd)), 'PICA ditambahkan.');
}

export async function laporanAkhir(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(async () => L.kirimLaporanAkhir(u, id, {
    hasil: str(fd, 'hasil'), kendala: str(fd, 'kendala'), lampiran: await simpanBerkas(fd.get('lampiran')),
  }), 'Laporan akhir terkirim ke SPV.');
}

export async function bacaTeguran(id: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('staff');
  return jalankan(() => E.tandaiTeguranDibaca(u, id), 'Ditandai sudah dibaca.');
}

// ---------- Staff atau SPV ----------
export async function tutupPica(picaId: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('staff', 'spv');
  return jalankan(() => L.tutupPica(u, picaId), 'PICA ditutup.');
}

// ---------- SPV ----------
export async function jawab(qid: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('spv');
  return jalankan(() => T.jawab(u, qid, str(fd, 'jawaban')), 'Jawaban terkirim.');
}

export async function tanggapiMingguan(lmId: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('spv');
  return jalankan(() => L.tanggapiMingguan(u, lmId, str(fd, 'tanggapan')), 'Tanggapan terkirim.');
}

export async function evaluasi(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('spv');
  return jalankan(() => E.evaluasiPenugasan(u, id, {
    skorWaktu: str(fd, 'skorWaktu'), skorKualitas: str(fd, 'skorKualitas'), skorKesesuaian: str(fd, 'skorKesesuaian'),
    keputusan: str(fd, 'keputusan'), umpanBalik: str(fd, 'umpanBalik'), bukaMulai: str(fd, 'bukaMulai'),
  }), 'Evaluasi tersimpan.');
}

export async function beriReward(_: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('spv');
  return jalankan(
    () => E.beriReward(u, { staffId: str(fd, 'staffId'), jenis: str(fd, 'jenis'), poin: str(fd, 'poin'), pesan: str(fd, 'pesan') }),
    'Reward diberikan.',
  );
}

export async function beriTeguran(_: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('spv');
  return jalankan(() => E.beriTeguran(u, {
    staffId: str(fd, 'staffId'), tingkat: str(fd, 'tingkat'), alasan: str(fd, 'alasan'), catatanPembinaan: str(fd, 'catatanPembinaan'),
  }), 'Teguran diberikan.');
}
