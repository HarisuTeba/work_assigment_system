'use server';
import { jalankan, str, type Hasil } from '@/lib/aksi';
import { LAYANAN } from '@/lib/layanan';
import * as K from '@/lib/logic/komersial';
import * as Op from '@/lib/logic/operasional';
import * as O from '@/lib/logic/order';
import * as S from '@/lib/logic/silabus';
import * as Spk from '@/lib/logic/spk';
import { wajibLogin } from '@/lib/session';
import { simpanBerkas } from '@/lib/upload';
import type { JenisLayanan } from '@prisma/client';

// ---------- Marketing ----------
export async function buatRfq(_: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('marketing');
  const jenis = str(fd, 'jenis') as JenisLayanan;
  const detail = Object.fromEntries((LAYANAN[jenis]?.atribut ?? []).map(a => [a.key, str(fd, `d_${jenis}_${a.key}`)]));
  const baru = str(fd, 'customerId') === 'baru'
    ? { nama: str(fd, 'cNama'), jenis: str(fd, 'cJenis'), pic: str(fd, 'cPic'), email: str(fd, 'cEmail'), telepon: str(fd, 'cTelepon'), alamat: str(fd, 'cAlamat') }
    : null;
  return jalankan(() => O.buatRfq(u, {
    customerId: str(fd, 'customerId'), customerBaru: baru, jenis, judul: str(fd, 'judul'), deskripsi: str(fd, 'deskripsi'),
    tglMulai: str(fd, 'tglMulai'), tglSelesai: str(fd, 'tglSelesai'), lokasi: str(fd, 'lokasi'), jumlahPeserta: str(fd, 'jumlahPeserta'), detail,
  }), 'RFQ tersimpan.', r => `/order/${(r as { id: number }).id}`);
}

export async function analisis(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('marketing');
  return jalankan(() => O.analisis(u, id, { sanggup: str(fd, 'sanggup'), unitId: str(fd, 'unitId'), catatan: str(fd, 'catatan'), alasan: str(fd, 'alasan') }), 'Hasil analisis tersimpan.');
}

export async function buatQuotation(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('marketing');
  return jalankan(() => K.buatQuotation(u, id, { cara: str(fd, 'cara'), margin: str(fd, 'margin'), nilai: str(fd, 'nilai'), berlakuSampai: str(fd, 'berlakuSampai'), catatan: str(fd, 'catatan') }), 'Quotation diterbitkan.');
}

export async function rekamPo(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('marketing');
  return jalankan(async () => K.rekamPo(u, id, {
    jenis: str(fd, 'jenis'), nomor: str(fd, 'nomor'), tanggal: str(fd, 'tanggal'), nilai: str(fd, 'nilai'), lampiran: await simpanBerkas(fd.get('lampiran')),
  }), 'PO direkam. Lanjutkan ke draft SPK.');
}

export async function batalkan(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('marketing');
  return jalankan(() => K.batalkan(u, id, str(fd, 'alasan')), 'Order dibatalkan.');
}

export async function simpanSpk(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('marketing');
  const ajukan = str(fd, 'aksi') === 'ajukan';
  return jalankan(() => Spk.simpanSpk(u, id, { ruangLingkup: str(fd, 'ruangLingkup'), catatan: str(fd, 'catatan') }, ajukan), ajukan ? 'SPK diajukan ke Kadep Marketing.' : 'Draft SPK tersimpan.');
}

export async function terbitkanBast(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('marketing');
  return jalankan(() => Spk.terbitkanBast(u, id, { tanggal: str(fd, 'tanggal'), catatan: str(fd, 'catatan') }), 'BAST diterbitkan. Order selesai.');
}

export async function ubahJadwal(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('marketing', 'dps');
  return jalankan(() => O.ubahJadwal(u, id, { tglMulai: str(fd, 'tglMulai'), tglSelesai: str(fd, 'tglSelesai'), alasan: str(fd, 'alasan') }), 'Jadwal diperbarui dan dicatat.');
}

// ---------- Kadep ----------
export async function setujuiSpk(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('kadep_marketing', 'kadep_dps');
  return jalankan(() => Spk.setujuiSpk(u, id, str(fd, 'catatan')), 'SPK disetujui.');
}

export async function tolakSpk(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('kadep_marketing', 'kadep_dps');
  return jalankan(() => Spk.tolakSpk(u, id, str(fd, 'alasan')), 'SPK dikembalikan ke Marketing.');
}

// ---------- DPS & UPT ----------
export async function teruskanKeUpt(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => S.teruskanKeUpt(u, id, str(fd, 'unitId')), 'Request diteruskan ke UPT/Prodi.');
}

export async function kirimSilabusRak(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('upt');
  const uraian = fd.getAll('uraian').map(String), volume = fd.getAll('volume').map(String);
  const satuan = fd.getAll('satuan').map(String), harga = fd.getAll('hargaSatuan').map(String);
  return jalankan(async () => S.kirimSilabusRak(u, id, {
    ringkasan: str(fd, 'ringkasan'), berkas: await simpanBerkas(fd.get('berkas')),
    items: uraian.map((x, i) => ({ uraian: x, volume: volume[i], satuan: satuan[i], hargaSatuan: harga[i] })),
    pengajarIds: fd.getAll('pengajar').map(Number),
  }), 'Silabus & RAK terkirim ke Marketing.');
}

export async function tetapkanPengajar(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => Op.tetapkanPengajar(u, id, Number(str(fd, 'pengajarId')), str(fd, 'peran')), 'Pengajar ditetapkan; menunggu konfirmasi.');
}

export async function terbitkanSuratTugas(penugasanId: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => Op.terbitkanSuratTugas(u, penugasanId), 'Surat Tugas terbit.');
}

export async function tambahPp(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => Op.tambahPp(u, id, { item: str(fd, 'item'), jumlah: str(fd, 'jumlah'), satuan: str(fd, 'satuan'), estimasiHarga: str(fd, 'estimasiHarga') }), 'PP diajukan.');
}

export async function ubahStatusPp(ppId: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => Op.ubahStatusPp(u, ppId, str(fd, 'status')), 'Status PP diperbarui.');
}

export async function bookingFasilitas(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => Op.bookingFasilitas(u, id, Number(str(fd, 'fasilitasId'))), 'Fasilitas dibooking.');
}

export async function batalBooking(bookingId: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => Op.batalBooking(u, bookingId), 'Booking dibatalkan.');
}

export async function mulaiPelaksanaan(id: number, _: Hasil): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => Op.mulaiPelaksanaan(u, id), 'Pelaksanaan dimulai.');
}

export async function kirimLaporan(id: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(async () => Op.kirimLaporan(u, id, {
    ringkasan: str(fd, 'ringkasan'), jumlahHadir: str(fd, 'jumlahHadir'), kendala: str(fd, 'kendala'), lampiran: await simpanBerkas(fd.get('lampiran')),
  }), 'Laporan kegiatan terkirim ke Marketing.');
}

export async function konfirmasiPengajar(penugasanId: number, _: Hasil, fd: FormData): Promise<Hasil> {
  const u = await wajibLogin('dps');
  return jalankan(() => Op.konfirmasiPengajar(u, penugasanId, str(fd, 'jawab') === 'bersedia', str(fd, 'alasan')), 'Konfirmasi pengajar dicatat.');
}
