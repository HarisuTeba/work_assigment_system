import { Peran, StatusOrder, StatusPengajar, StatusPp } from '@prisma/client';
import { db } from '../db';
import { gagal, teks, wajib } from '../errors';
import type { Pengguna } from '../session';
import { HARI } from '../waktu';
import { LEAD_TIME_PP, STATUS_TUTUP, notify, notifyBanyak } from './aturan';
import { catat, idPeran, nomorBaru, notifyMarketing, orderDiTahap, pindahTahap, wajibPeran } from './order';

/** Status penugasan pengajar yang mengikat jadwal. */
const MENGIKAT: StatusPengajar[] = [StatusPengajar.MENUNGGU, StatusPengajar.BERSEDIA];

// ---------- Deteksi bentrok jadwal ----------

const tumpang = (a1: Date, a2: Date, b1: Date, b2: Date) => a1 <= b2 && b1 <= a2;

/** Nomor RFQ order lain yang membuat pengajar bentrok pada rentang tanggal, atau null. */
export async function bentrokPengajar(pengajarId: number, mulai: Date, selesai: Date, kecuali: number) {
  const lain = await db.penugasanPengajar.findMany({
    where: { pengajarId, orderId: { not: kecuali }, status: { in: MENGIKAT }, order: { status: { notIn: STATUS_TUTUP } } },
    include: { order: true },
  });
  return lain.find(p => tumpang(mulai, selesai, p.order.tglMulai, p.order.tglSelesai))?.order.nomorRfq ?? null;
}

export async function bentrokFasilitas(fasilitasId: number, mulai: Date, selesai: Date, kecuali: number) {
  const lain = await db.bookingFasilitas.findMany({
    where: { fasilitasId, orderId: { not: kecuali }, order: { status: { notIn: STATUS_TUTUP } } },
    include: { order: true },
  });
  return lain.find(b => tumpang(mulai, selesai, b.mulai, b.selesai))?.order.nomorRfq ?? null;
}

// ---------- Pengajar ----------

/** DPS menetapkan pengajar (dari usulan UPT atau pilihan lain); pengajar lalu diminta konfirmasi. */
export async function tetapkanPengajar(dps: Pengguna, id: number, pengajarId: number, peran: string) {
  wajibPeran(dps, Peran.dps);
  const o = await orderDiTahap(id, StatusOrder.PERSIAPAN);
  const p = await db.user.findFirst({ where: { id: pengajarId, peran: Peran.pengajar, aktif: true } });
  if (!p) gagal('Pilih pengajar yang aktif.');
  const ada = await db.penugasanPengajar.findUnique({ where: { orderId_pengajarId: { orderId: id, pengajarId } } });
  if (ada && ada.status !== StatusPengajar.USULAN && ada.status !== StatusPengajar.MENOLAK) gagal(`${p.nama} sudah ditetapkan.`);
  const lain = await bentrokPengajar(pengajarId, o.tglMulai, o.tglSelesai, id);
  if (lain) gagal(`Jadwal bentrok: ${p.nama} sudah bertugas di ${lain} pada tanggal yang sama.`);
  const r = wajib(peran, 'Peran pengajar').slice(0, 60);
  await db.$transaction(async tx => {
    await tx.penugasanPengajar.upsert({
      where: { orderId_pengajarId: { orderId: id, pengajarId } },
      create: { orderId: id, pengajarId, peran: r, status: StatusPengajar.MENUNGGU },
      update: { peran: r, status: StatusPengajar.MENUNGGU, alasan: null },
    });
    await notify(tx, pengajarId, `Konfirmasi ketersediaan mengajar: ${o.judul}`, '/pengajar');
  });
}

