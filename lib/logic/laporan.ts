import { StatusPica, StatusTugas } from '@prisma/client';
import { db } from '../db';
import { gagal, teks, wajib } from '../errors';
import type { Pengguna } from '../session';
import { hariIni, hariKerja, mingguIso, tanggalDb, ymd, HARI } from '../waktu';
import { STATUS_KERJA, notify } from './aturan';
import { penugasanMilikSpv, penugasanMilikStaff } from './penugasan';

async function penugasanKerja(staff: Pengguna, id: number) {
  const p = await penugasanMilikStaff(staff, id);
  if (!STATUS_KERJA.includes(p.status)) gagal('Penugasan ini tidak sedang dikerjakan.');
  return p;
}

function tanggalValid(s: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) gagal(`${label} wajib diisi.`);
  return tanggalDb(s);
}

export function persenAp(ap: { selesai: boolean }[]): number {
  return ap.length ? Math.round((ap.filter(a => a.selesai).length / ap.length) * 100) : 0;
}

// ---------- Action Plan ----------

export async function tambahAp(staff: Pengguna, id: number, kegiatan: string, target: string) {
  const p = await penugasanKerja(staff, id);
  const k = wajib(kegiatan, 'Kegiatan');
  if (k.length > 255) gagal('Kegiatan maksimal 255 karakter.');
  const t = tanggalValid(target, 'Target tanggal');
  if (ymd(t) > ymd(p.perintah.tenggat)) gagal('Target tanggal tidak boleh melewati tenggat perintah.');
  const akhir = await db.actionPlan.aggregate({ where: { penugasanId: id }, _max: { urutan: true } });
  await db.actionPlan.create({ data: { penugasanId: id, urutan: (akhir._max.urutan ?? 0) + 1, kegiatan: k, targetTanggal: t } });
}

export async function ubahTargetAp(staff: Pengguna, apId: number, target: string) {
  const ap = await db.actionPlan.findUnique({ where: { id: apId } });
  if (!ap) gagal('Action Plan tidak ditemukan.');
  const p = await penugasanKerja(staff, ap.penugasanId);
  const t = tanggalValid(target, 'Target tanggal');
  if (ymd(t) > ymd(p.perintah.tenggat)) gagal('Target tanggal tidak boleh melewati tenggat perintah.');
  await db.actionPlan.update({ where: { id: apId }, data: { targetTanggal: t } });
}

export async function selesaikanAp(staff: Pengguna, apId: number) {
  const ap = await db.actionPlan.findUnique({ where: { id: apId } });
  if (!ap) gagal('Action Plan tidak ditemukan.');
  const p = await penugasanKerja(staff, ap.penugasanId);
  if (ap.selesai) gagal('AP ini sudah selesai.');
  await db.$transaction([
    db.actionPlan.update({ where: { id: apId }, data: { selesai: true, selesaiPada: new Date() } }),
    ...(p.status === StatusTugas.DITERIMA ? [db.penugasan.update({ where: { id: p.id }, data: { status: StatusTugas.DIKERJAKAN } })] : []),
  ]);
}

export async function hapusAp(staff: Pengguna, apId: number) {
  const ap = await db.actionPlan.findUnique({ where: { id: apId }, include: { _count: { select: { laporan: true } } } });
  if (!ap) gagal('Action Plan tidak ditemukan.');
  await penugasanKerja(staff, ap.penugasanId);
  if (ap.selesai || ap._count.laporan) gagal('AP yang sudah dilaporkan tidak bisa dihapus.');
  if ((await db.actionPlan.count({ where: { penugasanId: ap.penugasanId } })) <= 1) gagal('Minimal harus ada 1 AP.');
  await db.actionPlan.delete({ where: { id: apId } });
}

// ---------- Laporan harian ----------

export async function kirimLaporanHarian(
  staff: Pengguna, id: number,
  d: { actionPlanId: string; kegiatan: string; apSelesai: boolean; lampiran: string | null },
) {
  const p = await penugasanKerja(staff, id);
  const tanggal = hariIni();
  if (await db.laporanHarian.findUnique({ where: { penugasanId_tanggal: { penugasanId: id, tanggal } } })) {
    gagal('Laporan harian untuk hari ini sudah dikirim.');
  }
  const kegiatan = wajib(d.kegiatan, 'Kegiatan hari ini');
  const apId = Number(d.actionPlanId) || null;
  const ap = apId ? await db.actionPlan.findUnique({ where: { id: apId } }) : null;
  if (apId && (!ap || ap.penugasanId !== id)) gagal('Pilih AP dari penugasan ini.');
  if (d.apSelesai && !ap) gagal('Pilih AP yang diselesaikan.');

  await db.$transaction(async tx => {
    if (d.apSelesai && ap && !ap.selesai) {
      await tx.actionPlan.update({ where: { id: ap.id }, data: { selesai: true, selesaiPada: new Date() } });
    }
    const semua = await tx.actionPlan.findMany({ where: { penugasanId: id }, select: { selesai: true } });
    await tx.laporanHarian.create({
      data: { penugasanId: id, tanggal, actionPlanId: ap?.id ?? null, kegiatan, progres: persenAp(semua), lampiran: d.lampiran },
    });
    if (p.status === StatusTugas.DITERIMA) await tx.penugasan.update({ where: { id }, data: { status: StatusTugas.DIKERJAKAN } });
  });
}

