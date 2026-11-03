import { Peran, StatusOrder } from '@prisma/client';
import { db } from '../db';
import { gagal, teks, wajib } from '../errors';
import { LAYANAN } from '../layanan';
import type { Pengguna } from '../session';
import { tanggalDb } from '../waktu';
import { notifyBanyak } from './aturan';
import { idPeran, nomorBaru, notifyMarketing, orderDiTahap, pindahTahap, wajibPeran } from './order';
import { totalRak } from './silabus';

/**
 * Draft SPK oleh Marketing. Budget, nilai kontrak, customer, jadwal, dan peserta ditarik otomatis
 * dari RAK, PO, dan order; Marketing cukup menulis ruang lingkup dan catatan.
 */
export async function simpanSpk(marketing: Pengguna, id: number, d: { ruangLingkup: string; catatan: string }, ajukan: boolean) {
  wajibPeran(marketing, Peran.marketing);
  const o = await orderDiTahap(id, StatusOrder.SPK_DRAF);
  const po = await db.purchaseOrder.findUnique({ where: { orderId: id } });
  if (!po) gagal('SPK hanya bisa dibuat setelah PO / persetujuan quotation direkam.');
  const ruangLingkup = wajib(d.ruangLingkup, 'Ruang lingkup pekerjaan');
  const budgetRak = String(totalRak(await db.rakItem.findMany({ where: { orderId: id } })));
  const data = { ruangLingkup, catatan: teks(d.catatan) || null, budgetRak, nilaiKontrak: po.nilai };
  await db.$transaction(async tx => {
    await tx.spk.upsert({ where: { orderId: id }, create: { orderId: id, ...data }, update: data });
    if (ajukan) {
      await pindahTahap(tx, o, StatusOrder.APPROVAL_1, marketing.id, 'SPK diajukan ke Kadep Marketing');
      await notifyBanyak(tx, await idPeran(tx, Peran.kadep_marketing), `Approval 1 SPK: ${o.nomorRfq} "${o.judul}"`, `/order/${id}`);
    }
  });
}

/** Approval berjenjang: Kadep Marketing (tahap 1) lalu Kadep DPS (tahap 2). Nomor SPK terbit di tahap 2. */
export async function setujuiSpk(u: Pengguna, id: number, catatan: string) {
  const tahap = u.peran === Peran.kadep_marketing ? StatusOrder.APPROVAL_1 : u.peran === Peran.kadep_dps ? StatusOrder.APPROVAL_2 : null;
  if (!tahap) gagal('Anda tidak memiliki akses untuk tindakan ini.');
  const o = await db.order.findUnique({ where: { id } });
  if (!o) gagal('Order tidak ditemukan.');
  if (o.status !== tahap) {
    gagal(tahap === StatusOrder.APPROVAL_2 && o.status === StatusOrder.APPROVAL_1
      ? 'SPK belum disetujui Kadep Marketing (approval 1).'
      : 'SPK ini tidak sedang menunggu persetujuan Anda.');
  }
  const c = teks(catatan);
  if (tahap === StatusOrder.APPROVAL_1) {
    await db.$transaction(async tx => {
      await tx.spk.update({ where: { orderId: id }, data: { approval1Id: u.id, approval1Pada: new Date(), alasanTolak: null } });
      await pindahTahap(tx, o, StatusOrder.APPROVAL_2, u.id, c || 'Approval 1 disetujui');
      await notifyBanyak(tx, await idPeran(tx, Peran.kadep_dps), `Approval 2 SPK: ${o.nomorRfq} "${o.judul}"`, `/order/${id}`);
    });
    return;
  }
  const nomor = await nomorBaru(p => db.spk.count({ where: { nomor: p } }), 'SPK', `${LAYANAN[o.jenis].kode}/D3`);
  await db.$transaction(async tx => {
    await tx.spk.update({ where: { orderId: id }, data: { approval2Id: u.id, approval2Pada: new Date(), nomor } });
    await pindahTahap(tx, o, StatusOrder.PERSIAPAN, u.id, c || `SPK ${nomor} approved`);
    await notifyMarketing(tx, o, `SPK ${nomor} approved.`);
    await notifyBanyak(tx, await idPeran(tx, Peran.dps), `SPK ${nomor} approved: siapkan pengajar, PP, dan fasilitas.`, `/order/${id}`);
  });
}

export async function tolakSpk(u: Pengguna, id: number, alasan: string) {
  wajibPeran(u, Peran.kadep_marketing, Peran.kadep_dps);
  const tahap = u.peran === Peran.kadep_marketing ? StatusOrder.APPROVAL_1 : StatusOrder.APPROVAL_2;
  const o = await orderDiTahap(id, tahap);
  const a = wajib(alasan, 'Alasan penolakan');
  await db.$transaction(async tx => {
    await tx.spk.update({ where: { orderId: id }, data: { alasanTolak: a, approval1Id: null, approval1Pada: null } });
    await pindahTahap(tx, o, StatusOrder.SPK_DRAF, u.id, `Ditolak: ${a}`);
    await notifyMarketing(tx, o, `SPK ditolak ${u.jabatan}: ${a}`);
  });
}

/** BAST: laporan DPS dilampirkan, order selesai dan siap ditagihkan. */
export async function terbitkanBast(marketing: Pengguna, id: number, d: { tanggal: string; catatan: string }) {
  wajibPeran(marketing, Peran.marketing);
  const o = await orderDiTahap(id, StatusOrder.LAPORAN);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tanggal)) gagal('Tanggal serah terima wajib diisi.');
  const nomor = await nomorBaru(p => db.bast.count({ where: { nomor: p } }), 'BAST', 'D3');
  await db.$transaction(async tx => {
    await tx.bast.create({ data: { orderId: id, nomor, tanggal: tanggalDb(d.tanggal), catatan: teks(d.catatan) || null } });
    await pindahTahap(tx, o, StatusOrder.SELESAI, marketing.id, `BAST ${nomor} diterbitkan untuk penagihan`);
  });
}