export async function konfirmasiPengajar(pengajar: Pengguna, penugasanId: number, bersedia: boolean, alasan: string) {
  wajibPeran(pengajar, Peran.pengajar);
  const t = await db.penugasanPengajar.findUnique({ where: { id: penugasanId }, include: { order: true } });
  if (!t || t.pengajarId !== pengajar.id) gagal('Penugasan tidak ditemukan.');
  if (t.status !== StatusPengajar.MENUNGGU) gagal('Penugasan ini sudah dikonfirmasi.');
  const a = teks(alasan);
  if (!bersedia && !a) gagal('Tuliskan alasan tidak bersedia.');
  await db.$transaction(async tx => {
    await tx.penugasanPengajar.update({ where: { id: penugasanId }, data: { status: bersedia ? StatusPengajar.BERSEDIA : StatusPengajar.MENOLAK, alasan: a || null } });
    await notifyBanyak(tx, await idPeran(tx, Peran.dps), `${pengajar.nama} ${bersedia ? 'bersedia' : 'tidak bersedia'} mengajar ${t.order.nomorRfq}${a ? `: ${a}` : ''}`, `/order/${t.orderId}`);
  });
}

/** Surat Tugas Dosen untuk pengajar yang sudah bersedia. */
export async function terbitkanSuratTugas(dps: Pengguna, penugasanId: number) {
  wajibPeran(dps, Peran.dps);
  const t = await db.penugasanPengajar.findUnique({ where: { id: penugasanId }, include: { order: true } });
  if (!t) gagal('Penugasan tidak ditemukan.');
  await orderDiTahap(t.orderId, StatusOrder.PERSIAPAN, StatusOrder.PELAKSANAAN);
  if (t.status !== StatusPengajar.BERSEDIA) gagal('Surat Tugas hanya untuk pengajar yang sudah bersedia.');
  if (t.nomorSuratTugas) gagal('Surat Tugas sudah terbit.');
  const nomor = await nomorBaru(p => db.penugasanPengajar.count({ where: { nomorSuratTugas: p } }), 'ST', 'DPS');
  await db.$transaction(async tx => {
    await tx.penugasanPengajar.update({ where: { id: penugasanId }, data: { nomorSuratTugas: nomor, suratTugasPada: new Date() } });
    await notify(tx, t.pengajarId, `Surat Tugas ${nomor} terbit untuk ${t.order.judul}`, '/pengajar');
  });
}

// ---------- Pengadaan (PP) & fasilitas ----------

/** PP yang diajukan kurang dari 14 hari sebelum pelaksanaan dianggap mepet (lead time tidak ideal). */
export function ppMepet(dibuatPada: Date, tglMulai: Date) {
  return tglMulai.getTime() - dibuatPada.getTime() < LEAD_TIME_PP * HARI;
}

export async function tambahPp(dps: Pengguna, id: number, d: { item: string; jumlah: string; satuan: string; estimasiHarga: string }) {
  wajibPeran(dps, Peran.dps);
  const o = await orderDiTahap(id, StatusOrder.PERSIAPAN);
  const jumlah = Number(d.jumlah);
  if (!Number.isInteger(jumlah) || jumlah < 1) gagal('Jumlah minimal 1.');
  const harga = Number(String(d.estimasiHarga).replace(/[^\d]/g, ''));
  if (!(harga > 0)) gagal('Estimasi harga wajib diisi.');
  const item = wajib(d.item, 'Nama barang').slice(0, 150);
  await db.$transaction(async tx => {
    await tx.purchaseRequest.create({ data: { orderId: id, item, jumlah, satuan: wajib(d.satuan, 'Satuan').slice(0, 30), estimasiHarga: String(harga) } });
    await catat(tx, id, o.status, dps.id, `PP diajukan: ${item}${ppMepet(new Date(), o.tglMulai) ? ' (kurang dari 14 hari sebelum pelaksanaan)' : ''}`);
  });
}