/** Hari kerja tanpa laporan harian sejak tugas diterima sampai kemarin (atau sampai laporan akhir). */
export function hariBolong(
  p: { diterimaPada: Date | null; dilaporkanPada: Date | null },
  laporan: { tanggal: Date }[],
  sejak?: Date,
): string[] {
  if (!p.diterimaPada) return [];
  const kemarin = ymd(new Date(Date.now() - HARI));
  const akhir = p.dilaporkanPada && ymd(p.dilaporkanPada) < kemarin ? ymd(p.dilaporkanPada) : kemarin;
  let mulai = ymd(p.diterimaPada);
  if (sejak && ymd(sejak) > mulai) mulai = ymd(sejak);
  if (mulai > akhir) return [];
  const ada = new Set(laporan.map(l => l.tanggal.toISOString().slice(0, 10)));
  return hariKerja(mulai, akhir).filter(h => !ada.has(h));
}

// ---------- Laporan mingguan & PICA ----------

export type DataPica = { problem: string; identifikasi: string; correctiveAction: string; pic: string; dueDate: string };

function picaValid(d: DataPica) {
  return {
    problem: wajib(d.problem, 'Problem'),
    identifikasi: wajib(d.identifikasi, 'Identification (penyebab)'),
    correctiveAction: wajib(d.correctiveAction, 'Corrective action'),
    pic: wajib(d.pic, 'PIC'),
    dueDate: tanggalValid(d.dueDate, 'Due date PICA'),
  };
}

export async function kirimLaporanMingguan(
  staff: Pengguna, id: number,
  d: { ringkasan: string; adaKendala: string; pica: DataPica },
) {
  const p = await penugasanKerja(staff, id);
  const minggu = mingguIso();
  if (await db.laporanMingguan.findUnique({ where: { penugasanId_minggu: { penugasanId: id, minggu } } })) {
    gagal(`Laporan mingguan ${minggu} sudah dikirim.`);
  }
  const ringkasan = wajib(d.ringkasan, 'Ringkasan minggu ini');
  if (d.adaKendala !== 'ya' && d.adaKendala !== 'tidak') gagal('Pilih apakah ada kendala kinerja.');
  const adaKendala = d.adaKendala === 'ya';
  // Ada kendala → PICA wajib diisi lengkap.
  const pica = adaKendala ? picaValid(d.pica) : null;

  await db.$transaction(async tx => {
    const lm = await tx.laporanMingguan.create({ data: { penugasanId: id, minggu, ringkasan, adaKendala } });
    if (pica) await tx.pica.create({ data: { ...pica, laporanMingguanId: lm.id } });
    await notify(
      tx, p.perintah.spvId,
      adaKendala ? `${staff.nama} melaporkan kendala (PICA) di "${p.perintah.judul}"` : `${staff.nama} mengirim laporan mingguan ${minggu}`,
      `/spv/penugasan/${id}`,
    );
  });
}

export async function tambahPica(staff: Pengguna, laporanMingguanId: number, d: DataPica) {
  const lm = await db.laporanMingguan.findUnique({ where: { id: laporanMingguanId } });
  if (!lm) gagal('Laporan mingguan tidak ditemukan.');
  await penugasanKerja(staff, lm.penugasanId);
  await db.$transaction([
    db.pica.create({ data: { ...picaValid(d), laporanMingguanId } }),
    db.laporanMingguan.update({ where: { id: laporanMingguanId }, data: { adaKendala: true } }),
  ]);
}

/** PICA ditutup oleh staff pemiliknya atau SPV pemberi perintah. */
export async function tutupPica(u: Pengguna, picaId: number) {
  const pica = await db.pica.findUnique({ where: { id: picaId }, include: { laporanMingguan: { include: { penugasan: { include: { perintah: true } } } } } });
  if (!pica) gagal('PICA tidak ditemukan.');
  const p = pica.laporanMingguan.penugasan;
  if (p.staffId !== u.id && p.perintah.spvId !== u.id) gagal('PICA tidak ditemukan.');
  if (pica.status === StatusPica.CLOSED) gagal('PICA ini sudah ditutup.');
  await db.pica.update({ where: { id: picaId }, data: { status: StatusPica.CLOSED, ditutupPada: new Date() } });
}

export async function tanggapiMingguan(spv: Pengguna, laporanMingguanId: number, tanggapan: string) {
  const lm = await db.laporanMingguan.findUnique({ where: { id: laporanMingguanId } });
  if (!lm) gagal('Laporan mingguan tidak ditemukan.');
  const p = await penugasanMilikSpv(spv, lm.penugasanId);
  const t = wajib(tanggapan, 'Tanggapan');
  await db.$transaction(async tx => {
    await tx.laporanMingguan.update({ where: { id: lm.id }, data: { tanggapanSpv: t } });
    await notify(tx, p.staffId, `${spv.nama} menanggapi laporan mingguan ${lm.minggu}`, `/staff/tugas/${p.id}`);
  });
}

// ---------- Laporan akhir ----------

export async function kirimLaporanAkhir(staff: Pengguna, id: number, d: { hasil: string; kendala: string; lampiran: string | null }) {
  const p = await penugasanKerja(staff, id);
  const ap = await db.actionPlan.findMany({ where: { penugasanId: id } });
  if (ap.some(a => !a.selesai)) gagal('Selesaikan semua Action Plan sebelum mengirim laporan akhir.');
  const hasil = wajib(d.hasil, 'Ringkasan hasil');
  const saat = new Date();
  await db.$transaction(async tx => {
    await tx.laporanAkhir.create({ data: { penugasanId: id, hasil, kendala: teks(d.kendala) || null, lampiran: d.lampiran, dikirimPada: saat } });
    await tx.penugasan.update({
      where: { id },
      data: { status: StatusTugas.DILAPORKAN, dilaporkanPada: saat, ...(saat > p.perintah.tenggat ? { terlambat: true } : {}) },
    });
    await notify(tx, p.perintah.spvId, `${staff.nama} mengirim laporan akhir "${p.perintah.judul}"`, `/spv/penugasan/${id}`);
  });
}
