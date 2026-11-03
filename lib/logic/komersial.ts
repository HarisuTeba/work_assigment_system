import { JenisPo, Peran, StatusOrder, StatusQuotation } from '@prisma/client';
import { db } from '../db';
import { gagal, teks, wajib } from '../errors';
import type { Pengguna } from '../session';
import { tanggalDb } from '../waktu';
import { nomorBaru, orderDiTahap, pindahTahap, wajibPeran } from './order';
import { totalRak } from './silabus';

const angka = (v: string) => Number(String(v).replace(/[^\d.]/g, ''));

/**
 * Profit adjustment: nilai penawaran = RAK × (1 + margin%). Marketing boleh mengisi margin atau
 * langsung nilai penawaran (margin dihitung balik). Versi lama otomatis berstatus "diganti".
 */
export async function buatQuotation(
  marketing: Pengguna, id: number,
  d: { cara: string; margin: string; nilai: string; berlakuSampai: string; catatan: string },
) {
  wajibPeran(marketing, Peran.marketing);
  const o = await orderDiTahap(id, StatusOrder.QUOTATION);
  const rak = totalRak(await db.rakItem.findMany({ where: { orderId: id } }));
  if (!rak) gagal('RAK belum tersedia.');
  let margin: number, nilai: number;
  if (d.cara === 'nilai') {
    nilai = angka(d.nilai);
    if (!(nilai > 0)) gagal('Isi nilai penawaran.');
    margin = ((nilai - rak) / rak) * 100;
  } else {
    margin = angka(d.margin);
    if (!(margin >= 0) || margin > 1000) gagal('Margin 0 sampai 1000%.');
    nilai = Math.round(rak * (1 + margin / 100));
  }
  if (nilai < rak) gagal('Nilai penawaran tidak boleh di bawah biaya RAK.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.berlakuSampai)) gagal('Isi masa berlaku penawaran.');
  const berlakuSampai = tanggalDb(d.berlakuSampai);
  const versi = (await db.quotation.count({ where: { orderId: id } })) + 1;
  const nomor = await nomorBaru(p => db.quotation.count({ where: { nomor: p } }), 'Q', 'D3-MKT');
  await db.$transaction(async tx => {
    await tx.quotation.updateMany({ where: { orderId: id, status: StatusQuotation.DIKIRIM }, data: { status: StatusQuotation.DIGANTI } });
    await tx.quotation.create({
      data: { orderId: id, nomor, versi, nilaiRak: String(rak), marginPersen: margin.toFixed(2), nilaiPenawaran: String(nilai), berlakuSampai, catatan: teks(d.catatan) || null },
    });
    await tx.riwayatOrder.create({ data: { orderId: id, olehId: marketing.id, dari: o.status, ke: o.status, catatan: `Quotation ${nomor} (v${versi}) diterbitkan` } });
  });
}

/** Customer menyetujui: rekam PO / Approval Quotation sebagai syarat penerbitan SPK. */
export async function rekamPo(
  marketing: Pengguna, id: number,
  d: { jenis: string; nomor: string; tanggal: string; nilai: string; lampiran: string | null },
) {
  wajibPeran(marketing, Peran.marketing);
  const o = await orderDiTahap(id, StatusOrder.QUOTATION);
  const q = await db.quotation.findFirst({ where: { orderId: id, status: StatusQuotation.DIKIRIM }, orderBy: { versi: 'desc' } });
  if (!q) gagal('Terbitkan quotation terlebih dahulu.');
  if (!(d.jenis in JenisPo)) gagal('Pilih jenis dokumen persetujuan customer.');
  const nomor = wajib(d.nomor, 'Nomor PO / persetujuan');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tanggal)) gagal('Tanggal PO wajib diisi.');
  const nilai = angka(d.nilai);
  if (!(nilai > 0)) gagal('Nilai PO wajib diisi.');
  if (d.jenis === JenisPo.PO && !d.lampiran) gagal('Lampirkan dokumen PO.');
  await db.$transaction(async tx => {
    await tx.purchaseOrder.create({ data: { orderId: id, jenis: d.jenis as JenisPo, nomor, tanggal: tanggalDb(d.tanggal), nilai: String(nilai), lampiran: d.lampiran } });
    await tx.quotation.update({ where: { id: q.id }, data: { status: StatusQuotation.DISETUJUI } });
    await pindahTahap(tx, o, StatusOrder.SPK_DRAF, marketing.id, `PO ${nomor} diterima`);
  });
}

/** Customer menolak penawaran: order dibatalkan dengan alasan. */
export async function batalkan(marketing: Pengguna, id: number, alasan: string) {
  wajibPeran(marketing, Peran.marketing);
  const o = await orderDiTahap(id, StatusOrder.QUOTATION);
  const a = wajib(alasan, 'Alasan pembatalan');
  await db.$transaction(async tx => {
    await tx.quotation.updateMany({ where: { orderId: id, status: StatusQuotation.DIKIRIM }, data: { status: StatusQuotation.DITOLAK } });
    await tx.order.update({ where: { id }, data: { alasanTutup: a } });
    await pindahTahap(tx, o, StatusOrder.BATAL, marketing.id, a);
  });
}