export async function ubahStatusPp(dps: Pengguna, ppId: number, status: string) {
  wajibPeran(dps, Peran.dps);
  if (!(status in StatusPp)) gagal('Status PP tidak valid.');
  const pp = await db.purchaseRequest.findUnique({ where: { id: ppId } });
  if (!pp) gagal('PP tidak ditemukan.');
  await db.purchaseRequest.update({ where: { id: ppId }, data: { status: status as StatusPp } });
}

export async function bookingFasilitas(dps: Pengguna, id: number, fasilitasId: number) {
  wajibPeran(dps, Peran.dps);
  const o = await orderDiTahap(id, StatusOrder.PERSIAPAN);
  const f = await db.fasilitas.findUnique({ where: { id: fasilitasId } });
  if (!f) gagal('Pilih fasilitas.');
  if (await db.bookingFasilitas.findUnique({ where: { orderId_fasilitasId: { orderId: id, fasilitasId } } })) gagal(`${f.nama} sudah dibooking untuk order ini.`);
  const lain = await bentrokFasilitas(fasilitasId, o.tglMulai, o.tglSelesai, id);
  if (lain) gagal(`Jadwal bentrok: ${f.nama} sudah dipakai ${lain} pada tanggal yang sama.`);
  if (o.jumlahPeserta && o.jumlahPeserta > f.kapasitas) gagal(`Kapasitas ${f.nama} (${f.kapasitas}) kurang dari jumlah peserta (${o.jumlahPeserta}).`);
  await db.bookingFasilitas.create({ data: { orderId: id, fasilitasId, mulai: o.tglMulai, selesai: o.tglSelesai } });
}

export async function batalBooking(dps: Pengguna, bookingId: number) {
  wajibPeran(dps, Peran.dps);
  const b = await db.bookingFasilitas.findUnique({ where: { id: bookingId } });
  if (!b) gagal('Booking tidak ditemukan.');
  await orderDiTahap(b.orderId, StatusOrder.PERSIAPAN);
  await db.bookingFasilitas.delete({ where: { id: bookingId } });
}

// ---------- Pelaksanaan & laporan ----------

export async function mulaiPelaksanaan(dps: Pengguna, id: number) {
  wajibPeran(dps, Peran.dps);
  const o = await orderDiTahap(id, StatusOrder.PERSIAPAN);
  const siap = await db.penugasanPengajar.count({ where: { orderId: id, status: StatusPengajar.BERSEDIA, nomorSuratTugas: { not: null } } });
  if (!siap) gagal('Minimal 1 pengajar harus bersedia dan memiliki Surat Tugas.');
  const ppBelum = await db.purchaseRequest.count({ where: { orderId: id, status: { not: StatusPp.DITERIMA } } });
  await db.$transaction(async tx => {
    await pindahTahap(tx, o, StatusOrder.PELAKSANAAN, dps.id, ppBelum ? `Dimulai; ${ppBelum} PP belum diterima` : 'Program dimulai');
    await notifyMarketing(tx, o, 'Program mulai dilaksanakan.');
  });
}

export async function kirimLaporan(dps: Pengguna, id: number, d: { ringkasan: string; jumlahHadir: string; kendala: string; lampiran: string | null }) {
  wajibPeran(dps, Peran.dps);
  const o = await orderDiTahap(id, StatusOrder.PELAKSANAAN);
  const ringkasan = wajib(d.ringkasan, 'Ringkasan pelaksanaan');
  const hadir = d.jumlahHadir ? Number(d.jumlahHadir) : null;
  if (hadir != null && (!Number.isInteger(hadir) || hadir < 0)) gagal('Jumlah hadir tidak valid.');
  await db.$transaction(async tx => {
    await tx.laporanKegiatan.create({ data: { orderId: id, ringkasan, jumlahHadir: hadir, kendala: teks(d.kendala) || null, lampiran: d.lampiran } });
    await pindahTahap(tx, o, StatusOrder.LAPORAN, dps.id, 'Laporan kegiatan DPS dikirim');
    await notifyMarketing(tx, o, 'Laporan kegiatan siap. Terbitkan BAST.');
  });
}
