import { Peran, StatusOrder, StatusPengajar } from '@prisma/client';
import { db } from '../db';
import { gagal, teks, wajib } from '../errors';
import type { Pengguna } from '../session';
import { notifyBanyak } from './aturan';
import { catat, notifyMarketing, orderDiTahap, pindahTahap, wajibPeran } from './order';

/** DPS meneruskan request Silabus & RAK ke UPT/Prodi (boleh mengganti UPT usulan Marketing). */
export async function teruskanKeUpt(dps: Pengguna, id: number, unitIdBaru: string) {
  wajibPeran(dps, Peran.dps);
  const o = await orderDiTahap(id, StatusOrder.SILABUS_RAK);
  const s = await db.silabus.findUnique({ where: { orderId: id } });
  if (s?.diteruskanPada) gagal('Request ini sudah diteruskan ke UPT.');
  const unitId = Number(unitIdBaru) || o.unitId;
  const unit = unitId ? await db.unit.findUnique({ where: { id: unitId } }) : null;
  if (!unit) gagal('Pilih UPT/Prodi tujuan.');
  await db.$transaction(async tx => {
    await tx.order.update({ where: { id }, data: { unitId: unit.id } });
    await tx.silabus.update({ where: { orderId: id }, data: { diteruskanPada: new Date() } });
    await catat(tx, id, o.status, dps.id, `Diteruskan ke ${unit.nama}`);
    const upt = await tx.user.findMany({ where: { peran: Peran.upt, unitId: unit.id, aktif: true }, select: { id: true } });
    await notifyBanyak(tx, upt.map(u => u.id), `Request Silabus & RAK: ${o.nomorRfq} "${o.judul}"`, `/order/${id}`);
  });
}

export type ItemRak = { uraian: string; volume: string; satuan: string; hargaSatuan: string };

/** UPT mengirim Silabus/RPS, RAK per item, dan usulan pengajar; order lanjut ke tahap Quotation. */
export async function kirimSilabusRak(
  upt: Pengguna, id: number,
  d: { ringkasan: string; berkas: string | null; items: ItemRak[]; pengajarIds: number[] },
) {
  wajibPeran(upt, Peran.upt);
  const o = await orderDiTahap(id, StatusOrder.SILABUS_RAK);
  const s = await db.silabus.findUnique({ where: { orderId: id } });
  if (o.unitId !== upt.unitId || !s?.diteruskanPada) gagal('Request ini tidak ditujukan ke unit Anda.');
  const ringkasan = wajib(d.ringkasan, 'Ringkasan silabus / RPS');
  if (!d.berkas && !s.berkas) gagal('Unggah dokumen Silabus / RPS.');
  const items = d.items
    .filter(i => teks(i.uraian) || teks(i.hargaSatuan))
    .map((i, n) => {
      const volume = Number(i.volume);
      const harga = Number(String(i.hargaSatuan).replace(/[^\d]/g, ''));
      if (!teks(i.uraian)) gagal(`Uraian RAK baris ${n + 1} wajib diisi.`);
      if (!Number.isInteger(volume) || volume < 1) gagal(`Volume RAK baris ${n + 1} minimal 1.`);
      if (!(harga > 0)) gagal(`Harga satuan RAK baris ${n + 1} wajib diisi.`);
      return { orderId: id, uraian: teks(i.uraian).slice(0, 150), volume, satuan: wajib(i.satuan, `Satuan RAK baris ${n + 1}`).slice(0, 30), hargaSatuan: String(harga) };
    });
  if (!items.length) gagal('Isi minimal 1 item RAK.');
  const ids = [...new Set(d.pengajarIds.filter(Boolean))];
  if (ids.length) {
    const ok = await db.user.count({ where: { id: { in: ids }, peran: Peran.pengajar, aktif: true } });
    if (ok !== ids.length) gagal('Usulan pengajar tidak valid.');
  }

  await db.$transaction(async tx => {
    await tx.silabus.update({ where: { orderId: id }, data: { ringkasan, berkas: d.berkas ?? s.berkas, dikirimPada: new Date() } });
    await tx.rakItem.deleteMany({ where: { orderId: id } });
    await tx.rakItem.createMany({ data: items });
    for (const pengajarId of ids) {
      await tx.penugasanPengajar.upsert({
        where: { orderId_pengajarId: { orderId: id, pengajarId } },
        create: { orderId: id, pengajarId, peran: 'Instruktur', status: StatusPengajar.USULAN },
        update: {},
      });
    }
    await pindahTahap(tx, o, StatusOrder.QUOTATION, upt.id, 'Silabus & RAK dikirim UPT');
    await notifyMarketing(tx, o, 'Silabus & RAK siap. Susun quotation.');
  });
}

export function totalRak(items: { volume: number; hargaSatuan: unknown }[]): number {
  return items.reduce((a, i) => a + i.volume * Number(i.hargaSatuan), 0);
}
